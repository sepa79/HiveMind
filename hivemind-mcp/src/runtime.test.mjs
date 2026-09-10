import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { HiveMindService } from "../../hivemind-api/src/app/service.mjs";
import { createApp } from "../../hivemind-api/src/http/app.mjs";
import { FsJsonlStorage } from "../../hivemind-api/src/storage/fs-jsonl-storage.mjs";
import { HiveMindApiClient, HiveMindApiClientError } from "./api-client.mjs";
import { createHiveMindRuntime } from "./runtime.mjs";

const serverSource = () => readFileSync(new URL("./server.mjs", import.meta.url), "utf8");

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("HiveMind MCP runtime", () => {
  it("registers MCP tools with VS Code compatible names", () => {
    const source = serverSource();
    const toolNames = [...source.matchAll(/server\.registerTool\(\s*\n\s*"([^"]+)"/g)].map((match) => match[1]);

    expect(toolNames.length).toBeGreaterThan(0);
    expect(toolNames.every((name) => /^[a-z0-9_-]+$/.test(name))).toBe(true);
    expect(toolNames).toContain("backend_list");
    expect(toolNames).toContain("health_check");
    expect(toolNames).toContain("project_register");
    expect(toolNames).toContain("project_list");
    expect(toolNames).toContain("project_resolve");
    expect(toolNames).toContain("session_start");
    expect(toolNames).toContain("entry_append");
    expect(toolNames).toContain("entry_mark");
    expect(toolNames).toContain("entry_correct");
    expect(toolNames).toContain("learning_resolve");
    expect(toolNames).toContain("project_review");
    expect(toolNames).toContain("hivemind_feedback");
    expect(toolNames).toContain("admin_memory_review");
    expect(toolNames).toContain("admin_project_delete");
    expect(toolNames).toContain("admin_project_merge");
    expect(toolNames).toContain("ruleset_catalog_list");
    expect(toolNames).toContain("ruleset_catalog_get");
    expect(toolNames).toContain("guidance_check");
    expect(toolNames).toContain("project_standard_profile_define");
    expect(toolNames).toContain("project_standard_marker_update");
  });

  it("exposes reason only on admin project deletion, not feature listing", () => {
    const source = serverSource();

    expect(toolSourceBlock(source, "feature_list")).not.toContain("reason: z.string().optional()");
    expect(toolSourceBlock(source, "admin_project_delete")).toContain("reason: z.string().optional()");
    expect(toolSourceBlock(source, "admin_project_merge")).toContain('z.literal("prefer_source")');
    expect(toolSourceBlock(source, "admin_project_merge")).toContain('z.literal("prefer_target")');
    expect(toolSourceBlock(source, "admin_project_merge")).toContain('z.literal("set")');
  });

  it("protects exactly the admin tools with MCP admin authorization", () => {
    const source = serverSource();

    expect(toolSourceBlock(source, "admin_memory_review")).toContain("protectAdminTool(");
    expect(toolSourceBlock(source, "admin_project_delete")).toContain("protectAdminTool(");
    expect(toolSourceBlock(source, "admin_project_merge")).toContain("protectAdminTool(");
    expect(toolSourceBlock(source, "project_list")).not.toContain("protectAdminTool(");
    expect(toolSourceBlock(source, "entry_append")).not.toContain("protectAdminTool(");
  });

  it("reports the MCP server version from the package manifest", () => {
    const source = serverSource();

    expect(source).toContain('new URL("../package.json", import.meta.url)');
    expect(source).toContain("version: packageJson.version");
    expect(source).not.toContain('version: "0.1.0"');
  });

  it("includes backend config in the packed MCP package file list", () => {
    const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

    expect(manifest.files).toContain("src/admin-auth.mjs");
    expect(manifest.files).toContain("src/backend-config.mjs");
  });

  it("health.check reports configured API health through MCP", async () => {
    const runtime = createRuntime();

    const result = await runtime.healthCheck({ timeout_ms: 1000 });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      status: "ok",
      reachable: true,
      api_base_url: "http://hivemind.test",
      api: {
        status: "ok",
        service: "hivemind-api"
      }
    });
    expect(result.structuredContent.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("health.check returns an unreachable diagnostic instead of hiding transport failures", async () => {
    const runtime = createHiveMindRuntime({
      apiClient: {
        baseUrl: "http://hivemind-api:4010",
        async healthCheck() {
          throw new HiveMindApiClientError({
            status: 0,
            code: "API_TRANSPORT_FAILED",
            message: "fetch failed",
            details: {
              method: "GET",
              url: "http://hivemind-api:4010/health",
              attempts: 1,
              cause: {
                code: "ENOTFOUND"
              }
            },
            meta: {}
          });
        }
      }
    });

    const result = await runtime.healthCheck();

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({
      status: "unreachable",
      reachable: false,
      api_base_url: "http://hivemind-api:4010",
      error: {
        code: "API_TRANSPORT_FAILED",
        message: "fetch failed",
        details: {
          method: "GET",
          url: "http://hivemind-api:4010/health",
          attempts: 1,
          cause: {
            code: "ENOTFOUND"
          }
        }
      }
    });
  });

  it("health.check returns a structured error for an unknown backend id", async () => {
    const runtime = createRuntimeWithBackends(["default", "skippybot"]);

    const result = await runtime.healthCheck({
      backend_id: "missing"
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe("MCP_BACKEND_NOT_FOUND");
  });

  it("project.register calls the API and returns structured content", async () => {
    const runtime = createRuntime();

    const result = await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.project.project_id).toBe("buzz");
  });

  it("project.register returns the canonical lowercase repository name as project id", async () => {
    const runtime = createRuntime();

    const result = await runtime.projectRegister({
      project_id: "sepa79/SkippyBot",
      name: "SkippyBot",
      repository_url: "https://github.com/sepa79/SkippyBot.git",
      repository_slug: "sepa79/SkippyBot",
      root_path: "/repo/SkippyBot",
      default_branch: "main",
      description: "SkippyBot project"
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.project.project_id).toBe("skippybot");
    expect(result.structuredContent.project.name).toBe("SkippyBot");
  });

  it("project.list and project.resolve expose registered project discovery", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });

    const listed = await runtime.projectList({});
    const resolved = await runtime.projectResolve({
      repository_url: "https://github.com/example/buzz",
      workspace_path: "/local/not-buzz"
    });

    expect(listed.isError).toBeUndefined();
    expect(listed.structuredContent.projects.map((project) => project.project_id)).toEqual(["buzz"]);
    expect(resolved.isError).toBeUndefined();
    expect(resolved.structuredContent.status).toBe("matched");
    expect(resolved.structuredContent.project.project_id).toBe("buzz");
  });

  it("lists and resolves projects across configured backends", async () => {
    const runtime = createRuntimeWithBackends(["default", "skippybot"]);
    await runtime.projectRegister({
      backend_id: "default",
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });
    await runtime.projectRegister({
      backend_id: "skippybot",
      project_id: "skippybot",
      name: "SkippyBot",
      repository_url: "https://github.com/example/skippybot.git",
      repository_slug: "example/skippybot",
      root_path: "/repo/skippybot",
      default_branch: "main",
      description: "SkippyBot project"
    });

    const backends = await runtime.backendList({});
    const listed = await runtime.projectList({});
    const resolved = await runtime.projectResolve({
      repository_slug: "example/skippybot"
    });

    expect(backends.structuredContent.backends.map((backend) => backend.backend_id)).toEqual(["default", "skippybot"]);
    expect(listed.isError).toBeUndefined();
    expect(listed.structuredContent.projects.map((project) => [project.backend_id, project.project_id])).toEqual([
      ["default", "buzz"],
      ["skippybot", "skippybot"]
    ]);
    expect(resolved.isError).toBeUndefined();
    expect(resolved.structuredContent.backend_id).toBe("skippybot");
    expect(resolved.structuredContent.project.project_id).toBe("skippybot");
  });

  it("fails when duplicate project ids exist across configured backends", async () => {
    const runtime = createRuntimeWithBackends(["default", "skippybot"]);
    for (const backend_id of ["default", "skippybot"]) {
      await runtime.projectRegister({
        backend_id,
        project_id: "buzz",
        name: `Buzz ${backend_id}`,
        repository_url: "https://github.com/example/buzz.git",
        repository_slug: "example/buzz",
        root_path: `/repo/${backend_id}/buzz`,
        default_branch: "main",
        description: "Duplicate project"
      });
    }

    const listed = await runtime.projectList({});
    const session = await runtime.sessionStart({
      project_id: "buzz",
      branch: "main",
      workspace_path: "/repo/buzz",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Ambiguous session"
    });

    expect(listed.isError).toBe(true);
    expect(listed.structuredContent.error.code).toBe("MCP_BACKEND_DUPLICATE_PROJECT");
    expect(session.isError).toBe(true);
    expect(session.structuredContent.error.code).toBe("MCP_BACKEND_AMBIGUOUS");
  });

  it("routes mutating project tools to the unique backend containing the project", async () => {
    const runtime = createRuntimeWithBackends(["default", "skippybot"]);
    await runtime.projectRegister({
      backend_id: "skippybot",
      project_id: "skippybot",
      name: "SkippyBot",
      repository_url: "https://github.com/example/skippybot.git",
      repository_slug: "example/skippybot",
      root_path: "/repo/skippybot",
      default_branch: "main",
      description: "SkippyBot project"
    });

    const session = await runtime.sessionStart({
      project_id: "skippybot",
      branch: "main",
      workspace_path: "/repo/skippybot",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Route session"
    });
    const listedDefault = await runtime.projectList({ backend_id: "default" });
    const listedSkippybot = await runtime.projectList({ backend_id: "skippybot" });

    expect(session.isError).toBeUndefined();
    expect(recallData(session).session.project_id).toBe("skippybot");
    expect(listedDefault.structuredContent.projects).toHaveLength(0);
    expect(listedSkippybot.structuredContent.projects).toHaveLength(1);
  });

  it("remembers context and session routes created by the same MCP runtime", async () => {
    const runtime = createRuntimeWithBackends(["default", "skippybot"]);
    await runtime.projectRegister({
      backend_id: "skippybot",
      project_id: "skippybot",
      name: "SkippyBot",
      repository_url: "https://github.com/example/skippybot.git",
      repository_slug: "example/skippybot",
      root_path: "/repo/skippybot",
      default_branch: "main",
      description: "SkippyBot project"
    });
    const opened = await runtime.contextOpen({
      project_id: "skippybot",
      branch: "main",
      workspace_path: "/repo/skippybot",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main"
    });
    const started = await runtime.sessionStart({
      project_id: "skippybot",
      branch: "main",
      workspace_path: "/repo/skippybot",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Route session"
    });

    const context = await runtime.contextGet({
      context_token: recallData(opened).context.context_token
    });
    const currentSession = await runtime.sessionGet({ session_id: recallData(started).session.session_id });
    expect(currentSession.isError).toBeUndefined();
    expect(currentSession.structuredContent).toEqual({ session: recallData(started).session });
    const ended = await runtime.sessionEnd({
      session_id: recallData(started).session.session_id
    });

    expect(context.isError).toBeUndefined();
    expect(context.structuredContent.context.project_id).toBe("skippybot");
    expect(ended.isError).toBeUndefined();
    expect(ended.structuredContent.session.project_id).toBe("skippybot");
  });

  it("admin memory review spans configured backends when projects are unique", async () => {
    const runtime = createRuntimeWithBackends(["default", "skippybot"]);
    await runtime.projectRegister({
      backend_id: "default",
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });
    await runtime.projectRegister({
      backend_id: "skippybot",
      project_id: "skippybot",
      name: "SkippyBot",
      repository_url: "https://github.com/example/skippybot.git",
      repository_slug: "example/skippybot",
      root_path: "/repo/skippybot",
      default_branch: "main",
      description: "SkippyBot project"
    });

    const review = await runtime.adminMemoryReview({});

    expect(review.isError).toBeUndefined();
    expect(review.structuredContent.project_reviews.map((item) => [item.backend_id, item.project.project_id])).toEqual([
      ["default", "buzz"],
      ["skippybot", "skippybot"]
    ]);
  });

  it("lists catalog profiles, stores a standard marker, and checks standardization guidance", async () => {
    const runtime = createRuntime();
    const workspacePath = mkdtempSync(join(tmpdir(), "hivemind-standard-workspace-"));
    roots.push(workspacePath);
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project",
      standard_profile_ref: "aws-microservice@v3"
    });

    const catalog = await runtime.rulesetCatalogList({});
    const profile = await runtime.rulesetCatalogGet({
      profile_id: "aws-microservice",
      version: "v3",
      include_files: true
    });
    for (const file of profile.structuredContent.files) {
      const targetPath = join(workspacePath, file.target);
      mkdirSync(dirname(targetPath), { recursive: true });
      writeFileSync(targetPath, file.required ? `custom-${file.sha256}` : file.content, "utf8");
    }
    const updatedMarker = await runtime.projectStandardMarkerUpdate({
      project_id: "buzz",
      workspace_path: workspacePath
    });
    const guidance = await runtime.guidanceCheck({
      project_id: "buzz"
    });

    expect(catalog.isError).toBeUndefined();
    expect(catalog.structuredContent.profiles.map((item) => item.profile_ref)).toContain("aws-microservice@v3");
    expect(profile.structuredContent.files.some((file) => file.target === "AGENTS.md")).toBe(true);
    expect(updatedMarker.isError).toBeUndefined();
    expect(updatedMarker.structuredContent.standard_marker.profile_ref).toBe("aws-microservice@v3");
    expect(guidance.structuredContent.recommended_action).toBe("current");
    expect(guidance.structuredContent.marker_source).toBe("stored");
  });

  it("feature.list/add/remove/rename manages the project feature vocabulary", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });

    await runtime.featureAdd({
      project_id: "buzz",
      feature: "SMARTER_NFT_TESTS"
    });
    await runtime.featureAdd({
      project_id: "buzz",
      feature: "LEGACY_TESTS"
    });

    const listed = await runtime.featureList({
      project_id: "buzz"
    });
    const renamed = await runtime.featureRename({
      project_id: "buzz",
      feature: "SMARTER_NFT_TESTS",
      new_feature: "SMARTER_NFT_COVERAGE"
    });
    const removed = await runtime.featureRemove({
      project_id: "buzz",
      feature: "LEGACY_TESTS"
    });

    expect(listed.isError).toBeUndefined();
    expect(listed.structuredContent.features).toEqual(["SMARTER_NFT_TESTS", "LEGACY_TESTS"]);
    expect(renamed.structuredContent.features).toEqual(["SMARTER_NFT_COVERAGE", "LEGACY_TESTS"]);
    expect(removed.structuredContent.features).toEqual(["SMARTER_NFT_COVERAGE"]);
  });

  it("rules.define and rules.get round-trip the active ruleset", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });

    const defineResult = await runtime.rulesDefine({
      project_id: "buzz",
      rules: [
        {
          rule_id: "always_test",
          label: "Always test",
          description: "Run tests before closing work.",
          severity: "required",
          check_mode: "command_reference_required"
        }
      ]
    });
    const getResult = await runtime.rulesGet({
      project_id: "buzz"
    });

    expect(defineResult.isError).toBeUndefined();
    expect(defineResult.structuredContent.ruleset.version).toBe(1);
    expect(getResult.structuredContent.ruleset.rules[0].rule_id).toBe("always_test");
  });

  it("context.open, context.get, context.update, and context.close round-trip a durable context token", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });

    const opened = await runtime.contextOpen({
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
    });
    const contextToken = recallData(opened).context.context_token;

    const fetched = await runtime.contextGet({
      context_token: contextToken
    });
    const updated = await runtime.contextUpdate({
      context_token: contextToken,
      feature: "SMARTER_NFT_TESTS",
      tool_version: "7.44"
    });
    const closed = await runtime.contextClose({
      context_token: contextToken
    });

    expect(opened.isError).toBeUndefined();
    expect(recallData(opened).recall.scope.project_id).toBe("buzz");
    expect(recallData(opened).recall.scope.branch).toBe("feat/context");
    expect(fetched.structuredContent.context.context_token).toBe(contextToken);
    expect(updated.structuredContent.context.feature).toBe("SMARTER_NFT_TESTS");
    expect(updated.structuredContent.context.tool_version).toBe("7.44");
    expect(closed.structuredContent.context.status).toBe("closed");
  });

  it("learning.capture and learning.get_recent/search use context tokens instead of repeated project metadata", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });

    const currentContext = await runtime.contextOpen({
      project_id: "buzz",
      branch: "feat/nft",
      workspace_path: "/repo/buzz",
      feature: "SMARTER_NFT_TESTS",
      source_tool: "fixture-tool",
      tool_version: "7.43",
      environment: "local",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main"
    });
    const legacyContext = await runtime.contextOpen({
      project_id: "buzz",
      branch: "feat/legacy",
      workspace_path: "/repo/buzz",
      feature: "LEGACY_TESTS",
      source_tool: "fixture-tool",
      tool_version: "7.43",
      environment: "local",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main"
    });

    const currentToken = recallData(currentContext).context.context_token;
    const legacyToken = recallData(legacyContext).context.context_token;

    const captured = await runtime.learningCapture({
      context_token: currentToken,
      summary: "Regenerate fixtures before authoring NFT tests",
      details: "Scenario Builder reuses stale fixture schema unless fixtures are refreshed first.",
      scope: "data",
      recommended_action: "Run fixture regeneration before test authoring.",
      importance: "high",
      tags: ["nft", "fixtures"]
    });
    await runtime.learningCapture({
      context_token: currentToken,
      summary: "Pin worker count to 1 for local Scenario Builder runs",
      scope: "env",
      recommended_action: "Use one worker locally to avoid flaky port allocation."
    });
    await runtime.learningCapture({
      context_token: legacyToken,
      summary: "Legacy fixture workaround is obsolete in v7.44",
      scope: "workflow",
      recommended_action: "Upgrade to v7.44 instead of using the old branch patch.",
      status: "resolved"
    });
    await runtime.learningFeedback({
      context_token: currentToken,
      learning_id: captured.structuredContent.learning.learning_id,
      feedback_type: "confirm",
      comment: "Confirmed on local runs."
    });

    const recent = await runtime.learningGetRecent({
      context_token: currentToken
    });
    const search = await runtime.learningSearch({
      context_token: currentToken,
      query: "legacy",
      status: "resolved"
    });

    expect(captured.isError).toBeUndefined();
    expect(captured.structuredContent.learning.context.feature).toBe("SMARTER_NFT_TESTS");
    expect(recent.structuredContent.learnings).toHaveLength(2);
    expect(recent.structuredContent.learnings[0].feedback_summary.confirm_count).toBe(1);
    expect(recent.structuredContent.learnings.every((learning) => learning.context.feature === "SMARTER_NFT_TESTS")).toBe(
      true
    );
    expect(search.structuredContent.learnings).toHaveLength(1);
    expect(search.structuredContent.learnings[0].context.feature).toBe("LEGACY_TESTS");

    const resolved = await runtime.learningResolve({
      project_id: "buzz",
      context_token: currentToken,
      learning_id: captured.structuredContent.learning.learning_id,
      expected_revision: 0,
      reason: "The fixture regeneration is now built into the workflow.",
      evidence_refs: [{ kind: "repo_file", target: "test/fixtures.test.mjs" }],
      resolution_scope: "feature",
      idempotencyKey: "resolve-fixtures-learning"
    });
    expect(resolved.isError).toBeUndefined();
    expect(resolved.structuredContent.learning).toMatchObject({ status: "resolved", revision: 1 });
    expect(resolved.structuredContent.action.resolution_scope).toBe("feature");
  });

  it("issue.report/get/list/add_event expose tracked issue lifecycle through MCP-friendly payloads", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });

    const context = await runtime.contextOpen({
      project_id: "buzz",
      branch: "feat/issues",
      workspace_path: "/repo/buzz",
      feature: "SMARTER_NFT_TESTS",
      source_tool: "fixture-tool",
      tool_version: "7.43",
      environment: "local",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main"
    });
    const contextToken = recallData(context).context.context_token;

    const reported = await runtime.issueReport({
      context_token: contextToken,
      title: "Scenario Builder stale schema cache",
      summary: "Generated NFT scenarios fail until fixtures are regenerated.",
      severity: "high"
    });
    const issueId = reported.structuredContent.issue.issue_id;

    await runtime.issueAddEvent({
      context_token: contextToken,
      issue_id: issueId,
      event_type: "github_issue_linked",
      summary: "Linked upstream issue",
      github_issue_url: "https://github.com/acme/hivemind/issues/123"
    });
    await runtime.issueAddEvent({
      context_token: contextToken,
      issue_id: issueId,
      event_type: "fix_linked",
      summary: "Fixed in v7.44",
      version: "7.44"
    });
    await runtime.issueAddEvent({
      context_token: contextToken,
      issue_id: issueId,
      event_type: "verified_fixed",
      summary: "Verified in v7.44"
    });

    const fetched = await runtime.issueGet({
      context_token: contextToken,
      issue_id: issueId
    });
    const resolved = await runtime.issueList({
      context_token: contextToken,
      status: "resolved"
    });

    expect(reported.isError).toBeUndefined();
    expect(fetched.structuredContent.issue.status).toBe("resolved");
    expect(fetched.structuredContent.issue.github_issue_url).toBe("https://github.com/acme/hivemind/issues/123");
    expect(fetched.structuredContent.events).toHaveLength(4);
    expect(resolved.structuredContent.issues).toHaveLength(1);
    expect(resolved.structuredContent.issues[0].issue_id).toBe(issueId);
  });

  it("context.get_project_brief/get_branch_brief/get_open_threads return bounded read models", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });
    await runtime.rulesDefine({
      project_id: "buzz",
      rules: [
        {
          rule_id: "always_test",
          label: "Always test",
          description: "Run tests before closing work.",
          severity: "required",
          check_mode: "command_reference_required"
        }
      ]
    });
    await runtime.featureAdd({
      project_id: "buzz",
      feature: "SMARTER_NFT_TESTS"
    });

    const session = await runtime.sessionStart({
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
        target: "docs/plans/context-learning-issue-slice.md",
        label: "Plan",
        source: "agent_plan"
      }
    });
    const context = await runtime.contextOpen({
      project_id: "buzz",
      branch: "feat/brief",
      workspace_path: "/repo/buzz",
      feature: "SMARTER_NFT_TESTS",
      source_tool: "fixture-tool",
      tool_version: "7.43",
      environment: "local",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main"
    });
    const contextToken = recallData(context).context.context_token;

    await runtime.entryAppend({
      project_id: "buzz",
      session_id: recallData(session).session.session_id,
      branch: "feat/brief",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      entry_type: "decision",
      summary: "Keep API contracts in one schema file",
      importance: "high"
    });
    await runtime.entryAppend({
      project_id: "buzz",
      session_id: recallData(session).session.session_id,
      branch: "feat/brief",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      entry_type: "risk",
      summary: "Warm-start still needs an explicit issue channel",
      lifecycle_state: "open"
    });
    await runtime.learningCapture({
      context_token: contextToken,
      summary: "Regenerate fixtures before authoring NFT tests",
      scope: "data",
      recommended_action: "Run fixture regeneration before test authoring.",
      importance: "high"
    });
    await runtime.issueReport({
      context_token: contextToken,
      title: "Scenario Builder fixture cache bug",
      summary: "NFT generation stays stale until fixtures are regenerated.",
      severity: "high"
    });
    await runtime.ruleCheckSubmit({
      project_id: "buzz",
      session_id: recallData(session).session.session_id,
      rule_id: "always_test",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      status: "blocked",
      note: "Test command is still missing"
    });

    const projectBrief = await runtime.contextGetProjectBrief({
      context_token: contextToken
    });
    const branchBrief = await runtime.contextGetBranchBrief({
      context_token: contextToken
    });
    const openThreads = await runtime.contextGetOpenThreads({
      context_token: contextToken
    });

    expect(projectBrief.isError).toBeUndefined();
    expect(recallData(projectBrief).open_threads.filter((item) => item.kind === "issue")).toHaveLength(1);
    expect(recallData(branchBrief).scope.branch).toBe("feat/brief");
    expect(recallData(openThreads).open_threads.map((thread) => thread.kind)).toEqual(["issue"]);
    expect(recallData(openThreads).view).toBe("threads");
  });

  it("session.start returns bounded warm-start context", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });
    await runtime.rulesDefine({
      project_id: "buzz",
      rules: [
        {
          rule_id: "always_test",
          label: "Always test",
          description: "Run tests before closing work.",
          severity: "required",
          check_mode: "command_reference_required"
        }
      ]
    });
    await runtime.featureAdd({
      project_id: "buzz",
      feature: "SMARTER_NFT_TESTS"
    });

    const seed = await runtime.sessionStart({
      project_id: "buzz",
      branch: "feat/start",
      workspace_path: "/repo/buzz",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Seed recall context"
    });
    const recallContext = await runtime.contextOpen({
      project_id: "buzz",
      branch: "feat/start",
      workspace_path: "/repo/buzz",
      feature: "SMARTER_NFT_TESTS",
      source_tool: "fixture-tool",
      tool_version: "7.43",
      environment: "local",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main"
    });
    await runtime.learningCapture({
      context_token: recallData(recallContext).context.context_token,
      summary: "Regenerate fixtures before authoring NFT tests",
      scope: "data",
      recommended_action: "Run fixture regeneration before test authoring.",
      importance: "high"
    });
    await runtime.entryAppend({
      project_id: "buzz",
      session_id: recallData(seed).session.session_id,
      branch: "feat/start",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      entry_type: "decision",
      summary: "Persist important architecture choices",
      importance: "high"
    });
    await runtime.entryAppend({
      project_id: "buzz",
      session_id: recallData(seed).session.session_id,
      branch: "feat/start",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      entry_type: "risk",
      summary: "Warm-start context was previously empty",
      lifecycle_state: "open"
    });
    await runtime.ruleCheckSubmit({
      project_id: "buzz",
      session_id: recallData(seed).session.session_id,
      rule_id: "always_test",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      status: "blocked",
      note: "Test command is not available yet"
    });

    const result = await runtime.sessionStart({
      project_id: "buzz",
      branch: "feat/start",
      workspace_path: "/repo/buzz",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Start a session"
    });

    expect(result.isError).toBeUndefined();
    expect(recallData(result).session.session_id).not.toBe(recallData(seed).session.session_id);
    expect(recallData(result).recall.scope.project_id).toBe("buzz");
    expect(recallData(result).recall.scope.branch).toBe("feat/start");
    expect(recallData(result).recall.guidance).toEqual([]);
    expect(recallData(result).recall.open_threads).toHaveLength(1);
    expect(recallData(result).recall.open_threads[0].kind).toBe("entry");
    expect(recallData(result).recall.review_required).toBeGreaterThanOrEqual(2);
    expect(recallData(result).session.session_id).toMatch(/^sess-/);
  });

  it("forwards applicability and feature through REST and emits one bounded recall copy", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({ project_id: "buzz", name: "Buzz", repository_url: "https://github.com/example/buzz.git", repository_slug: "example/buzz", root_path: "/repo/buzz", default_branch: "main" });
    const input = { project_id: "buzz", branch: "main", feature: "API", workspace_path: "/repo/buzz", author_id: "codex", author_type: "agent", source: "mcp", agent_id: "codex", goal: "Recall contract" };
    const started = recallData(await runtime.sessionStart({ ...input, idempotencyKey: "recall-session" }));
    expect(started.session.feature).toBe("API");
    const applicability = { state: "current", scope: "feature", reason: "Verified API contract", evidence_refs: [{ kind: "repo_file", target: "README.md" }] };
    const entry = await runtime.entryAppend({ ...input, session_id: started.session.session_id, entry_type: "decision", summary: "API owns contracts", lifecycle_state: "resolved", applicability });
    expect(entry.structuredContent.entry.applicability).toEqual(applicability);
    const recalled = recallData(await runtime.sessionStart({ ...input, idempotencyKey: "recall-session" }));
    expect(recalled.session.session_id).toBe(started.session.session_id);
    expect(recalled.recall.guidance.map((item) => item.id)).toEqual([entry.structuredContent.entry.entry_id]);
    for (let n = 0; n < 12; n += 1) {
      await runtime.entryAppend({ ...input, session_id: started.session.session_id, entry_type: "decision", summary: `Long ${n}: ${"🧠".repeat(400)}`, applicability });
    }
    const bounded = recallData(await runtime.sessionStart({ ...input, idempotencyKey: "recall-session" }));
    expect(bounded.recall.truncated).toBe(true);
    expect(bounded.recall.counts.guidance).toBe(13);
    expect(bounded.recall.guidance.length).toBeLessThanOrEqual(8);
  });

  it("session.get exposes a missing-session API error", async () => {
    const runtime = createRuntime();
    const result = await runtime.sessionGet({ session_id: "missing-session" });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe("SESSION_NOT_FOUND");
  });

  it("session.end closes the session and returns closeout reminders", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });
    await runtime.rulesDefine({
      project_id: "buzz",
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
    });

    const session = await runtime.sessionStart({
      project_id: "buzz",
      branch: "feat/closeout",
      workspace_path: "/repo/buzz",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Close out work"
    });
    const context = await runtime.contextOpen({
      project_id: "buzz",
      branch: "feat/closeout",
      workspace_path: "/repo/buzz",
      feature: "SMARTER_NFT_TESTS",
      source_tool: "fixture-tool",
      tool_version: "7.43",
      environment: "local",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main"
    });
    await runtime.learningCapture({
      context_token: recallData(context).context.context_token,
      summary: "Regenerate fixtures before authoring NFT tests",
      scope: "data",
      recommended_action: "Run fixture regeneration before test authoring.",
      importance: "high"
    });
    await runtime.ruleCheckSubmit({
      project_id: "buzz",
      session_id: recallData(session).session.session_id,
      rule_id: "always_test",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      status: "applied",
      evidence: "npm run test:hivemind"
    });

    const ended = await runtime.sessionEnd({
      session_id: recallData(session).session.session_id,
      status: "completed"
    });

    expect(ended.isError).toBeUndefined();
    expect(ended.structuredContent.session.status).toBe("completed");
    expect(ended.structuredContent.closeout.goal).toBe("Close out work");
    expect(ended.structuredContent.closeout.activity_counts.rule_checks).toBe(1);
    expect(ended.structuredContent.closeout.missing_required_rules).toHaveLength(1);
    expect(ended.structuredContent.closeout.missing_required_rules[0].rule_id).toBe("always_review");
    expect(ended.structuredContent.closeout.active_learning_count).toBe(1);
  });

  it("entry.append maps validation errors cleanly", async () => {
    const runtime = createRuntime();

    const result = await runtime.entryAppend({
      project_id: "buzz",
      session_id: "missing",
      branch: "feat/start",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      entry_type: "decision",
      summary: "Should fail"
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent.error.code).toBe("PROJECT_NOT_FOUND");
  });

  it("entry.search returns structured content usable by an agent", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });
    const session = await runtime.sessionStart({
      project_id: "buzz",
      branch: "feat/search",
      workspace_path: "/repo/buzz",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Search entries"
    });

    await runtime.entryAppend({
      project_id: "buzz",
      session_id: recallData(session).session.session_id,
      branch: "feat/search",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      entry_type: "decision",
      summary: "Useful search result",
      tags: ["mcp"]
    });

    const result = await runtime.entrySearch({
      project_id: "buzz",
      query: "useful"
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.entries).toHaveLength(1);
    expect(result.structuredContent.entries[0].summary).toBe("Useful search result");
  });

  it("entry.correct and project_review expose lifecycle cleanup through MCP", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });
    const session = await runtime.sessionStart({
      project_id: "buzz",
      branch: "feat/review",
      workspace_path: "/repo/buzz",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Review entries"
    });
    const original = await runtime.entryAppend({
      project_id: "buzz",
      session_id: recallData(session).session.session_id,
      branch: "feat/review",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      entry_type: "feedback",
      summary: "Outdated feedback",
      lifecycle_state: "open"
    });

    const correction = await runtime.entryCorrect({
      project_id: "buzz",
      entry_id: original.structuredContent.entry.entry_id,
      session_id: recallData(session).session.session_id,
      branch: "feat/review",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      summary: "Updated feedback"
    });
    const unclassified = await runtime.entryAppend({
      project_id: "buzz", session_id: recallData(session).session.session_id,
      branch: "feat/review", author_id: "codex-main", author_type: "agent", source: "mcp",
      entry_type: "decision", summary: "Decision requiring verification"
    });
    const current = await runtime.entryAppend({
      project_id: "buzz", session_id: recallData(session).session.session_id,
      branch: "feat/review", author_id: "codex-main", author_type: "agent", source: "mcp",
      entry_type: "decision", summary: "Implemented but still valid", lifecycle_state: "resolved",
      applicability: { state: "current", scope: "project", reason: "Verified code", evidence_refs: [{ kind: "repo_file", target: "README.md" }] }
    });
    const review = await runtime.projectReview({
      project_id: "buzz",
      branch: "feat/review"
    });

    expect(correction.isError).toBeUndefined();
    expect(correction.structuredContent.original_entry.lifecycle_state).toBe("superseded");
    expect(review.isError).toBeUndefined();
    expect(review.structuredContent.signals.open_feedback.map((entry) => entry.summary)).toContain("Updated feedback");
    expect(review.structuredContent.signals.review_queue.map(entry => entry.entry_id)).toEqual([unclassified.structuredContent.entry.entry_id]);
    expect(review.structuredContent.signals.recent_decisions.map(entry => entry.entry_id)).toEqual([current.structuredContent.entry.entry_id]);
    expect(review.structuredContent.recommended_actions.every(action => action.action_type === "review")).toBe(true);
    expect(JSON.parse(review.content[0].text)).toEqual(review.structuredContent);
  });

  it("rule_check.submit returns reminders and list_for_session returns stored checks", async () => {
    const runtime = createRuntime();
    await runtime.projectRegister({
      project_id: "buzz",
      name: "Buzz",
      repository_url: "https://github.com/example/buzz.git",
      repository_slug: "example/buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    });
    await runtime.rulesDefine({
      project_id: "buzz",
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
    });
    const session = await runtime.sessionStart({
      project_id: "buzz",
      branch: "feat/rules",
      workspace_path: "/repo/buzz",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      agent_id: "codex-main",
      goal: "Check rules"
    });

    const submit = await runtime.ruleCheckSubmit({
      project_id: "buzz",
      session_id: recallData(session).session.session_id,
      rule_id: "always_test",
      author_id: "codex-main",
      author_type: "agent",
      source: "mcp",
      status: "applied",
      evidence: "npm test"
    });
    const list = await runtime.ruleCheckListForSession({
      project_id: "buzz",
      session_id: recallData(session).session.session_id
    });

    expect(submit.isError).toBeUndefined();
    expect(submit.structuredContent.reminder.missing_required_rules).toHaveLength(1);
    expect(submit.structuredContent.reminder.missing_required_rules[0].rule_id).toBe("always_review");
    expect(list.structuredContent.rule_checks).toHaveLength(1);
    expect(list.structuredContent.rule_checks[0].rule_id).toBe("always_test");
  });
});

