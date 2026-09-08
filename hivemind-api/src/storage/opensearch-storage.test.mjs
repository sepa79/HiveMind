import { FakeOpenSearchClient, notFound } from "./test-support/fake-opensearch-client.mjs";
import { describe, expect, it, vi } from "vitest";
import { OpenSearchStorage } from "./opensearch-storage.mjs";

describe("OpenSearchStorage", () => {
  it("installs explicit recall mappings on existing indices and propagates mapping failure", async () => {
    const client = new FakeOpenSearchClient();
    for (const alias of ["sessions", "entries", "learnings"]) client.putSource(`test-${alias}`, "existing", {});
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    const mapping = vi.spyOn(client.indices, "putMapping");
    await storage.initialize();
    expect(mapping).toHaveBeenCalledWith({ index: "test-sessions", body: { properties: { feature: { type: "keyword" } } } });
    for (const alias of ["entries", "learnings"]) expect(mapping).toHaveBeenCalledWith({ index: `test-${alias}`, body: { properties: { applicability: { type: "object", enabled: false } } } });
    mapping.mockRejectedValueOnce(new Error("Mapping unavailable"));
    await expect(storage.initialize()).rejects.toThrow("Mapping unavailable");
  });

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

  it.each([
    { timed_out: true },
    { version_conflicts: 1 },
    { failures: [{ reason: "injected shard failure" }] },
    { total: 2, deleted: 1 },
    { deleted: undefined }
  ])("retains project metadata after an incomplete bulk delete: %j", async (partial) => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    await storage.createProject(projectFixture("alpha"));
    client.putSource("test-entries", "entry-alpha", { project_id: "alpha", entry_id: "entry-alpha" });
    const deletion = vi.spyOn(client, "deleteByQuery").mockResolvedValueOnce({
      body: { timed_out: false, version_conflicts: 0, failures: [], total: 0, deleted: 0, ...partial }
    });
    await expect(storage.deleteProject("alpha")).rejects.toMatchObject({
      status: 502, code: "STORAGE_DELETE_INCOMPLETE"
    });
    expect(deletion).toHaveBeenCalledTimes(1);
    expect(await storage.getProject("alpha")).toMatchObject({ project_id: "alpha" });
    expect(await storage.getRuleset("alpha")).not.toBeNull();
    // An explicit retry is allowed; no automatic recovery ran on the failed call.
    await storage.deleteProject("alpha");
    expect(await storage.getProject("alpha")).toBeNull();
    await expect(client.get({ index: "test-entries", id: "entry-alpha" })).rejects.toMatchObject({ meta: { statusCode: 404 } });
  });

  it.each(["search", "deleteByQuery"])("does not hide a missing collection index during %s", async (method) => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    await storage.createProject(projectFixture("alpha"));
    vi.spyOn(client, method).mockRejectedValueOnce(notFound());
    await expect(storage.deleteProject("alpha")).rejects.toMatchObject({ meta: { statusCode: 404 } });
    expect(await storage.getProject("alpha")).not.toBeNull();
  });

  it("retains merge provenance when source cleanup is incomplete and allows an explicit retry", async () => {
    const client = new FakeOpenSearchClient();
    const storage = new OpenSearchStorage({ client, indexPrefix: "test" });
    await storage.createProject(projectFixture("alpha"));
    await storage.createProject(projectFixture("legacy"));
    client.putSource("test-entries", "entry-legacy", { project_id: "legacy", entry_id: "entry-legacy" });
    vi.spyOn(client, "deleteByQuery").mockResolvedValueOnce({
      body: { timed_out: true, version_conflicts: 0, failures: [], total: 0, deleted: 0 }
    });
    await expect(storage.mergeProjects("legacy", "alpha", { standardProfileResolution: automaticProfileResolution() }))
      .rejects.toMatchObject({ code: "STORAGE_DELETE_INCOMPLETE" });
    expect(await storage.getProject("legacy")).not.toBeNull();
    await expect(storage.deleteProject("alpha")).rejects.toMatchObject({ code: "PROJECT_MERGE_IN_PROGRESS" });
    const merged = await storage.mergeProjects("legacy", "alpha", { standardProfileResolution: automaticProfileResolution() });
    expect(merged.moved_counts.entries).toBe(1);
    expect(await storage.getProject("legacy")).toBeNull();
    expect(await storage.getEntry("alpha", "entry-legacy")).toMatchObject({ project_id: "alpha" });
  });

  it("logs project delete stages and totals", async () => {
    const client = new FakeOpenSearchClient();
    const logLines = [];
    const storage = new OpenSearchStorage({ client, indexPrefix: "test", logger: (line) => logLines.push(JSON.parse(line)) });
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
        goal: "Delete with logging"
      },
      { idempotencyKey: "delete-log-session" }
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
        summary: "Delete me with logs"
      },
      { idempotencyKey: "delete-log-entry" }
    );

    await storage.deleteProject("alpha", { reason: "cleanup" });

    expect(logLines[0]).toMatchObject({
      event: "project_delete_started",
      project_id: "alpha",
      reason: "cleanup"
    });
    expect(logLines.find((entry) => entry.event === "project_delete_stage" && entry.collection === "entries")).toMatchObject({
      deleted_count: 1,
      mode: "delete_by_query"
    });
    expect(logLines.find((entry) => entry.event === "project_delete_stage" && entry.collection === "projects")).toMatchObject({
      deleted_count: 1,
      mode: "delete_document"
    });
    expect(logLines.at(-1)).toMatchObject({
      event: "project_delete_completed",
      project_id: "alpha",
      deleted_counts: {
        entries: 1,
        sessions: 1,
        rules: 0
      }
    });
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

function automaticProfileResolution({ source = null, target = null, result = source ?? target } = {}) {
  return {
    source_profile_ref: source,
    target_profile_ref: target,
    strategy: "automatic",
    result_profile_ref: result
  };
}

function projectFixture(id) {
  return { project_id: id, name: id, repository_url: `https://github.com/example/${id}.git`,
    repository_slug: `example/${id}`, root_path: `/repo/${id}`, default_branch: "main", description: "Test project" };
}
