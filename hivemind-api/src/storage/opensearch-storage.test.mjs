import { describe, expect, it } from "vitest";
import { OpenSearchStorage } from "./opensearch-storage.mjs";

describe("OpenSearchStorage", () => {
  it("returns the existing resource when idempotency create loses a race", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    const existingSession = {
      session_id: "sess-existing",
      project_id: "alpha",
      branch: "main",
      workspace_path: "/repo/alpha",
      author_id: "agent-alpha",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex",
      started_at: "2026-04-27T09:00:00.000Z",
      ended_at: null,
      status: "active",
      goal: "Existing session",
      plan_ref: null,
      ruleset_version: 0,
      visibility: "project",
      created_at: "2026-04-27T09:00:00.000Z",
      updated_at: "2026-04-27T09:00:00.000Z"
    };
    client.putSource("test-projects", "alpha", {
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      features: [],
      categories: [],
      ruleset_id: "alpha:0",
      created_at: "2026-04-27T09:00:00.000Z",
      updated_at: "2026-04-27T09:00:00.000Z"
    });
    client.putSource("test-rulesets", "alpha", {
      project_id: "alpha",
      ruleset_id: "alpha:0",
      version: 0,
      rules: [],
      created_at: "2026-04-27T09:00:00.000Z",
      updated_at: "2026-04-27T09:00:00.000Z"
    });
    client.putSource("test-sessions", existingSession.session_id, existingSession);
    client.conflictOnNextIdempotencyCreate((body) => ({
      ...body,
      resource_id: existingSession.session_id,
      timestamp: "2026-04-27T09:00:00.000Z"
    }));

    const result = await storage.createSession(
      {
        project_id: "alpha",
        branch: "main",
        workspace_path: "/repo/alpha",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Existing session"
      },
      { idempotencyKey: "same-key" }
    );

    expect(result.idempotent).toBe(true);
    expect(result.session.session_id).toBe(existingSession.session_id);
    expect(client.indexWrites("test-sessions")).toBe(0);
  });

  it("scrolls through all documents instead of stopping at the first search page", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    for (let index = 0; index < 1001; index += 1) {
      client.putSource("test-projects", `project-${index}`, {
        project_id: `project-${index.toString().padStart(4, "0")}`,
        name: `Project ${index}`,
        root_path: `/repo/project-${index}`,
        default_branch: "main",
        features: [],
        categories: [],
        ruleset_id: `project-${index}:0`,
        created_at: "2026-04-27T09:00:00.000Z",
        updated_at: "2026-04-27T09:00:00.000Z"
      });
    }

    const result = await storage.listProjects();

    expect(result.projects).toHaveLength(1001);
    expect(client.scrollCalls).toBeGreaterThan(0);
  });

  it("preserves project standard profile metadata", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });

    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project",
      standard_profile_ref: "base@v1"
    });
    const updated = await storage.updateProjectStandardProfile("alpha", "aws-microservice@v2");

    expect(updated.standard_profile_ref).toBe("aws-microservice@v2");
    expect((await storage.getProject("alpha")).standard_profile_ref).toBe("aws-microservice@v2");
  });
});

class FakeOpenSearchClient {
  constructor() {
    this.indices = {
      exists: async ({ index }) => this.#index(index).size > 0,
      create: async ({ index }) => {
        this.#index(index);
      }
    };
    this.scrollCalls = 0;
    this.#documents = new Map();
    this.#writeCounts = new Map();
    this.#scrolls = new Map();
    this.#nextScrollId = 1;
    this.#idempotencyConflictFactory = null;
  }

  #documents;
  #writeCounts;
  #scrolls;
  #nextScrollId;
  #idempotencyConflictFactory;

  putSource(index, id, source) {
    this.#index(index).set(id, source);
  }

  indexWrites(index) {
    return this.#writeCounts.get(index) ?? 0;
  }

  conflictOnNextIdempotencyCreate(factory) {
    this.#idempotencyConflictFactory = factory;
  }

  async get({ index, id }) {
    const source = this.#index(index).get(id);
    if (!source) {
      throw notFound();
    }
    return { body: { _source: source } };
  }

  async index({ index, id, body, op_type }) {
    if (op_type === "create" && index.endsWith("-idempotency") && this.#idempotencyConflictFactory) {
      this.#index(index).set(id, this.#idempotencyConflictFactory(body));
      this.#idempotencyConflictFactory = null;
      throw conflict();
    }
    if (op_type === "create" && this.#index(index).has(id)) {
      throw conflict();
    }
    this.#index(index).set(id, body);
    this.#writeCounts.set(index, (this.#writeCounts.get(index) ?? 0) + 1);
    return { body: { result: "created" } };
  }

  async search({ index, size, body }) {
    const hits = this.#matchingHits(index, body?.query);
    const batch = hits.slice(0, size);
    const remaining = hits.slice(size);
    const scrollId = `scroll-${this.#nextScrollId}`;
    this.#nextScrollId += 1;
    this.#scrolls.set(scrollId, { remaining, size });
    return {
      body: {
        _scroll_id: scrollId,
        hits: { hits: batch }
      }
    };
  }

  async scroll({ scroll_id }) {
    this.scrollCalls += 1;
    const state = this.#scrolls.get(scroll_id) ?? { remaining: [], size: 1000 };
    const batch = state.remaining.slice(0, state.size);
    state.remaining = state.remaining.slice(state.size);
    this.#scrolls.set(scroll_id, state);
    return {
      body: {
        _scroll_id: scroll_id,
        hits: { hits: batch }
      }
    };
  }

  async clearScroll({ scroll_id }) {
    this.#scrolls.delete(scroll_id);
  }

  #index(index) {
    if (!this.#documents.has(index)) {
      this.#documents.set(index, new Map());
    }
    return this.#documents.get(index);
  }

  #matchingHits(index, query) {
    const docs = [...this.#index(index).entries()].map(([id, source]) => ({ _id: id, _source: source }));
    if (!query || query.match_all) {
      return docs;
    }
    if (query.term) {
      const [[field, value]] = Object.entries(query.term);
      return docs.filter((doc) => doc._source[field] === value);
    }
    return [];
  }
}

function notFound() {
  const error = new Error("not found");
  error.meta = { statusCode: 404 };
  return error;
}

function conflict() {
  const error = new Error("conflict");
  error.meta = { statusCode: 409 };
  return error;
}
