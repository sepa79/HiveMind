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
      repository_url: "https://github.com/example/alpha.git",
      repository_slug: "example/alpha",
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
      repository_url: "https://github.com/example/alpha.git",
      repository_slug: "example/alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project",
      standard_profile_ref: "base@v1"
    });
    const updated = await storage.updateProjectStandardProfile("alpha", "aws-microservice@v2");

    expect(updated.standard_profile_ref).toBe("aws-microservice@v2");
    expect((await storage.getProject("alpha")).standard_profile_ref).toBe("aws-microservice@v2");
  });

  it("stores a canonical project standard marker", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });

    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      repository_url: "https://github.com/example/alpha.git",
      repository_slug: "example/alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project",
      standard_profile_ref: "base@v1"
    });
    const marker = {
      project_id: "alpha",
      profile_ref: "base@v1",
      catalog_source_url: "https://git.example/ai-rulesets",
      applied_at: "2026-08-20T00:00:00.000Z",
      files: [{ target: "AGENTS.md", sha256: "abc123" }]
    };

    await storage.updateProjectStandardMarker("alpha", marker);

    expect((await storage.getProject("alpha")).standard_marker).toEqual(marker);
  });

  it("clears the stored marker when the assigned profile changes directly or through merge", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });

    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      repository_url: "https://github.com/example/alpha.git",
      repository_slug: "example/alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project",
      standard_profile_ref: "base@v1"
    });
    await storage.updateProjectStandardMarker("alpha", {
      project_id: "alpha",
      profile_ref: "base@v1",
      applied_at: "2026-08-20T00:00:00.000Z",
      files: [{ target: "AGENTS.md", sha256: "alpha-base" }]
    });

    const reassigned = await storage.updateProjectStandardProfile("alpha", "aws-microservice@v2");
    expect(reassigned.standard_marker).toBeNull();

    await storage.updateProjectStandardMarker("alpha", {
      project_id: "alpha",
      profile_ref: "aws-microservice@v2",
      applied_at: "2026-08-20T00:00:00.000Z",
      files: [{ target: "AGENTS.md", sha256: "alpha-aws" }]
    });
    await storage.createProject({
      project_id: "legacy",
      name: "Legacy",
      repository_url: "https://github.com/example/legacy.git",
      repository_slug: "example/legacy",
      root_path: "/repo/legacy",
      default_branch: "main",
      description: "Legacy project",
      standard_profile_ref: "base@v1"
    });

    const merged = await storage.mergeProjects("legacy", "alpha", {
      standardProfileResolution: {
        source_profile_ref: "base@v1",
        target_profile_ref: "aws-microservice@v2",
        strategy: "prefer_source",
        result_profile_ref: "base@v1"
      }
    });

    expect(merged.target_project.standard_profile_ref).toBe("base@v1");
    expect(merged.target_project.standard_marker).toBeNull();
  });

  it("atomically rejects concurrent repository identities for one project id", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    const base = {
      project_id: "shared",
      name: "Shared",
      root_path: "/repo/shared",
      default_branch: "main"
    };

    const results = await Promise.allSettled([
      storage.createProject({
        ...base,
        repository_url: "https://github.com/one/shared.git",
        repository_slug: "one/shared"
      }),
      storage.createProject({
        ...base,
        repository_url: "https://github.com/two/shared.git",
        repository_slug: "two/shared"
      })
    ]);

    expect(results.map((result) => result.status).sort()).toEqual(["fulfilled", "rejected"]);
    expect(results.find((result) => result.status === "rejected").reason).toMatchObject({
      status: 409,
      code: "PROJECT_ID_REPOSITORY_CONFLICT"
    });
  });

  it("deletes project-scoped OpenSearch documents", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      repository_url: "https://github.com/example/alpha.git",
      repository_slug: "example/alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    const { session } = await storage.createSession(
      {
        project_id: "alpha",
        branch: "main",
        workspace_path: "/repo/alpha",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Delete project"
      },
      { idempotencyKey: "delete-session" }
    );
    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: session.session_id,
        branch: "main",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "Delete me"
      },
      { idempotencyKey: "delete-entry" }
    );

    const result = await storage.deleteProject("alpha", { reason: "cleanup" });

    expect(result.reason).toBe("cleanup");
    expect(result.deleted_counts.sessions).toBe(1);
    expect(result.deleted_counts.entries).toBe(1);
    await expect(storage.getProject("alpha")).resolves.toBeNull();
  });

  it("resumes an interrupted project delete while keeping the project marker until last", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      repository_url: "https://github.com/example/alpha.git",
      repository_slug: "example/alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    await storage.createSession(
      {
        project_id: "alpha",
        branch: "main",
        workspace_path: "/repo/alpha",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Retry delete"
      },
      { idempotencyKey: "retry-delete-session" }
    );

    client.failNextDelete("test-sessions");
    await expect(storage.deleteProject("alpha")).rejects.toThrow("Injected delete failure");
    await expect(storage.getProject("alpha")).resolves.toMatchObject({ project_id: "alpha" });

    await expect(storage.deleteProject("alpha")).resolves.toMatchObject({ deleted_project_id: "alpha" });
    await expect(storage.getProject("alpha")).resolves.toBeNull();
  });

  it("merges project-scoped OpenSearch documents into the target project", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      repository_url: "https://github.com/example/alpha.git",
      repository_slug: "example/alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    await storage.createProject({
      project_id: "legacy",
      name: "Legacy",
      repository_url: "https://github.com/example/legacy.git",
      repository_slug: "example/legacy",
      root_path: "/repo/legacy",
      default_branch: "main",
      description: "Legacy project",
      standard_profile_ref: "aws-microservice@v2"
    });
    const { session } = await storage.createSession(
      {
        project_id: "legacy",
        branch: "main",
        workspace_path: "/repo/legacy",
        author_id: "agent-legacy",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Merge project"
      },
      { idempotencyKey: "merge-session" }
    );
    await storage.appendEntry(
      {
        project_id: "legacy",
        session_id: session.session_id,
        branch: "main",
        author_id: "agent-legacy",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "Legacy decision"
      },
      { idempotencyKey: "merge-entry" }
    );
    await storage.upsertRuleset("legacy", {
      rules: [
        {
          rule_id: "legacy_rule",
          label: "Legacy rule",
          description: "Preserve this rule during project merge.",
          severity: "advisory",
          check_mode: "manual_confirm"
        }
      ]
    });

    const result = await storage.mergeProjects("legacy", "alpha", {
      reason: "canonicalize",
      standardProfileResolution: automaticProfileResolution({
        source: "aws-microservice@v2",
        result: "aws-microservice@v2"
      })
    });
    const search = await storage.searchEntries({ project_id: "alpha", query: "Legacy decision" });
    const ruleset = await storage.getRuleset("alpha");

    expect(result.reason).toBe("canonicalize");
    expect(result.moved_counts.sessions).toBe(1);
    expect(result.moved_counts.entries).toBe(1);
    expect(search.entries).toHaveLength(1);
    expect(search.entries[0].project_id).toBe("alpha");
    expect(ruleset.rules.map((rule) => rule.rule_id)).toEqual(["legacy_rule"]);
    expect(result.target_project.ruleset_id).toBe(ruleset.ruleset_id);
    expect(result.target_project.standard_profile_ref).toBe("aws-microservice@v2");
    await expect(storage.getProject("legacy")).resolves.toBeNull();
  });

  it("preserves merge counts across publication and cleanup retries", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      repository_url: "https://github.com/example/alpha.git",
      repository_slug: "example/alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    await storage.createProject({
      project_id: "legacy",
      name: "Legacy",
      repository_url: "https://github.com/example/legacy.git",
      repository_slug: "example/legacy",
      root_path: "/repo/legacy",
      default_branch: "main",
      description: "Legacy project",
      standard_profile_ref: "aws-microservice@v2"
    });
    await storage.addFeature("legacy", "Imported");
    await storage.upsertRuleset("legacy", {
      rules: [
        {
          rule_id: "retry_rule",
          label: "Retry rule",
          description: "Preserve rules across an interrupted merge.",
          severity: "required",
          check_mode: "manual_confirm"
        }
      ]
    });
    const { session } = await storage.createSession(
      {
        project_id: "legacy",
        branch: "main",
        workspace_path: "/repo/legacy",
        author_id: "agent-legacy",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Retry merge"
      },
      { idempotencyKey: "retry-merge-session" }
    );
    await storage.appendEntry(
      {
        project_id: "legacy",
        session_id: session.session_id,
        branch: "main",
        author_id: "agent-legacy",
        author_type: "agent",
        source: "mcp",
        entry_type: "progress",
        summary: "Preserve across retry"
      },
      { idempotencyKey: "retry-merge-entry" }
    );
    const resolution = automaticProfileResolution({
      source: "aws-microservice@v2",
      result: "aws-microservice@v2"
    });

    client.failNextIndexWrite("test-projects", "alpha", 1);
    await expect(storage.mergeProjects("legacy", "alpha", { standardProfileResolution: resolution })).rejects.toThrow(
      "Injected index failure"
    );
    await expect(storage.getProject("alpha")).resolves.toMatchObject({
      features: [],
      standard_profile_ref: null
    });
    await expect(storage.getProject("legacy")).resolves.toMatchObject({ project_id: "legacy" });
    await storage.createProject({
      project_id: "beta",
      name: "Beta",
      repository_url: "https://github.com/example/beta.git",
      repository_slug: "example/beta",
      root_path: "/repo/beta",
      default_branch: "main",
      description: "Beta project"
    });
    await expect(
      storage.mergeProjects("legacy", "beta", { standardProfileResolution: resolution })
    ).rejects.toMatchObject({
      status: 409,
      code: "PROJECT_MERGE_IN_PROGRESS"
    });
    await expect(storage.deleteProject("legacy")).rejects.toMatchObject({
      status: 409,
      code: "PROJECT_MERGE_IN_PROGRESS"
    });
    await expect(storage.deleteProject("alpha")).rejects.toMatchObject({
      status: 409,
      code: "PROJECT_MERGE_IN_PROGRESS"
    });
    await expect(
      storage.mergeProjects("alpha", "beta", { standardProfileResolution: automaticProfileResolution() })
    ).rejects.toMatchObject({
      status: 409,
      code: "PROJECT_MERGE_IN_PROGRESS"
    });

    await storage.createSession(
      {
        project_id: "legacy",
        branch: "main",
        workspace_path: "/repo/legacy",
        author_id: "agent-legacy",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Created after interrupted merge"
      },
      { idempotencyKey: "retry-merge-late-session" }
    );

    client.failNextDelete("test-projects", "legacy");
    await expect(storage.mergeProjects("legacy", "alpha", { standardProfileResolution: resolution })).rejects.toThrow(
      "Injected delete failure"
    );
    await expect(storage.getProject("legacy")).resolves.toMatchObject({ project_id: "legacy" });
    await expect(storage.getRuleset("legacy")).resolves.toBeNull();
    await storage.upsertRuleset("alpha", {
      rules: [
        {
          rule_id: "retry_rule",
          label: "Retry rule",
          description: "Preserve rules across an interrupted merge.",
          severity: "required",
          check_mode: "manual_confirm"
        },
        {
          rule_id: "target_rule",
          label: "Target rule",
          description: "Added after interrupted merge cleanup.",
          severity: "advisory",
          check_mode: "manual_confirm"
        }
      ]
    });

    const result = await storage.mergeProjects("legacy", "alpha", { standardProfileResolution: resolution });
    const entries = await storage.searchEntries({ project_id: "alpha", query: "Preserve across retry" });

    expect(result.target_project).toMatchObject({
      features: ["Imported"],
      standard_profile_ref: "aws-microservice@v2"
    });
    expect(result.moved_counts.rules).toBe(1);
    expect(result.moved_counts.sessions).toBe(2);
    expect(result.moved_counts.entries).toBe(1);
    expect(result.moved_counts.idempotency_records).toBe(3);
    expect((await storage.getRuleset("alpha")).rules.map((rule) => rule.rule_id)).toEqual(["retry_rule", "target_rule"]);
    expect(entries.entries).toHaveLength(1);
    await expect(storage.getProject("legacy")).resolves.toBeNull();
    await expect(storage.deleteProject("alpha")).resolves.toMatchObject({ deleted_project_id: "alpha" });
  });

  it("keeps both OpenSearch projects when merge rules conflict", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    for (const projectId of ["alpha", "legacy"]) {
      await storage.createProject({
        project_id: projectId,
        name: projectId,
        repository_url: `https://github.com/example/${projectId}.git`,
        repository_slug: `example/${projectId}`,
        root_path: `/repo/${projectId}`,
        default_branch: "main",
        description: `${projectId} project`
      });
      await storage.upsertRuleset(projectId, {
        rules: [
          {
            rule_id: "shared_rule",
            label: "Shared rule",
            description: `${projectId} definition`,
            severity: "required",
            check_mode: "manual_confirm"
          }
        ]
      });
    }

    await expect(
      storage.mergeProjects("legacy", "alpha", { standardProfileResolution: automaticProfileResolution() })
    ).rejects.toMatchObject({
      status: 409,
      code: "PROJECT_MERGE_CONFLICT"
    });
    await expect(storage.getProject("legacy")).resolves.toMatchObject({ project_id: "legacy" });
    await expect(storage.getProject("alpha")).resolves.toMatchObject({ project_id: "alpha" });
  });

  it("reads and marks entry lifecycle state", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      repository_url: "https://github.com/example/alpha.git",
      repository_slug: "example/alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    const { session } = await storage.createSession(
      {
        project_id: "alpha",
        branch: "feat/a",
        workspace_path: "/repo/alpha",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Mark entry"
      },
      { idempotencyKey: "mark-session" }
    );
    const { entry } = await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: session.session_id,
        branch: "feat/a",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "feedback",
        summary: "Needs triage",
        lifecycle_state: "open"
      },
      { idempotencyKey: "mark-entry" }
    );

    const result = await storage.markEntryLifecycle({
      project_id: "alpha",
      entry_id: entry.entry_id,
      lifecycle_state: "resolved",
      reason: "Triage completed."
    });
    const stored = await storage.getEntry("alpha", entry.entry_id);

    expect(result.action.previous_lifecycle_state).toBe("open");
    expect(result.entry.summary).toBe("Needs triage");
    expect(stored.lifecycle_state).toBe("resolved");
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
    this.#failingIndexWrite = null;
    this.#failingDelete = null;
  }

  #documents;
  #writeCounts;
  #scrolls;
  #nextScrollId;
  #idempotencyConflictFactory;
  #failingIndexWrite;
  #failingDelete;

  putSource(index, id, source) {
    this.#index(index).set(id, source);
  }

  indexWrites(index) {
    return this.#writeCounts.get(index) ?? 0;
  }

  conflictOnNextIdempotencyCreate(factory) {
    this.#idempotencyConflictFactory = factory;
  }

  failNextIndexWrite(index, id = null, matchingWritesToSkip = 0) {
    this.#failingIndexWrite = { index, id, matchingWritesToSkip };
  }

  failNextDelete(index, id = null) {
    this.#failingDelete = { index, id };
  }

  async get({ index, id }) {
    const source = this.#index(index).get(id);
    if (!source) {
      throw notFound();
    }
    return { body: { _source: source } };
  }

  async index({ index, id, body, op_type }) {
    if (this.#failingIndexWrite?.index === index && (!this.#failingIndexWrite.id || this.#failingIndexWrite.id === id)) {
      if (this.#failingIndexWrite.matchingWritesToSkip > 0) {
        this.#failingIndexWrite.matchingWritesToSkip -= 1;
      } else {
        this.#failingIndexWrite = null;
        throw new Error(`Injected index failure for ${index}`);
      }
    }
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

  async delete({ index, id }) {
    if (this.#failingDelete?.index === index && (!this.#failingDelete.id || this.#failingDelete.id === id)) {
      this.#failingDelete = null;
      throw new Error(`Injected delete failure for ${index}`);
    }
    if (!this.#index(index).has(id)) {
      throw notFound();
    }
    this.#index(index).delete(id);
    return { body: { result: "deleted" } };
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

function automaticProfileResolution({ source = null, target = null, result = source ?? target } = {}) {
  return {
    source_profile_ref: source,
    target_profile_ref: target,
    strategy: "automatic",
    result_profile_ref: result
  };
}
