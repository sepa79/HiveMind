import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HiveMindService } from "../app/service.mjs";
import { createApp } from "./app.mjs";
import { FsJsonlStorage } from "../storage/fs-jsonl-storage.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

describe("HiveMind API", () => {
  it("creates a project and wraps the result in the standard envelope", async () => {
    const app = createTestApp();

    const response = await app.request("/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id: "buzz",
        name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
        root_path: "/repo/buzz",
        default_branch: "main",
        description: "Buzz project"
      })
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.project.project_id).toBe("buzz");
    expect(payload.meta.request_id).toBeTruthy();
  });

  it.each([123, true, {}, [], null])("rejects a non-string repository_slug (%j) before writing a project", async (repository_slug) => {
    const app = createTestApp();
    const response = await createProject(app, { repository_slug });
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("VALIDATION_ERROR");
    expect(payload.error.details.issues.some((issue) => issue.path === "repository_slug")).toBe(true);
    const projects = await (await app.request("/v1/projects")).json();
    expect(projects.data.projects).toEqual([]);
    expect((await createProject(app)).status).toBe(201);
  });

  it("canonicalizes project ids from the Git repository name", async () => {
    const app = createTestApp();

    const response = await app.request("/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id: "sepa79/SkippyBot",
        name: "SkippyBot",
        repository_url: "https://github.com/sepa79/SkippyBot.git",
        repository_slug: "sepa79/SkippyBot.git/",
        root_path: "/repo/SkippyBot",
        default_branch: "main",
        description: "SkippyBot project"
      })
    });

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.data.project.project_id).toBe("skippybot");
    expect(payload.data.project.name).toBe("SkippyBot");
    expect(payload.data.project.repository_slug).toBe("sepa79/SkippyBot.git/");
  });

  it("rejects repository slugs that cannot produce a safe canonical project id", async () => {
    const app = createTestApp();

    const response = await app.request("/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id: "unsafe",
        name: "Unsafe",
        repository_url: "https://example.com/org/..",
        repository_slug: "org/..",
        root_path: "/repo/unsafe",
        default_branch: "main",
        description: "Unsafe project id"
      })
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("lists registered projects for the human UI", async () => {
    const app = createTestApp();
    await createProject(app);

    const response = await app.request("/v1/projects");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.projects.map((project) => project.project_id)).toEqual(["buzz"]);
  });

  it("rejects admin project operations without the admin token", async () => {
    const app = createTestApp();
    await createProject(app);

    const response = await app.request("/v1/admin/projects/buzz", {
      method: "DELETE"
    });

    expect(response.status).toBe(401);
    const payload = await response.json();
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects unsafe project ids for destructive admin operations", async () => {
    const app = createTestApp();

    const response = await app.request("/v1/admin/projects/merge", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        source_project_id: "../unsafe",
        target_project_id: "buzz"
      })
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });

  it("deletes a project through the admin API", async () => {
    const app = createTestApp();
    await createProject(app);

    const deleteResponse = await app.request("/v1/admin/projects/buzz?reason=cleanup", {
      method: "DELETE",
      headers: adminHeaders()
    });
    const listResponse = await app.request("/v1/projects");

    expect(deleteResponse.status).toBe(200);
    const deletePayload = await deleteResponse.json();
    expect(deletePayload.data.deleted_project_id).toBe("buzz");
    expect(deletePayload.data.reason).toBe("cleanup");
    expect(deletePayload.data.deleted_counts.rules).toBe(0);
    const listPayload = await listResponse.json();
    expect(listPayload.data.projects).toEqual([]);
  });

  it("waits for in-flight requests before deleting their project", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "hivemind-api-gate-"));
    roots.push(dataRoot);
    const storage = new FsJsonlStorage({ dataRoot });
    const service = new HiveMindService({ storage, version: "test-version" });
    const app = createApp({ service, adminToken: "test-admin-token" });
    await createProject(app);
    const sessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "gate-session"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "main",
        workspace_path: "/repo/buzz",
        author_id: "agent-gate",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Exercise request gate"
      })
    });
    const sessionPayload = await sessionResponse.json();

    const originalGetSession = storage.getSession.bind(storage);
    let signalSessionLookup;
    let releaseSessionLookup;
    const sessionLookupStarted = new Promise((resolve) => {
      signalSessionLookup = resolve;
    });
    const sessionLookupGate = new Promise((resolve) => {
      releaseSessionLookup = resolve;
    });
    storage.getSession = async (...args) => {
      const session = await originalGetSession(...args);
      signalSessionLookup();
      await sessionLookupGate;
      return session;
    };

    const entryRequest = app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "gate-entry"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionPayload.data.session.session_id,
        branch: "main",
        author_id: "agent-gate",
        author_type: "agent",
        source: "mcp",
        entry_type: "progress",
        summary: "Complete before delete"
      })
    });
    await sessionLookupStarted;

    let deleteFinished = false;
    const deleteRequest = app
      .request("/v1/admin/projects/buzz", { method: "DELETE", headers: adminHeaders() })
      .then((response) => {
        deleteFinished = true;
        return response;
      });
    await new Promise((resolve) => setImmediate(resolve));
    expect(deleteFinished).toBe(false);

    releaseSessionLookup();
    const [entryResponse, deleteResponse] = await Promise.all([entryRequest, deleteRequest]);

    expect(entryResponse.status).toBe(201);
    expect(deleteResponse.status).toBe(200);
    expect(await storage.getProject("buzz")).toBeNull();
    expect(existsSync(join(dataRoot, "projects", "buzz"))).toBe(false);
  });

  it("rejects an opaque-id session route if deletion wins during project lookup", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "hivemind-api-gate-session-"));
    roots.push(dataRoot);
    const storage = new FsJsonlStorage({ dataRoot });
    const service = new HiveMindService({ storage, version: "test-version" });
    const app = createApp({ service, adminToken: "test-admin-token" });
    await createProject(app);

    const sessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "gate-session-end"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "main",
        workspace_path: "/repo/buzz",
        author_id: "agent-gate",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Exercise opaque session gate"
      })
    });
    const sessionPayload = await sessionResponse.json();
    const sessionId = sessionPayload.data.session.session_id;

    const originalGetSession = storage.getSession.bind(storage);
    let blockFirstLookup = true;
    let signalSessionLookup;
    let releaseSessionLookup;
    const sessionLookupStarted = new Promise((resolve) => {
      signalSessionLookup = resolve;
    });
    const sessionLookupGate = new Promise((resolve) => {
      releaseSessionLookup = resolve;
    });
    storage.getSession = async (...args) => {
      const session = await originalGetSession(...args);
      if (blockFirstLookup && session?.session_id === sessionId) {
        blockFirstLookup = false;
        signalSessionLookup();
        await sessionLookupGate;
      }
      return session;
    };

    const endSessionRequest = app.request(`/v1/sessions/${sessionId}/end`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "completed"
      })
    });
    await sessionLookupStarted;

    let deleteFinished = false;
    const deleteRequest = app
      .request("/v1/admin/projects/buzz", { method: "DELETE", headers: adminHeaders() })
      .then((response) => {
        deleteFinished = true;
        return response;
      });
    await deleteRequest;
    expect(deleteFinished).toBe(true);

    releaseSessionLookup();
    const [endSessionResponse, deleteResponse] = await Promise.all([endSessionRequest, deleteRequest]);
    expect(endSessionResponse.status).toBe(404);
    expect((await endSessionResponse.json()).error.code).toBe("SESSION_NOT_FOUND");
    expect(deleteResponse.status).toBe(200);
  });

  it("allows unrelated project traffic while deleting a different project", async () => {
    const dataRoot = mkdtempSync(join(tmpdir(), "hivemind-api-gate-project-"));
    roots.push(dataRoot);
    const storage = new FsJsonlStorage({ dataRoot });
    const service = new HiveMindService({ storage, version: "test-version" });
    const app = createApp({ service, adminToken: "test-admin-token" });
    await createProject(app);
    await createProject(app, {
      project_id: "legacy",
      name: "Legacy",
      repository_url: "https://github.com/example/legacy.git",
      repository_slug: "example/legacy",
      root_path: "/repo/legacy",
      default_branch: "main",
      description: "Legacy project"
    });

    const sessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "gate-buzz-session"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "main",
        workspace_path: "/repo/buzz",
        author_id: "agent-gate",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Exercise project gate"
      })
    });
    const sessionPayload = await sessionResponse.json();

    const originalGetSession = storage.getSession.bind(storage);
    let signalSessionLookup;
    let releaseSessionLookup;
    const sessionLookupStarted = new Promise((resolve) => {
      signalSessionLookup = resolve;
    });
    const sessionLookupGate = new Promise((resolve) => {
      releaseSessionLookup = resolve;
    });
    storage.getSession = async (...args) => {
      const session = await originalGetSession(...args);
      if (session?.project_id === "buzz") {
        signalSessionLookup();
        await sessionLookupGate;
      }
      return session;
    };

    const buzzEntryRequest = app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "gate-buzz-entry"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionPayload.data.session.session_id,
        branch: "main",
        author_id: "agent-gate",
        author_type: "agent",
        source: "mcp",
        entry_type: "progress",
        summary: "Hold buzz gate"
      })
    });
    await sessionLookupStarted;

    const deleteRequest = app.request("/v1/admin/projects/buzz", { method: "DELETE", headers: adminHeaders() });
    const legacySessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "gate-legacy-session"
      },
      body: JSON.stringify({
        project_id: "legacy",
        branch: "main",
        workspace_path: "/repo/legacy",
        author_id: "agent-legacy",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Unrelated project should proceed"
      })
    });

    expect(legacySessionResponse.status).toBe(201);

    releaseSessionLookup();
    const [buzzEntryResponse, deleteResponse] = await Promise.all([buzzEntryRequest, deleteRequest]);
    expect(buzzEntryResponse.status).toBe(201);
    expect(deleteResponse.status).toBe(200);
  });

  it("merges one project into another through the admin API", async () => {
    const app = createTestApp();
    await createProject(app);
    await createProject(app, {
      project_id: "legacy",
      name: "Legacy",
      repository_url: "https://github.com/example/legacy.git",
      repository_slug: "example/legacy",
      root_path: "/repo/legacy",
      default_branch: "main",
      description: "Legacy project",
      standard_profile_ref: "aws-microservice@v2"
    });
    const sessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "legacy-session"
      },
      body: JSON.stringify({
        project_id: "legacy",
        branch: "main",
        workspace_path: "/repo/legacy",
        author_id: "agent-legacy",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Legacy work"
      })
    });
    const sessionPayload = await sessionResponse.json();
    await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "legacy-entry"
      },
      body: JSON.stringify({
        project_id: "legacy",
        session_id: sessionPayload.data.session.session_id,
        branch: "main",
        author_id: "agent-legacy",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "Legacy decision"
      })
    });
    await app.request("/v1/projects/legacy/ruleset", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rules: [
          {
            rule_id: "legacy_rule",
            label: "Legacy rule",
            description: "Preserve this rule during project merge.",
            severity: "advisory",
            check_mode: "manual_confirm"
          }
        ]
      })
    });

    const mergeResponse = await app.request("/v1/admin/projects/merge", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        source_project_id: "legacy",
        target_project_id: "buzz",
        reason: "merge legacy"
      })
    });
    const listResponse = await app.request("/v1/projects");
    const searchResponse = await app.request("/v1/entries/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id: "buzz",
        query: "Legacy decision"
      })
    });
    const rulesetResponse = await app.request("/v1/projects/buzz/ruleset");

    expect(mergeResponse.status).toBe(200);
    const mergePayload = await mergeResponse.json();
    expect(mergePayload.data.reason).toBe("merge legacy");
    expect(mergePayload.data.moved_counts.entries).toBe(1);
    expect(mergePayload.data.moved_counts.sessions).toBe(1);
    const listPayload = await listResponse.json();
    expect(listPayload.data.projects.map((project) => project.project_id)).toEqual(["buzz"]);
    const searchPayload = await searchResponse.json();
    expect(searchPayload.data.entries).toHaveLength(1);
    expect(searchPayload.data.entries[0].project_id).toBe("buzz");
    const rulesetPayload = await rulesetResponse.json();
    expect(rulesetPayload.data.ruleset.rules.map((rule) => rule.rule_id)).toEqual(["legacy_rule"]);
    expect(mergePayload.data.target_project.ruleset_id).toBe(rulesetPayload.data.ruleset.ruleset_id);
    expect(mergePayload.data.standard_profile_resolution).toEqual({
      source_profile_ref: "aws-microservice@v2",
      target_profile_ref: null,
      strategy: "automatic",
      result_profile_ref: "aws-microservice@v2"
    });
    expect(mergePayload.data.target_project.standard_profile_ref).toBe("aws-microservice@v2");
  });

  it.each([
    ["prefer_source", undefined, "aws-microservice@v2"],
    ["prefer_target", undefined, "base@v1"],
    ["set", "base@v1", "base@v1"]
  ])("resolves different project profiles with %s", async (strategy, standardProfileRef, expectedProfileRef) => {
    const app = createTestApp();
    await createProject(app, { standard_profile_ref: "base@v1" });
    await createProject(app, {
      project_id: "legacy",
      name: "Legacy",
      repository_url: "https://github.com/example/legacy.git",
      repository_slug: "example/legacy",
      root_path: "/repo/legacy",
      default_branch: "main",
      description: "Legacy project",
      standard_profile_ref: "aws-microservice@v2"
    });

    const unresolvedResponse = await app.request("/v1/admin/projects/merge", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({ source_project_id: "legacy", target_project_id: "buzz" })
    });
    expect(unresolvedResponse.status).toBe(409);
    const unresolvedPayload = await unresolvedResponse.json();
    expect(unresolvedPayload.error.code).toBe("PROJECT_STANDARD_PROFILE_RESOLUTION_REQUIRED");

    const mergeResponse = await app.request("/v1/admin/projects/merge", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        source_project_id: "legacy",
        target_project_id: "buzz",
        standard_profile_resolution: {
          strategy,
          ...(standardProfileRef ? { standard_profile_ref: standardProfileRef } : {})
        }
      })
    });

    expect(mergeResponse.status).toBe(200);
    const mergePayload = await mergeResponse.json();
    expect(mergePayload.data.target_project.standard_profile_ref).toBe(expectedProfileRef);
    expect(mergePayload.data.standard_profile_resolution).toEqual({
      source_profile_ref: "aws-microservice@v2",
      target_profile_ref: "base@v1",
      strategy,
      result_profile_ref: expectedProfileRef
    });
  });

  it("accepts a redundant profile resolution when retrying an already published merge", async () => {
    const app = createTestApp();
    await createProject(app, { standard_profile_ref: "aws-microservice@v2" });
    await createProject(app, {
      project_id: "legacy",
      name: "Legacy",
      repository_url: "https://github.com/example/legacy.git",
      repository_slug: "example/legacy",
      root_path: "/repo/legacy",
      default_branch: "main",
      description: "Legacy project",
      standard_profile_ref: "aws-microservice@v2"
    });

    const response = await app.request("/v1/admin/projects/merge", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        source_project_id: "legacy",
        target_project_id: "buzz",
        standard_profile_resolution: { strategy: "prefer_source" }
      })
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.standard_profile_resolution).toEqual({
      source_profile_ref: "aws-microservice@v2",
      target_profile_ref: "aws-microservice@v2",
      strategy: "prefer_source",
      result_profile_ref: "aws-microservice@v2"
    });
  });

  it("rejects an explicit merge profile that is absent from the catalog", async () => {
    const app = createTestApp();
    await createProject(app, { standard_profile_ref: "base@v1" });
    await createProject(app, {
      project_id: "legacy",
      name: "Legacy",
      repository_url: "https://github.com/example/legacy.git",
      repository_slug: "example/legacy",
      root_path: "/repo/legacy",
      default_branch: "main",
      description: "Legacy project",
      standard_profile_ref: "aws-microservice@v2"
    });

    const response = await app.request("/v1/admin/projects/merge", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        source_project_id: "legacy",
        target_project_id: "buzz",
        standard_profile_resolution: {
          strategy: "set",
          standard_profile_ref: "missing@v1"
        }
      })
    });

    expect(response.status).toBe(404);
    const payload = await response.json();
    expect(payload.error.code).toBe("RULESET_PROFILE_NOT_FOUND");
    const projectsPayload = await (await app.request("/v1/projects")).json();
    expect(projectsPayload.data.projects.map((project) => project.project_id)).toEqual(["buzz", "legacy"]);
  });

  it("rejects a project merge when rules with the same id disagree", async () => {
    const app = createTestApp();
    await createProject(app);
    await createProject(app, {
      project_id: "legacy",
      name: "Legacy",
      repository_url: "https://github.com/example/legacy.git",
      repository_slug: "example/legacy",
      root_path: "/repo/legacy",
      default_branch: "main",
      description: "Legacy project"
    });
    for (const [projectId, description] of [
      ["buzz", "Target definition."],
      ["legacy", "Conflicting source definition."]
    ]) {
      await app.request(`/v1/projects/${projectId}/ruleset`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rules: [
            {
              rule_id: "shared_rule",
              label: "Shared rule",
              description,
              severity: "required",
              check_mode: "manual_confirm"
            }
          ]
        })
      });
    }

    const mergeResponse = await app.request("/v1/admin/projects/merge", {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        source_project_id: "legacy",
        target_project_id: "buzz"
      })
    });

    expect(mergeResponse.status).toBe(409);
    const mergePayload = await mergeResponse.json();
    expect(mergePayload.error.code).toBe("PROJECT_MERGE_CONFLICT");
    const projectsPayload = await (await app.request("/v1/projects")).json();
    expect(projectsPayload.data.projects.map((project) => project.project_id)).toEqual(["buzz", "legacy"]);
  });

  it("resolves a registered project from repository metadata", async () => {
    const app = createTestApp();
    await createProject(app);

    const response = await app.request("/v1/projects/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        repository_url: "https://github.com/example/buzz",
        workspace_path: "/different/local/path"
      })
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.status).toBe("matched");
    expect(payload.data.project.project_id).toBe("buzz");
    expect(payload.data.resolution_reason).toContain("repository_url");
  });

  it("resolves project id hints case-insensitively", async () => {
    const app = createTestApp();
    await createProject(app);

    const response = await app.request("/v1/projects/resolve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id_hint: "Buzz"
      })
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.status).toBe("matched");
    expect(payload.data.project.project_id).toBe("buzz");
    expect(payload.data.resolution_reason).toContain("project_id_hint");
  });

  it("updates the canonical project when the same repository is registered again", async () => {
    const app = createTestApp();
    await createProject(app);
    await app.request("/v1/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id: "buzz-feature",
        name: "Buzz Feature",
        repository_url: "https://github.com/example/buzz.git",
        repository_slug: "Example/Buzz.git",
        root_path: "/worktrees/buzz-feature",
        default_branch: "main",
        description: "Separate work stream for Buzz"
      })
    });

    const response = await app.request("/v1/projects");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.projects.map((project) => project.project_id)).toEqual(["buzz"]);
    expect(payload.data.projects[0].name).toBe("Buzz Feature");
    expect(payload.data.projects[0].root_path).toBe("/worktrees/buzz-feature");
  });

  it("rejects a different repository that resolves to an existing canonical project id", async () => {
    const app = createTestApp();
    await createProject(app, {
      name: "Shared One",
      repository_url: "https://github.com/one/shared.git",
      repository_slug: "one/shared",
      root_path: "/repo/one/shared"
    });

    const response = await createProject(app, {
      name: "Shared Two",
      repository_url: "https://github.com/two/shared.git",
      repository_slug: "two/shared",
      root_path: "/repo/two/shared"
    });

    expect(response.status).toBe(409);
    const conflictPayload = await response.json();
    expect(conflictPayload.error).toMatchObject({
      code: "PROJECT_ID_REPOSITORY_CONFLICT",
      details: {
        project_id: "shared",
        existing_repository_slug: "one/shared",
        incoming_repository_slug: "two/shared"
      }
    });

    const projectsPayload = await (await app.request("/v1/projects")).json();
    expect(projectsPayload.data.projects).toHaveLength(1);
    expect(projectsPayload.data.projects[0]).toMatchObject({
      project_id: "shared",
      name: "Shared One",
      repository_url: "https://github.com/one/shared.git",
      repository_slug: "one/shared",
      root_path: "/repo/one/shared"
    });
  });

  it("atomically rejects concurrent repositories with the same canonical project id", async () => {
    const app = createTestApp();

    const responses = await Promise.all([
      createProject(app, {
        name: "Shared One",
        repository_url: "https://github.com/one/shared.git",
        repository_slug: "one/shared",
        root_path: "/repo/one/shared"
      }),
      createProject(app, {
        name: "Shared Two",
        repository_url: "https://github.com/two/shared.git",
        repository_slug: "two/shared",
        root_path: "/repo/two/shared"
      })
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    const projectsPayload = await (await app.request("/v1/projects")).json();
    expect(projectsPayload.data.projects).toHaveLength(1);
    expect(["one/shared", "two/shared"]).toContain(projectsPayload.data.projects[0].repository_slug);
  });

  it("returns health diagnostics", async () => {
    const app = createTestApp();
    await createProject(app);

    const response = await app.request("/health");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.status).toBe("ok");
    expect(payload.data.service).toBe("hivemind-api");
    expect(payload.data.version).toBe("test-version");
    expect(payload.data.project_count).toBe(1);
    expect(payload.data.projects[0].project_id).toBe("buzz");
  });

  it("writes structured access logs for successful requests", async () => {
    const accessLogger = { log: vi.fn() };
    const app = createTestApp({ accessLogger });

    const response = await app.request("/health", {
      headers: {
        "x-request-id": "req-test",
        "x-forwarded-for": "203.0.113.5, 10.0.0.1",
        "user-agent": "vitest"
      }
    });

    expect(response.status).toBe(200);
    expect(accessLogger.log).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(accessLogger.log.mock.calls[0][0]);
    expect(entry).toMatchObject({
      event: "http_request",
      request_id: "req-test",
      method: "GET",
      path: "/health",
      status: 200,
      client_ip: "203.0.113.5",
      user_agent: "vitest"
    });
    expect(entry.duration_ms).toBeGreaterThanOrEqual(0);
    expect(entry.timestamp).toBeTruthy();
  });

  it("writes structured access logs for failed requests", async () => {
    const accessLogger = { log: vi.fn() };
    const app = createTestApp({ accessLogger });

    const response = await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "entry-key"
      },
      body: JSON.stringify({
        project_id: "buzz"
      })
    });

    expect(response.status).toBe(400);
    expect(accessLogger.log).toHaveBeenCalledTimes(1);
    const entry = JSON.parse(accessLogger.log.mock.calls[0][0]);
    expect(entry).toMatchObject({
      event: "http_request",
      method: "POST",
      path: "/v1/entries",
      status: 400,
      error_code: "VALIDATION_ERROR"
    });
  });

  it("stores and returns the active ruleset", async () => {
    const app = createTestApp();
    await createProject(app);

    const putResponse = await app.request("/v1/projects/buzz/ruleset", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rules: [
          {
            rule_id: "always_test",
            label: "Always test",
            description: "Run tests before closing work.",
            severity: "required",
            check_mode: "command_reference_required"
          }
        ]
      })
    });

    expect(putResponse.status).toBe(200);
    const putPayload = await putResponse.json();
    expect(putPayload.data.ruleset.version).toBe(1);

    const getResponse = await app.request("/v1/projects/buzz/ruleset");
    expect(getResponse.status).toBe(200);
    const getPayload = await getResponse.json();
    expect(getPayload.data.ruleset.rules[0].rule_id).toBe("always_test");
  });

  it("serves ruleset catalog profiles and bundles", async () => {
    const app = createTestApp();

    const listResponse = await app.request("/v1/ruleset-catalog/profiles");
    expect(listResponse.status).toBe(200);
    const listPayload = await listResponse.json();
    expect(listPayload.data.profiles.map((profile) => profile.profile_ref)).toContain("aws-microservice@v3");

    const bundleResponse = await app.request("/v1/ruleset-catalog/profiles/aws-microservice/versions/v3/bundle");
    expect(bundleResponse.status).toBe(200);
    const bundlePayload = await bundleResponse.json();
    expect(bundlePayload.data.manifest.profile_ref).toBe("aws-microservice@v3");
    expect(bundlePayload.data.files.some((file) => file.target === "AGENTS.md")).toBe(true);

    const baseV3Response = await app.request("/v1/ruleset-catalog/profiles/base/versions/v3/bundle");
    expect(baseV3Response.status).toBe(200);
    const baseV3Payload = await baseV3Response.json();
    expect(baseV3Payload.data.manifest.profile_ref).toBe("base@v3");
    expect(baseV3Payload.data.files.find((file) => file.target === "AGENTS.md")?.content).toContain(
      "SSOT for contracts, state, configuration, and behavior"
    );
    expect(
      baseV3Payload.data.files.some((file) => file.target === "docs/ai/STANDARD_PROFILE_UPGRADE.md")
    ).toBe(true);
  });

  it("activates the v4 rule explicitly without losing custom rules or reassigning another project", async () => {
    const app = createTestApp();
    await createProject(app, { standard_profile_ref: "base@v3" });
    await createProject(app, {
      project_id: "other", name: "Other", repository_slug: "example/other",
      repository_url: "https://github.com/example/other.git", standard_profile_ref: "base@v3"
    });
    const customRule = {
      rule_id: "project_specific", label: "Project rule", description: "Keep local deployment instructions.",
      severity: "required", check_mode: "manual_confirm"
    };
    const put = (path, body) => app.request(path, {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
    });
    expect((await put("/v1/projects/buzz/ruleset", { rules: [customRule] })).status).toBe(200);
    const bundleResponse = await app.request("/v1/ruleset-catalog/profiles/base/versions/v4/bundle");
    expect(bundleResponse.status).toBe(200);
    const bundle = (await bundleResponse.json()).data;
    expect((await put("/v1/projects/buzz/standard-profile", { standard_profile_ref: "base@v4" })).status).toBe(200);
    const before = (await (await app.request("/v1/projects/buzz/ruleset")).json()).data.ruleset.rules;
    expect(before).toEqual([expect.objectContaining(customRule)]);
    const rule = bundle.manifest.rules.find(item => item.rule_id === "documentation_before_implementation");
    expect(rule).toMatchObject({ severity: "required", check_mode: "file_reference_required" });
    expect((await put("/v1/projects/buzz/ruleset", { rules: [...before, rule] })).status).toBe(200);
    const active = (await (await app.request("/v1/projects/buzz/ruleset")).json()).data.ruleset.rules;
    expect(active).toEqual([expect.objectContaining(customRule), expect.objectContaining(rule)]);
    const session = await app.request("/v1/sessions", {
      method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": "v4-activation" },
      body: JSON.stringify({ project_id: "buzz", branch: "main", workspace_path: "/repo/buzz",
        author_id: "test", author_type: "agent", source: "mcp", agent_id: "test", goal: "Verify v4 rule recall" })
    });
    expect(session.status).toBe(201);
    const recall = (await session.json()).data.recall;
    expect(recall.rules.some(item => JSON.stringify(item).includes("documentation_before_implementation"))).toBe(true);
    const projects = (await (await app.request("/v1/projects")).json()).data.projects;
    expect(projects.find(project => project.project_id === "other").standard_profile_ref).toBe("base@v3");
  });

  it("assigns a project standard profile and treats customized starter files as current", async () => {
    const app = createTestApp();
    await createProject(app);

    const assignResponse = await app.request("/v1/projects/buzz/standard-profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standard_profile_ref: "aws-microservice@v3" })
    });
    expect(assignResponse.status).toBe(200);
    const assignPayload = await assignResponse.json();
    expect(assignPayload.data.project.standard_profile_ref).toBe("aws-microservice@v3");

    const firstGuidanceResponse = await app.request("/v1/guidance/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project_id: "buzz" })
    });
    expect(firstGuidanceResponse.status).toBe(200);
    const firstGuidancePayload = await firstGuidanceResponse.json();
    expect(firstGuidancePayload.data.recommended_action).toBe("apply");
    expect(firstGuidancePayload.data.drift).toEqual([]);
    expect(firstGuidancePayload.data.marker_source).toBe("none");
    expect(firstGuidancePayload.data.summary).toContain("no stored standard marker exists yet");

    const bundleResponse = await app.request("/v1/ruleset-catalog/profiles/aws-microservice/versions/v3/bundle");
    expect(bundleResponse.status).toBe(200);
    const bundlePayload = await bundleResponse.json();

    const marker = {
      project_id: "buzz",
      profile_ref: "aws-microservice@v3",
      applied_at: "2026-08-20T00:00:00.000Z",
      files: bundlePayload.data.files.map((file) => ({
        target: file.target,
        sha256: file.required ? `custom-${file.sha256}` : file.sha256
      }))
    };
    const updateMarkerResponse = await app.request("/v1/projects/buzz/standard-marker", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standard_marker: marker })
    });
    expect(updateMarkerResponse.status).toBe(200);

    const currentGuidanceResponse = await app.request("/v1/guidance/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project_id: "buzz" })
    });
    expect(currentGuidanceResponse.status).toBe(200);
    const currentGuidancePayload = await currentGuidanceResponse.json();
    expect(currentGuidancePayload.data.recommended_action).toBe("current");
    expect(currentGuidancePayload.data.marker_source).toBe("stored");
    expect(currentGuidancePayload.data.drift.some((file) => file.status === "customized")).toBe(true);
  });

  it("clears the stored marker when the assigned profile changes", async () => {
    const app = createTestApp();
    await createProject(app);

    const assignBaseResponse = await app.request("/v1/projects/buzz/standard-profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standard_profile_ref: "base@v3" })
    });
    expect(assignBaseResponse.status).toBe(200);

    const bundleResponse = await app.request("/v1/ruleset-catalog/profiles/base/versions/v3/bundle");
    expect(bundleResponse.status).toBe(200);
    const bundlePayload = await bundleResponse.json();
    const marker = {
      project_id: "buzz",
      profile_ref: "base@v3",
      applied_at: "2026-08-20T00:00:00.000Z",
      files: bundlePayload.data.files.map((file) => ({ target: file.target, sha256: file.sha256 }))
    };
    const updateMarkerResponse = await app.request("/v1/projects/buzz/standard-marker", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standard_marker: marker })
    });
    expect(updateMarkerResponse.status).toBe(200);

    const assignAwsResponse = await app.request("/v1/projects/buzz/standard-profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standard_profile_ref: "aws-microservice@v3" })
    });
    expect(assignAwsResponse.status).toBe(200);

    const guidanceResponse = await app.request("/v1/guidance/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project_id: "buzz" })
    });
    expect(guidanceResponse.status).toBe(200);
    const guidancePayload = await guidanceResponse.json();
    expect(guidancePayload.data.marker_source).toBe("none");
    expect(guidancePayload.data.recommended_action).toBe("apply");
  });

  it("rejects duplicate tracked-file targets in a stored standard marker", async () => {
    const app = createTestApp();
    await createProject(app, { standard_profile_ref: "base@v3" });

    const bundleResponse = await app.request("/v1/ruleset-catalog/profiles/base/versions/v3/bundle");
    expect(bundleResponse.status).toBe(200);
    const bundlePayload = await bundleResponse.json();
    const duplicateTarget = bundlePayload.data.files[0].target;
    const marker = {
      project_id: "buzz",
      profile_ref: "base@v3",
      applied_at: "2026-08-20T00:00:00.000Z",
      files: [
        ...bundlePayload.data.files.map((file) => ({ target: file.target, sha256: file.sha256 })),
        { target: duplicateTarget, sha256: "duplicate" }
      ]
    };

    const response = await app.request("/v1/projects/buzz/standard-marker", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standard_marker: marker })
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("STANDARD_MARKER_TARGET_DUPLICATE");
    expect(payload.error.details.duplicate_targets).toEqual([duplicateTarget]);
  });

  it("rejects unknown tracked-file targets in a stored standard marker", async () => {
    const app = createTestApp();
    await createProject(app, { standard_profile_ref: "base@v3" });

    const bundleResponse = await app.request("/v1/ruleset-catalog/profiles/base/versions/v3/bundle");
    expect(bundleResponse.status).toBe(200);
    const bundlePayload = await bundleResponse.json();
    const marker = {
      project_id: "buzz",
      profile_ref: "base@v3",
      applied_at: "2026-08-20T00:00:00.000Z",
      files: [
        ...bundlePayload.data.files.map((file) => ({ target: file.target, sha256: file.sha256 })),
        { target: "docs/ai/UNTRACKED.md", sha256: "extra" }
      ]
    };

    const response = await app.request("/v1/projects/buzz/standard-marker", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standard_marker: marker })
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("STANDARD_MARKER_TARGET_UNKNOWN");
    expect(payload.error.details.unknown_targets).toEqual(["docs/ai/UNTRACKED.md"]);
  });

  it("rejects incomplete tracked-file snapshots in a stored standard marker", async () => {
    const app = createTestApp();
    await createProject(app, { standard_profile_ref: "base@v3" });

    const bundleResponse = await app.request("/v1/ruleset-catalog/profiles/base/versions/v3/bundle");
    expect(bundleResponse.status).toBe(200);
    const bundlePayload = await bundleResponse.json();
    const omittedTarget = bundlePayload.data.files.at(-1).target;
    const marker = {
      project_id: "buzz",
      profile_ref: "base@v3",
      applied_at: "2026-08-20T00:00:00.000Z",
      files: bundlePayload.data.files.slice(0, -1).map((file) => ({ target: file.target, sha256: file.sha256 }))
    };

    const response = await app.request("/v1/projects/buzz/standard-marker", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standard_marker: marker })
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.error.code).toBe("STANDARD_MARKER_TARGET_MISSING");
    expect(payload.error.details.missing_targets).toEqual([omittedTarget]);
  });

  it("returns unregistered guidance for unknown projects", async () => {
    const app = createTestApp();

    const response = await app.request("/v1/guidance/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project_id: "missing" })
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.recommended_action).toBe("unregistered");
  });

  it("manages project features and rejects removing a feature still referenced in project memory", async () => {
    const app = createTestApp();
    await createProject(app);

    const addFirst = await app.request("/v1/projects/buzz/features", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        feature: "SMARTER_NFT_TESTS"
      })
    });
    expect(addFirst.status).toBe(200);

    await app.request("/v1/projects/buzz/features", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        feature: "LEGACY_TESTS"
      })
    });

    const contextToken = await openContext(app, {
      branch: "feat/features",
      feature: "SMARTER_NFT_TESTS"
    });
    await app.request("/v1/learnings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "feature-learning"
      },
      body: JSON.stringify({
        context_token: contextToken,
        summary: "Regenerate fixtures before authoring NFT tests",
        scope: "data",
        recommended_action: "Run fixture regeneration first."
      })
    });

    const listResponse = await app.request("/v1/projects/buzz/features");
    expect(listResponse.status).toBe(200);
    const listPayload = await listResponse.json();
    expect(listPayload.data.features).toEqual(["SMARTER_NFT_TESTS", "LEGACY_TESTS"]);

    const renameResponse = await app.request("/v1/projects/buzz/features/SMARTER_NFT_TESTS/rename", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        new_feature: "SMARTER_NFT_COVERAGE"
      })
    });
    expect(renameResponse.status).toBe(200);
    const renamePayload = await renameResponse.json();
    expect(renamePayload.data.features).toEqual(["SMARTER_NFT_COVERAGE", "LEGACY_TESTS"]);

    const learningsResponse = await app.request("/v1/learnings/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        context_token: contextToken,
        feature: "SMARTER_NFT_COVERAGE"
      })
    });
    const learningsPayload = await learningsResponse.json();
    expect(learningsPayload.data.learnings).toHaveLength(1);
    expect(learningsPayload.data.learnings[0].context.feature).toBe("SMARTER_NFT_COVERAGE");

    const removeInUse = await app.request("/v1/projects/buzz/features/SMARTER_NFT_COVERAGE", {
      method: "DELETE"
    });
    expect(removeInUse.status).toBe(409);
    const removeInUsePayload = await removeInUse.json();
    expect(removeInUsePayload.error.code).toBe("FEATURE_IN_USE");

    const removeUnused = await app.request("/v1/projects/buzz/features/LEGACY_TESTS", {
      method: "DELETE"
    });
    expect(removeUnused.status).toBe(200);
    const removeUnusedPayload = await removeUnused.json();
    expect(removeUnusedPayload.data.features).toEqual(["SMARTER_NFT_COVERAGE"]);
  });

  it("opens, updates, gets, and closes a context through the API", async () => {
    const app = createTestApp();
    await createProject(app);

    const openResponse = await app.request("/v1/contexts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "context-open"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/context",
        workspace_path: "/repo/buzz",
        feature: "NFT_TESTS",
        source_tool: "fixture-tool",
        tool_version: "7.43",
        environment: "local",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex-main"
      })
    });

    expect(openResponse.status).toBe(201);
    const openPayload = await openResponse.json();
    const contextToken = openPayload.data.context.context_token;
    expect(openPayload.data.recall.scope.project_id).toBe("buzz");
    expect(openPayload.data.recall.scope.branch).toBe("feat/context");
    expect(openPayload.data.recall.retrieval.history).toContain("learning_search");

    const getResponse = await app.request(`/v1/contexts/${contextToken}`);
    expect(getResponse.status).toBe(200);

    const patchResponse = await app.request(`/v1/contexts/${contextToken}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        feature: "SMARTER_NFT_TESTS",
        tool_version: "7.44"
      })
    });
    expect(patchResponse.status).toBe(200);
    const patchPayload = await patchResponse.json();
    expect(patchPayload.data.context.feature).toBe("SMARTER_NFT_TESTS");

    const closeResponse = await app.request(`/v1/contexts/${contextToken}/close`, {
      method: "POST"
    });
    expect(closeResponse.status).toBe(200);
    const closePayload = await closeResponse.json();
    expect(closePayload.data.context.status).toBe("closed");
  });

  it("captures learnings through context tokens and returns recent learnings", async () => {
    const app = createTestApp();
    await createProject(app);

    const currentContextToken = await openContext(app, {
      branch: "feat/nft",
      feature: "SMARTER_NFT_TESTS"
    });
    const legacyContextToken = await openContext(app, {
      branch: "feat/legacy",
      feature: "LEGACY_TESTS"
    });

    const captureResponse = await app.request("/v1/learnings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "learning-fixtures"
      },
      body: JSON.stringify({
        context_token: currentContextToken,
        summary: "Regenerate fixtures before authoring NFT tests",
        details: "Scenario Builder reuses stale fixture schema unless fixtures are refreshed first.",
        scope: "data",
        recommended_action: "Run fixture regeneration before test authoring.",
        importance: "high",
        tags: ["nft", "fixtures"]
      })
    });

    expect(captureResponse.status).toBe(201);
    const capturePayload = await captureResponse.json();
    expect(capturePayload.data.learning.context.feature).toBe("SMARTER_NFT_TESTS");

    await app.request("/v1/learnings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "learning-workers"
      },
      body: JSON.stringify({
        context_token: currentContextToken,
        summary: "Pin worker count to 1 for local Scenario Builder runs",
        scope: "env",
        recommended_action: "Use one worker locally to avoid flaky port allocation."
      })
    });

    await app.request("/v1/learnings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "learning-legacy"
      },
      body: JSON.stringify({
        context_token: legacyContextToken,
        summary: "Legacy fixture workaround is obsolete in v7.44",
        scope: "workflow",
        recommended_action: "Upgrade to v7.44 instead of using the old branch patch.",
        status: "resolved"
      })
    });
    await app.request("/v1/learning-feedback", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "learning-feedback"
      },
      body: JSON.stringify({
        context_token: currentContextToken,
        learning_id: capturePayload.data.learning.learning_id,
        feedback_type: "did_not_work",
        comment: "This did not help on stale remote cache."
      })
    });

    const recentResponse = await app.request("/v1/learnings/recent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        context_token: currentContextToken
      })
    });
    expect(recentResponse.status).toBe(200);
    const recentPayload = await recentResponse.json();
    expect(recentPayload.data.learnings).toHaveLength(2);
    expect(recentPayload.data.learnings.every((learning) => learning.context.feature === "SMARTER_NFT_TESTS")).toBe(
      true
    );
    expect(recentPayload.data.learnings[0].feedback_summary.did_not_work_count).toBe(1);

    const searchResponse = await app.request("/v1/learnings/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        context_token: currentContextToken,
        query: "legacy",
        status: "resolved"
      })
    });
    expect(searchResponse.status).toBe(200);
    const searchPayload = await searchResponse.json();
    expect(searchPayload.data.learnings).toHaveLength(1);
    expect(searchPayload.data.learnings[0].context.feature).toBe("LEGACY_TESTS");
  });

  it("resolves an existing learning with evidence, revision checking, and idempotency", async () => {
    const app = createTestApp();
    await createProject(app);
    const captureContextToken = await openContext(app, { branch: "feat/learning-resolution", feature: "CAPTURE_FEATURE" });
    const resolveContextToken = await openContext(app, { branch: "feat/other-work", feature: "RESOLUTION_FEATURE" });
    const capturedResponse = await app.request("/v1/learnings", {
      method: "POST",
      headers: { "content-type": "application/json", "Idempotency-Key": "learning-to-resolve" },
      body: JSON.stringify({
        context_token: captureContextToken,
        summary: "Temporary workaround",
        scope: "workflow",
        recommended_action: "Keep the workaround until the fix lands."
      })
    });
    const learning = (await capturedResponse.json()).data.learning;
    const request = () => app.request(`/v1/projects/buzz/learnings/${learning.learning_id}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json", "Idempotency-Key": "resolve-learning" },
      body: JSON.stringify({
        context_token: resolveContextToken,
        expected_revision: 0,
        reason: "The permanent fix is covered by tests.",
        evidence_refs: [{ kind: "repo_file", target: "tests/permanent-fix.test.mjs" }],
        resolution_scope: "feature"
      })
    });

    const revisionConflict = await app.request(`/v1/projects/buzz/learnings/${learning.learning_id}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json", "Idempotency-Key": "wrong-learning-revision" },
      body: JSON.stringify({
        context_token: resolveContextToken,
        expected_revision: 7,
        reason: "Use an intentionally stale revision.",
        evidence_refs: [{ kind: "repo_file", target: "tests/permanent-fix.test.mjs" }],
        resolution_scope: "feature"
      })
    });
    expect(revisionConflict.status).toBe(409);
    expect((await revisionConflict.json()).error.code).toBe("LEARNING_REVISION_CONFLICT");

    const first = await request();
    const second = await request();
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const firstPayload = await first.json();
    const secondPayload = await second.json();
    expect(firstPayload.data.learning).toMatchObject({ status: "resolved", revision: 1 });
    expect(firstPayload.data.learning.resolution).toMatchObject({
      resolution_scope: "feature",
      context: { branch: "feat/other-work", feature: "RESOLUTION_FEATURE" }
    });
    expect(firstPayload.data.action).toMatchObject({ previous_status: "active", previous_revision: 0, revision: 1 });
    expect(secondPayload.data).toEqual(firstPayload.data);

    const staleResponse = await app.request(`/v1/projects/buzz/learnings/${learning.learning_id}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json", "Idempotency-Key": "resolve-learning-again" },
      body: JSON.stringify({
        context_token: resolveContextToken,
        expected_revision: 0,
        reason: "Try a second transition.",
        evidence_refs: [{ kind: "repo_file", target: "tests/permanent-fix.test.mjs" }],
        resolution_scope: "feature"
      })
    });
    expect(staleResponse.status).toBe(409);
    expect((await staleResponse.json()).error.code).toBe("LEARNING_NOT_ACTIVE");

    expect((await app.request(`/v1/contexts/${resolveContextToken}/close`, { method: "POST" })).status).toBe(200);
    const retryAfterContextClose = await request();
    expect(retryAfterContextClose.status).toBe(200);
    expect((await retryAfterContextClose.json()).data).toEqual(firstPayload.data);
  });

  it("serializes concurrent learning resolution requests within one API instance", async () => {
    const app = createTestApp();
    await createProject(app);
    const contextToken = await openContext(app, { branch: "main" });
    const capturedResponse = await app.request("/v1/learnings", {
      method: "POST",
      headers: { "content-type": "application/json", "Idempotency-Key": "concurrent-learning" },
      body: JSON.stringify({
        context_token: contextToken,
        summary: "Concurrent workaround",
        scope: "workflow",
        recommended_action: "Resolve once."
      })
    });
    const learning = (await capturedResponse.json()).data.learning;
    const resolve = (key, reason) => app.request(`/v1/projects/buzz/learnings/${learning.learning_id}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify({
        context_token: contextToken,
        expected_revision: 0,
        reason,
        evidence_refs: [{ kind: "repo_file", target: "tests/concurrent-fix.test.mjs" }],
        resolution_scope: "project"
      })
    });

    const responses = await Promise.all([
      resolve("concurrent-resolve-a", "Resolution A"),
      resolve("concurrent-resolve-b", "Resolution B")
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 409]);
    const failed = responses.find((response) => response.status === 409);
    expect((await failed.json()).error.code).toBe("LEARNING_NOT_ACTIVE");
  });

  it("reports issues, appends lifecycle events, and filters active versus resolved issues", async () => {
    const app = createTestApp();
    await createProject(app);

    const contextToken = await openContext(app, {
      branch: "feat/issues",
      feature: "SMARTER_NFT_TESTS"
    });

    const reportResponse = await app.request("/v1/issues", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "issue-report"
      },
      body: JSON.stringify({
        context_token: contextToken,
        title: "Scenario Builder stale schema cache",
        summary: "Generated NFT scenarios fail until fixtures are regenerated.",
        details: "Observed during SMARTER_NFT_TESTS authoring on local fixtures.",
        severity: "high",
        tags: ["XYZ", "fixtures"]
      })
    });
    expect(reportResponse.status).toBe(201);
    const reportPayload = await reportResponse.json();
    const issueId = reportPayload.data.issue.issue_id;
    expect(reportPayload.data.issue.tags).toEqual(["XYZ", "fixtures"]);

    const githubResponse = await app.request(`/v1/issues/${issueId}/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "issue-github"
      },
      body: JSON.stringify({
        context_token: contextToken,
        event_type: "github_issue_linked",
        summary: "Linked upstream issue",
        github_issue_url: "https://github.com/acme/hivemind/issues/123"
      })
    });
    expect(githubResponse.status).toBe(201);

    await app.request(`/v1/issues/${issueId}/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "issue-fix"
      },
      body: JSON.stringify({
        context_token: contextToken,
        event_type: "fix_linked",
        summary: "Fixed in v7.44",
        version: "7.44"
      })
    });
    await app.request(`/v1/issues/${issueId}/events`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "issue-verified"
      },
      body: JSON.stringify({
        context_token: contextToken,
        event_type: "verified_fixed",
        summary: "Verified in v7.44"
      })
    });

    const getResponse = await app.request(`/v1/issues/${issueId}?context_token=${encodeURIComponent(contextToken)}`);
    expect(getResponse.status).toBe(200);
    const getPayload = await getResponse.json();
    expect(getPayload.data.issue.status).toBe("resolved");
    expect(getPayload.data.issue.github_issue_url).toBe("https://github.com/acme/hivemind/issues/123");
    expect(getPayload.data.events).toHaveLength(4);

    const activeResponse = await app.request(`/v1/issues?context_token=${encodeURIComponent(contextToken)}&status=active`);
    const activePayload = await activeResponse.json();
    expect(activePayload.data.issues).toHaveLength(0);

    const resolvedResponse = await app.request(
      `/v1/issues?context_token=${encodeURIComponent(contextToken)}&status=resolved`
    );
    const resolvedPayload = await resolvedResponse.json();
    expect(resolvedPayload.data.issues).toHaveLength(1);
    expect(resolvedPayload.data.issues[0].issue_id).toBe(issueId);

    const taggedResponse = await app.request(`/v1/issues?context_token=${encodeURIComponent(contextToken)}&tags=XYZ`);
    const taggedPayload = await taggedResponse.json();
    expect(taggedPayload.data.issues).toHaveLength(1);
    expect(taggedPayload.data.issues[0].tags).toEqual(["XYZ", "fixtures"]);
  });

  it("returns project briefs, branch briefs, and open threads for a context", async () => {
    const app = createTestApp();
    await createProject(app);
    await app.request("/v1/projects/buzz/ruleset", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rules: [
          {
            rule_id: "always_test",
            label: "Always test",
            description: "Run tests before closing work.",
            severity: "required",
            check_mode: "command_reference_required"
          }
        ]
      })
    });
    await app.request("/v1/projects/buzz/features", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        feature: "SMARTER_NFT_TESTS"
      })
    });

    const sessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "brief-session"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/brief",
        workspace_path: "/repo/buzz",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex-main",
        goal: "Seed brief context",
        plan_ref: {
          kind: "file",
          target: "docs/plans/archive/context-learning-issue-slice.md",
          label: "Plan",
          source: "agent_plan"
        }
      })
    });
    const sessionPayload = await sessionResponse.json();
    const sessionId = sessionPayload.data.session.session_id;
    const contextToken = await openContext(app, {
      branch: "feat/brief",
      feature: "SMARTER_NFT_TESTS"
    });

    await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "brief-decision"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionId,
        branch: "feat/brief",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "Keep API contracts in one schema file",
        importance: "high"
      })
    });
    await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "brief-risk"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionId,
        branch: "feat/brief",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        entry_type: "risk",
        summary: "Warm-start still needs an explicit issue channel",
        lifecycle_state: "open"
      })
    });
    await app.request("/v1/learnings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "brief-learning"
      },
      body: JSON.stringify({
        context_token: contextToken,
        summary: "Regenerate fixtures before authoring NFT tests",
        scope: "data",
        recommended_action: "Run fixture regeneration before test authoring.",
        importance: "high"
      })
    });
    await app.request("/v1/issues", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "brief-issue"
      },
      body: JSON.stringify({
        context_token: contextToken,
        title: "Scenario Builder fixture cache bug",
        summary: "NFT generation stays stale until fixtures are regenerated.",
        severity: "high"
      })
    });
    await app.request("/v1/rule-checks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "brief-rule-check"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionId,
        rule_id: "always_test",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        status: "blocked",
        note: "Test command is still missing"
      })
    });

    const projectBriefResponse = await app.request(`/v1/contexts/${contextToken}/project-brief`);
    const branchBriefResponse = await app.request(`/v1/contexts/${contextToken}/branch-brief`);
    const openThreadsResponse = await app.request(`/v1/contexts/${contextToken}/open-threads`);

    expect(projectBriefResponse.status).toBe(200);
    expect(branchBriefResponse.status).toBe(200);
    expect(openThreadsResponse.status).toBe(200);

    const projectBriefPayload = await projectBriefResponse.json();
    const branchBriefPayload = await branchBriefResponse.json();
    const openThreadsPayload = await openThreadsResponse.json();

    expect(projectBriefPayload.data.open_threads.filter((item) => item.kind === "issue")).toHaveLength(1);
    expect(branchBriefPayload.data.scope.branch).toBe("feat/brief");
    expect(openThreadsPayload.data.open_threads.map((thread) => thread.kind)).toEqual(["issue"]);
    expect(openThreadsPayload.data.view).toBe("threads");
  });

  it("creates a session and an entry, then searches by project and branch", async () => {
    const app = createTestApp();
    await createProject(app);

    const sessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "session-key"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/search",
        workspace_path: "/repo/buzz",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex-main",
        goal: "Create session"
      })
    });
    const sessionPayload = await sessionResponse.json();
    expect(sessionPayload.data.recall.scope.project_id).toBe("buzz");
    expect(sessionPayload.data.recall.scope.branch).toBe("feat/search");

    const entryResponse = await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "entry-key"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionPayload.data.session.session_id,
        branch: "feat/search",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "Searchable entry",
        category: "backend",
        tags: ["search"]
      })
    });

    expect(entryResponse.status).toBe(201);

    const searchResponse = await app.request("/v1/entries/search", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/search",
        query: "searchable"
      })
    });

    expect(searchResponse.status).toBe(200);
    const searchPayload = await searchResponse.json();
    expect(searchPayload.ok).toBe(true);
    expect(searchPayload.data.entries).toHaveLength(1);
    expect(searchPayload.data.entries[0].summary).toBe("Searchable entry");
  });

  it("corrects an entry and reports review actions for open project memory", async () => {
    const app = createTestApp();
    await createProject(app);
    const sessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "review-session"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/review",
        workspace_path: "/repo/buzz",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex-main",
        goal: "Review project memory"
      })
    });
    const sessionPayload = await sessionResponse.json();

    const entryResponse = await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "review-entry"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionPayload.data.session.session_id,
        branch: "feat/review",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        entry_type: "feedback",
        summary: "Old wording needs correction",
        lifecycle_state: "open"
      })
    });
    const entryPayload = await entryResponse.json();

    const correctionResponse = await app.request(
      `/v1/projects/buzz/entries/${entryPayload.data.entry.entry_id}/corrections`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "review-correction"
        },
        body: JSON.stringify({
          session_id: sessionPayload.data.session.session_id,
          branch: "feat/review",
          author_id: "codex-main",
          author_type: "agent",
          source: "mcp",
          summary: "Corrected wording",
          reason: "The original wording was ambiguous."
        })
      }
    );
    const reviewResponse = await app.request("/v1/projects/buzz/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        branch: "feat/review"
      })
    });
    const retryResponse = await app.request(
      `/v1/projects/buzz/entries/${entryPayload.data.entry.entry_id}/corrections`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "review-correction"
        },
        body: JSON.stringify({
          session_id: sessionPayload.data.session.session_id,
          branch: "feat/review",
          author_id: "codex-main",
          author_type: "agent",
          source: "mcp",
          summary: "Corrected wording",
          reason: "The original wording was ambiguous."
        })
      }
    );

    expect(correctionResponse.status).toBe(201);
    const correctionPayload = await correctionResponse.json();
    const retryPayload = await retryResponse.json();
    expect(correctionPayload.data.original_entry.lifecycle_state).toBe("superseded");
    expect(correctionPayload.data.correction_entry.related_entry_ids).toEqual([entryPayload.data.entry.entry_id]);
    expect(retryPayload.data.correction_entry.entry_id).toBe(correctionPayload.data.correction_entry.entry_id);
    expect(reviewResponse.status).toBe(200);
    const reviewPayload = await reviewResponse.json();
    expect(reviewPayload.data.signals.open_feedback.map((entry) => entry.summary)).toContain("Corrected wording");
    expect(reviewPayload.data.recommended_actions[0]).toMatchObject({
      action_type: "review",
      target_kind: "entry"
    });
  });

  it("ends a session and returns closeout reminders for missing rules and active learnings", async () => {
    const app = createTestApp();
    await createProject(app);
    await app.request("/v1/projects/buzz/ruleset", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rules: [
          {
            rule_id: "always_test",
            label: "Always test",
            description: "Run tests before closing work.",
            severity: "required",
            check_mode: "command_reference_required"
          },
          {
            rule_id: "always_review",
            label: "Always review",
            description: "Review changes before closing work.",
            severity: "required",
            check_mode: "manual_confirm"
          }
        ]
      })
    });

    const sessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "session-closeout"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/closeout",
        workspace_path: "/repo/buzz",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex-main",
        goal: "Close out work"
      })
    });
    const sessionPayload = await sessionResponse.json();
    const sessionId = sessionPayload.data.session.session_id;

    const contextToken = await openContext(app, {
      branch: "feat/closeout",
      feature: "SMARTER_NFT_TESTS"
    });
    await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "closeout-entry"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/closeout",
        session_id: sessionId,
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        entry_type: "progress",
        summary: "Implemented closeout"
      })
    });
    await app.request("/v1/learnings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "closeout-learning"
      },
      body: JSON.stringify({
        context_token: contextToken,
        summary: "Regenerate fixtures before authoring NFT tests",
        scope: "data",
        recommended_action: "Run fixture regeneration before test authoring.",
        importance: "high"
      })
    });
    await app.request("/v1/rule-checks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "closeout-rule-check"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionId,
        rule_id: "always_test",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        status: "applied",
        evidence: "npm run test:hivemind"
      })
    });

    const endResponse = await app.request(`/v1/sessions/${sessionId}/end`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "completed"
      })
    });

    expect(endResponse.status).toBe(200);
    const endPayload = await endResponse.json();
    expect(endPayload.data.session.status).toBe("completed");
    expect(endPayload.data.session.ended_at).toBeTruthy();
    expect(endPayload.data.closeout.goal).toBe("Close out work");
    expect(endPayload.data.closeout.activity_counts.rule_checks).toBe(1);
    expect(endPayload.data.closeout.missing_required_rules).toHaveLength(1);
    expect(endPayload.data.closeout.missing_required_rules[0].rule_id).toBe("always_review");
    expect(endPayload.data.closeout.active_learning_count).toBe(1);
    expect(endPayload.data.closeout.active_learning_summaries[0].summary).toBe(
      "Regenerate fixtures before authoring NFT tests"
    );

    const detailResponse = await app.request(`/v1/sessions/${sessionId}/closeout`);
    expect(detailResponse.status).toBe(200);
    const detailPayload = await detailResponse.json();
    expect(detailPayload.data.closeout.session_id).toBe(sessionId);
    expect(detailPayload.data.closeout.entry_groups[0].entries[0].summary).toBe("Implemented closeout");

    const conflictResponse = await app.request(`/v1/sessions/${sessionId}/end`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        status: "abandoned"
      })
    });
    expect(conflictResponse.status).toBe(409);
    const conflictPayload = await conflictResponse.json();
    expect(conflictPayload.error.code).toBe("SESSION_ALREADY_ENDED_WITH_DIFFERENT_STATUS");
  });

  it("returns the same session when the same idempotency key is retried", async () => {
    const app = createTestApp();
    await createProject(app);

    const body = JSON.stringify({
      project_id: "buzz",
      branch: "feat/idempotent",
      workspace_path: "/repo/buzz",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Retry"
    });

    const first = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "same"
      },
      body
    });
    const second = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "same"
      },
      body
    });

    const firstPayload = await first.json();
    const secondPayload = await second.json();

    expect(secondPayload.data.session.session_id).toBe(firstPayload.data.session.session_id);
  });

  it("lists sessions with activity counts for audit", async () => {
    const app = createTestApp();
    await createProject(app);

    const first = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "session-list-first"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "main",
        workspace_path: "/repo/buzz",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex-main",
        goal: "First listed session"
      })
    });
    const firstPayload = await first.json();

    await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "session-list-entry"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "main",
        session_id: firstPayload.data.session.session_id,
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        entry_type: "progress",
        summary: "Recorded progress"
      })
    });

    const listResponse = await app.request("/v1/projects/buzz/sessions?status=active");
    expect(listResponse.status).toBe(200);
    const listPayload = await listResponse.json();
    expect(listPayload.data.sessions).toHaveLength(1);
    expect(listPayload.data.sessions[0].last_seen_at).toBeTruthy();
    expect(listPayload.data.sessions[0].activity_counts.entries).toBe(1);
    expect(listPayload.data.sessions[0].activity_counts.rule_checks).toBe(0);
  });

  it("uses fresh matching CSP nonces and blocks framing", async () => {
    const app = createTestApp();
    const first = await app.request("/");
    const second = await app.request("/");
    const csp = first.headers.get("content-security-policy");
    const nonce = /script-src 'nonce-([^']+)'/.exec(csp)[1];
    const html = await first.text();
    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(html).toContain(`<style nonce="${nonce}">`);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("unsafe-inline");
    expect(second.headers.get("content-security-policy")).not.toBe(csp);
    expect(first.headers.get("x-frame-options")).toBe("DENY");
    expect(first.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("rejects oversized JSON before creating a project", async () => {
    const app = createTestApp();
    const response = await app.request("/v1/projects", {
      method: "POST", headers: {"content-type": "application/json"},
      body: JSON.stringify({name: "x".repeat(1024 * 1024)})
    });
    expect(response.status).toBe(413);
    expect((await response.json()).error.code).toBe("REQUEST_TOO_LARGE");
    expect((await (await app.request("/v1/projects")).json()).data.projects).toEqual([]);
  });

  it("bounds streamed bodies even without Content-Length", async () => {
    const app = createTestApp();
    const stream = new ReadableStream({start(controller) {
      controller.enqueue(new Uint8Array(700000));
      controller.enqueue(new Uint8Array(700000));
      controller.close();
    }});
    const response = await app.request("/v1/projects", {
      method: "POST", headers: {"content-type": "application/json"},
      body: stream, duplex: "half"
    });
    expect(response.status).toBe(413);
  });

  it("serves the human sessions UI", async () => {
    const app = createTestApp();

    const response = await app.request("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("HiveMind");
    expect(html).toContain("assets/hivemind-radial-grid-mark.svg");
    expect(html).toContain('class="appShell"');
    expect(html).toContain('class="sideNav"');
    expect(html).toContain('id="homeTab"');
    expect(html).toContain('id="homePanel"');
    expect(html).toContain('class="home-brand-logo" src="assets/hivemind-radial-grid-logo.svg"');
    expect(html).not.toContain("home-brand-mark");
    expect(html).toContain('select id="projectId"');
    expect(html).toContain('select id="branch"');
    expect(html).toContain('id="themeToggle"');
    expect(html).toContain("vtest-version");
    expect(html).toContain('id="detailsPanel"');
    expect(html).toContain('id="entryResults"');
    expect(html).toContain('id="entryFeature"');
    expect(html).toContain('id="entryTag"');
    expect(html).toContain('id="workUnitsTab"');
    expect(html).toContain('id="memoryTab"');
    expect(html).toContain('id="standardsTab"');
    expect(html).toContain('id="standardsPanel"');
    expect(html).toContain("/v1/guidance/check");
    expect(html).toContain("/v1/ruleset-catalog/profiles");
    expect(html).toContain('hidden');
    expect(html).toContain("/closeout");
    expect(html).toContain("/v1/entries/search");
    expect(html).not.toContain('select id="status"');
    expect(html).not.toContain("<th>Session ID</th>");
    expect(html).not.toContain("Close Older");
  });

  it("serves allowlisted HiveMind SVG assets", async () => {
    const app = createTestApp();

    const response = await app.request("/assets/hivemind-radial-grid-mark.svg");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("image/svg+xml");
    expect(await response.text()).toContain("<svg");

    const missingResponse = await app.request("/assets/not-allowed.svg");
    expect(missingResponse.status).toBe(404);
    const missingPayload = await missingResponse.json();
    expect(missingPayload.error.code).toBe("ASSET_NOT_FOUND");
  });

  it("creates a new session when a new idempotency key is used", async () => {
    const app = createTestApp();
    await createProject(app);

    const body = JSON.stringify({
      project_id: "buzz",
      branch: "feat/idempotent",
      workspace_path: "/repo/buzz",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Retry"
    });

    const first = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "first"
      },
      body
    });
    const second = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "second"
      },
      body
    });

    const firstPayload = await first.json();
    const secondPayload = await second.json();

    expect(secondPayload.data.session.session_id).not.toBe(firstPayload.data.session.session_id);
  });

  it("returns recall context with prior decisions and open threads on session start", async () => {
    const app = createTestApp();
    await createProject(app);
    await app.request("/v1/projects/buzz/ruleset", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rules: [
          {
            rule_id: "always_test",
            label: "Always test",
            description: "Run tests before closing work.",
            severity: "required",
            check_mode: "command_reference_required"
          }
        ]
      })
    });
    await app.request("/v1/projects/buzz/features", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        feature: "SMARTER_NFT_TESTS"
      })
    });

    const seedSessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "seed-session"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/recall",
        workspace_path: "/repo/buzz",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex-main",
        goal: "Seed context"
      })
    });
    const seedSessionPayload = await seedSessionResponse.json();
    const sessionId = seedSessionPayload.data.session.session_id;

    await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "decision-entry"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionId,
        branch: "feat/recall",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "Prefer storage adapter boundaries",
        importance: "high"
      })
    });
    const recallContextToken = await openContext(app, {
      branch: "feat/recall",
      feature: "SMARTER_NFT_TESTS"
    });
    await app.request("/v1/learnings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "recall-learning"
      },
      body: JSON.stringify({
        context_token: recallContextToken,
        summary: "Regenerate fixtures before authoring NFT tests",
        scope: "data",
        recommended_action: "Run fixture regeneration before test authoring.",
        importance: "high"
      })
    });
    await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "open-risk-entry"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionId,
        branch: "feat/recall",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        entry_type: "risk",
        summary: "Warm-start context is still too thin",
        lifecycle_state: "open"
      })
    });
    await app.request("/v1/rule-checks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "blocked-rule-check"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionId,
        rule_id: "always_test",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        status: "blocked",
        note: "Test command is still missing"
      })
    });

    const nextSessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "fresh-session"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/recall",
        workspace_path: "/repo/buzz",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex-main",
        goal: "Resume with context"
      })
    });

    expect(nextSessionResponse.status).toBe(201);
    const payload = await nextSessionResponse.json();
    expect(payload.data.recall.scope.project_id).toBe("buzz");
    expect(payload.data.recall.scope.branch).toBe("feat/recall");
    expect(payload.data.recall.guidance).toEqual([]);
    expect(payload.data.recall.open_threads).toHaveLength(1);
    expect(payload.data.recall.open_threads[0].kind).toBe("entry");
    expect(payload.data.recall.review_required).toBe(2);
    expect(payload.data).not.toHaveProperty("startup_summary");
    expect(payload.data).not.toHaveProperty("context");
  });

  it("stores rule checks and returns a missing-rule reminder plus session listing", async () => {
    const app = createTestApp();
    await createProject(app);
    await app.request("/v1/projects/buzz/ruleset", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        rules: [
          {
            rule_id: "always_test",
            label: "Always test",
            description: "Run tests before closing work.",
            severity: "required",
            check_mode: "command_reference_required"
          },
          {
            rule_id: "always_review",
            label: "Always review",
            description: "Review changes before closing work.",
            severity: "required",
            check_mode: "manual_confirm"
          }
        ]
      })
    });

    const sessionResponse = await app.request("/v1/sessions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "rules-session"
      },
      body: JSON.stringify({
        project_id: "buzz",
        branch: "feat/rules",
        workspace_path: "/repo/buzz",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex-main",
        goal: "Check rules"
      })
    });
    const sessionPayload = await sessionResponse.json();

    const submitResponse = await app.request("/v1/rule-checks", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "rule-check-submit"
      },
      body: JSON.stringify({
        project_id: "buzz",
        session_id: sessionPayload.data.session.session_id,
        rule_id: "always_test",
        author_id: "codex-main",
        author_type: "agent",
        source: "mcp",
        status: "applied",
        evidence: "npm test"
      })
    });

    expect(submitResponse.status).toBe(201);
    const submitPayload = await submitResponse.json();
    expect(submitPayload.data.rule_check.rule_id).toBe("always_test");
    expect(submitPayload.data.reminder.missing_required_rules).toHaveLength(1);
    expect(submitPayload.data.reminder.missing_required_rules[0].rule_id).toBe("always_review");

    const listResponse = await app.request(
      `/v1/projects/buzz/rule-checks?session_id=${sessionPayload.data.session.session_id}`
    );
    expect(listResponse.status).toBe(200);
    const listPayload = await listResponse.json();
    expect(listPayload.data.rule_checks).toHaveLength(1);
    expect(listPayload.data.rule_checks[0].status).toBe("applied");
  });

  it("returns a validation error envelope when required fields are missing", async () => {
    const app = createTestApp();

    const response = await app.request("/v1/entries", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": "entry-key"
      },
      body: JSON.stringify({
        project_id: "buzz"
      })
    });

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
    expect(payload.meta.request_id).toBeTruthy();
  });
});

function createTestApp({ accessLogger = null } = {}) {
  const dataRoot = mkdtempSync(join(tmpdir(), "hivemind-api-"));
  roots.push(dataRoot);
  const storage = new FsJsonlStorage({ dataRoot });
  const service = new HiveMindService({ storage, version: "test-version" });
  return createApp({ service, accessLogger, adminToken: "test-admin-token" });
}

async function createProject(app, overrides = {}) {
  return app.request("/v1/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project",
      ...overrides
    })
  });
}

function adminHeaders() {
  return {
    "content-type": "application/json",
    authorization: "Bearer test-admin-token"
  };
}

async function openContext(app, { branch, feature }) {
  const response = await app.request("/v1/contexts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Idempotency-Key": `context-${branch}`
    },
    body: JSON.stringify({
      project_id: "buzz",
      branch,
      workspace_path: "/repo/buzz",
      feature,
      source_tool: "fixture-tool",
      tool_version: "7.43",
      environment: "local",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main"
    })
  });
  const payload = await response.json();
  return payload.data.context.context_token;
}