function toolSourceBlock(source, toolName) {
  const start = source.indexOf(`  "${toolName}",`);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = source.indexOf("\nserver.registerTool(", start + 1);
  return source.slice(start, end === -1 ? undefined : end);
}

function createRuntime() {
  const dataRoot = mkdtempSync(join(tmpdir(), "hivemind-mcp-"));
  roots.push(dataRoot);
  const storage = new FsJsonlStorage({ dataRoot });
  const service = new HiveMindService({ storage });
  const app = createApp({ service, adminToken: "test-admin-token" });
  const apiClient = new HiveMindApiClient({
    baseUrl: "http://hivemind.test",
    adminToken: "test-admin-token",
    fetchImpl: (input, init) => app.request(input, init)
  });
  return createHiveMindRuntime({ apiClient });
}

function createRuntimeWithBackends(backendIds) {
  const apiClients = backendIds.map((backendId) => {
    const dataRoot = mkdtempSync(join(tmpdir(), `hivemind-mcp-${backendId}-`));
    roots.push(dataRoot);
    const storage = new FsJsonlStorage({ dataRoot });
    const service = new HiveMindService({ storage });
    const app = createApp({ service, adminToken: "test-admin-token" });
    return {
      backend_id: backendId,
      apiClient: new HiveMindApiClient({
        baseUrl: `http://${backendId}.hivemind.test`,
        adminToken: "test-admin-token",
        fetchImpl: (input, init) => app.request(input, init)
      })
    };
  });
  return createHiveMindRuntime({ apiClients });
}

function recallData(result) {
  expect(result.isError).toBeUndefined();
  expect(result.structuredContent).toBeUndefined();
  expect(result.content).toHaveLength(1);
  expect(Buffer.byteLength(result.content[0].text, "utf8")).toBeLessThanOrEqual(8192);
  return JSON.parse(result.content[0].text);
}
