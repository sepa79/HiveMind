import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HiveMindService } from "../app/service.mjs";
import { FsJsonlStorage } from "../storage/fs-jsonl-storage.mjs";
import { createApp } from "./app.mjs";

const roots = [];
const admin = { authorization: "Bearer test-admin" };
const nextTurn = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const json = (payload, key = "test", method = "POST") => ({
  method, headers: { "content-type": "application/json", "Idempotency-Key": key, ...admin },
  body: JSON.stringify(payload)
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

async function fixture() {
  const dataRoot = mkdtempSync(join(tmpdir(), "hivemind-concurrency-"));
  roots.push(dataRoot);
  const storage = new FsJsonlStorage({ dataRoot });
  const service = new HiveMindService({ storage, version: "test" });
  const app = createApp({ service, adminToken: "test-admin" });
  const contexts = {};
  const sessions = {};
  for (const id of ["alpha", "beta"]) {
    await storage.createProject({ project_id: id, name: id, repository_slug: `example/${id}`,
      repository_url: `https://github.com/example/${id}.git`, root_path: `/repo/${id}`,
      default_branch: "main", description: "Test project" });
    const input = { project_id: id, branch: "main", workspace_path: `/repo/${id}`,
      author_id: "test", author_type: "agent", source: "mcp", agent_id: "test" };
    contexts[id] = (await storage.openContext(input, { idempotencyKey: `context-${id}` })).context.context_token;
    sessions[id] = (await storage.createSession({ ...input, goal: "Test concurrency" },
      { idempotencyKey: `session-${id}` })).session.session_id;
  }
  return { app, storage, service, dataRoot, contexts, sessions };
}

const createCases = [
  { route: "/v1/learnings", method: "captureLearning", field: "learning", id: "learning_id",
    payload: { summary: "Test", scope: "workflow", recommended_action: "Test" } },
  { route: "/v1/issues", method: "createIssue", field: "issue", id: "issue_id",
    payload: { title: "Test", summary: "Test", severity: "normal" } }
];

describe("Project-scoped concurrency", () => {
  it.each(createCases)("serializes $route with deletion and keeps create retries idempotent", async (test) => {
    const { app, storage, contexts, dataRoot } = await fixture();
    const started = deferred(), release = deferred();
    const original = storage[test.method].bind(storage);
    vi.spyOn(storage, test.method).mockImplementationOnce(async (...args) => {
      started.resolve();
      await release.promise;
      return original(...args);
    });
    const payload = { ...test.payload, context_token: ` ${contexts.alpha} ` };
    const create = app.request(test.route, json(payload));
    await started.promise;
    const retry = await app.request(test.route, json(payload));
    const deleteSpy = vi.spyOn(storage, "deleteProject");
    const deletion = app.request("/v1/admin/projects/alpha", { method: "DELETE", headers: admin });
    await nextTurn();
    const deletedBeforeRelease = deleteSpy.mock.calls.length;
    release.resolve();
    const [created, retried, deleted] = await Promise.all([create, retry, deletion]);
    expect(deletedBeforeRelease).toBe(0);
    expect([created.status, retried.status, deleted.status]).toEqual([201, 201, 200]);
    const first = (await created.json()).data[test.field][test.id];
    expect((await retried.json()).data[test.field][test.id]).toBe(first);
    expect(existsSync(join(dataRoot, "projects", "alpha"))).toBe(false);
  });

  it.each(createCases)("rejects $route when deletion wins during context lookup", async (test) => {
    const { app, storage, contexts, dataRoot } = await fixture();
    const started = deferred(), release = deferred();
    const original = storage.getContext.bind(storage);
    vi.spyOn(storage, "getContext").mockImplementationOnce(async (...args) => {
      const context = await original(...args);
      started.resolve();
      await release.promise;
      return context;
    });
    const create = app.request(test.route, json({ ...test.payload, context_token: contexts.alpha }));
    await started.promise;
    const deleted = await app.request("/v1/admin/projects/alpha", { method: "DELETE", headers: admin });
    release.resolve();
    const created = await create;
    expect(deleted.status).toBe(200);
    expect(created.status).toBe(404);
    expect((await created.json()).error.code).toBe("CONTEXT_NOT_FOUND");
    expect(existsSync(join(dataRoot, "projects", "alpha"))).toBe(false);
  });

  it.each(["context", "session"])("rejects changed %s ownership after a concurrent merge", async (kind) => {
    const { app, service, contexts, sessions, storage } = await fixture();
    const method = kind === "context" ? "resolveProjectIdForContextToken" : "resolveProjectIdForSessionId";
    const started = deferred(), release = deferred();
    const original = service[method].bind(service);
    vi.spyOn(service, method).mockImplementationOnce(async (...args) => {
      const project = await original(...args);
      started.resolve();
      await release.promise;
      return project;
    });
    const request = kind === "context"
      ? app.request(`/v1/contexts/${contexts.alpha}`, json({ feature: "changed" }, "test", "PATCH"))
      : app.request(`/v1/sessions/${sessions.alpha}/end`, json({ status: "completed" }));
    await started.promise;
    const merged = await app.request("/v1/admin/projects/merge", json({ source_project_id: "alpha", target_project_id: "beta" }));
    release.resolve();
    const response = await request;
    expect(merged.status).toBe(200);
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("PROJECT_SCOPE_CHANGED");
    expect((await storage.getSession(sessions.alpha)).status).toBe("active");
    expect((await storage.getContext(contexts.alpha)).feature).not.toBe("changed");
  });

  it("lets unrelated context/session traffic proceed while deletion waits for a project", async () => {
    const { app, storage, contexts, sessions } = await fixture();
    const started = deferred(), release = deferred();
    const original = storage.createSession.bind(storage);
    vi.spyOn(storage, "createSession").mockImplementationOnce(async (...args) => {
      started.resolve();
      await release.promise;
      return original(...args);
    });
    const write = app.request("/v1/sessions", json({ project_id: " alpha ", branch: "main",
      workspace_path: "/repo/alpha", author_id: "test", author_type: "agent", source: "mcp",
      agent_id: "test", goal: "Hold alpha" }));
    await started.promise;
    const deleteSpy = vi.spyOn(storage, "deleteProject");
    const deletion = app.request("/v1/admin/projects/alpha", { method: "DELETE", headers: admin });
    await nextTurn();
    let timeout;
    try {
      const unrelated = await Promise.race([
        Promise.all([
          app.request(`/v1/contexts/${contexts.beta}/project-brief`),
          app.request(`/v1/sessions/${sessions.beta}/closeout`)
        ]),
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Unrelated project traffic was blocked")), 1000);
        })
      ]);
      expect(unrelated.map((response) => response.status)).toEqual([200, 200]);
      expect(deleteSpy).not.toHaveBeenCalled();
    } finally {
      clearTimeout(timeout);
      release.resolve();
      await Promise.all([write, deletion]);
    }
  });

  it.each([
    ["POST", "/v1/sessions/session-a/end", "session_id"],
    ["PATCH", "/v1/contexts/context-a", "context_token"],
    ["POST", "/v1/projects/alpha/features", "project_id"],
    ["POST", "/v1/projects/alpha/features/old/rename", "feature"],
    ["POST", "/v1/projects/alpha/entries/entry-a/mark", "entry_id"],
    ["POST", "/v1/issues/issue-a/events", "issue_id"]
  ])("rejects conflicting URL/body identifiers on %s %s", async (method, path, field) => {
    const app = createApp({ service: {} });
    const response = await app.request(path, json({ [field]: "other" }, "test", method));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatchObject({ code: "ROUTE_PARAMETER_MISMATCH", details: { field } });
  });

  it("accepts matching redundant identifiers and releases locks after validation errors", async () => {
    const { app, sessions } = await fixture();
    const path = `/v1/sessions/${sessions.alpha}/end`;
    expect((await app.request(path, json({ status: "invalid" }))).status).toBe(400);
    expect((await app.request(path, json({ session_id: ` ${sessions.alpha} `, status: "completed" }))).status).toBe(200);
    expect((await app.request("/v1/admin/projects/alpha", { method: "DELETE", headers: admin })).status).toBe(200);
  });
});
