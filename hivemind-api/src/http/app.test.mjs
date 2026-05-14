import { mkdtempSync, rmSync } from "node:fs";
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

  it("lists registered projects for the human UI", async () => {
    const app = createTestApp();
    await createProject(app);

    const response = await app.request("/v1/projects");
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.data.projects.map((project) => project.project_id)).toEqual(["buzz"]);
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
    expect(listPayload.data.profiles.map((profile) => profile.profile_ref)).toContain("aws-microservice@v2");

    const bundleResponse = await app.request("/v1/ruleset-catalog/profiles/aws-microservice/versions/v2/bundle");
    expect(bundleResponse.status).toBe(200);
    const bundlePayload = await bundleResponse.json();
    expect(bundlePayload.data.manifest.profile_ref).toBe("aws-microservice@v2");
    expect(bundlePayload.data.files.some((file) => file.target === "AGENTS.md")).toBe(true);
  });

  it("assigns a project standard profile and reports guidance drift", async () => {
    const app = createTestApp();
    await createProject(app);

    const assignResponse = await app.request("/v1/projects/buzz/standard-profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ standard_profile_ref: "aws-microservice@v2" })
    });
    expect(assignResponse.status).toBe(200);
    const assignPayload = await assignResponse.json();
    expect(assignPayload.data.project.standard_profile_ref).toBe("aws-microservice@v2");

    const firstGuidanceResponse = await app.request("/v1/guidance/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project_id: "buzz" })
    });
    expect(firstGuidanceResponse.status).toBe(200);
    const firstGuidancePayload = await firstGuidanceResponse.json();
    expect(firstGuidancePayload.data.recommended_action).toBe("apply");
    expect(firstGuidancePayload.data.drift.every((file) => file.status === "missing")).toBe(true);

    const marker = {
      project_id: "buzz",
      profile_ref: "aws-microservice@v2",
      files: firstGuidancePayload.data.drift.map((file) => ({
        target: file.target,
        sha256: file.expected_sha256
      }))
    };
    const currentGuidanceResponse = await app.request("/v1/guidance/check", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project_id: "buzz", standard_marker: marker })
    });
    expect(currentGuidanceResponse.status).toBe(200);
    const currentGuidancePayload = await currentGuidanceResponse.json();
    expect(currentGuidancePayload.data.recommended_action).toBe("current");
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
    expect(openPayload.data.startup_summary.project_id).toBe("buzz");
    expect(openPayload.data.startup_summary.branch).toBe("feat/context");
    expect(openPayload.data.startup_summary.hint).toContain("learning.get_recent");

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
          target: "docs/plans/context-learning-issue-slice.md",
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

    expect(projectBriefPayload.data.latest_plan_ref.target).toBe("docs/plans/context-learning-issue-slice.md");
    expect(projectBriefPayload.data.active_issues).toHaveLength(1);
    expect(branchBriefPayload.data.branch).toBe("feat/brief");
    expect(openThreadsPayload.data.open_threads.some((thread) => thread.kind === "entry")).toBe(true);
    expect(openThreadsPayload.data.open_threads.some((thread) => thread.kind === "rule_check")).toBe(true);
    expect(openThreadsPayload.data.open_threads.some((thread) => thread.kind === "issue")).toBe(true);
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
    expect(sessionPayload.data.startup_summary.project_id).toBe("buzz");
    expect(sessionPayload.data.startup_summary.branch).toBe("feat/search");

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

  it("serves the human sessions UI", async () => {
    const app = createTestApp();

    const response = await app.request("/");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain("HiveMind");
    expect(html).toContain("/assets/hivemind-v2-mark.svg");
    expect(html).toContain('class="appShell"');
    expect(html).toContain('class="sideNav"');
    expect(html).toContain('select id="projectId"');
    expect(html).toContain('select id="branch"');
    expect(html).toContain('id="themeToggle"');
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

    const v2Response = await app.request("/assets/hivemind-v2-mark.svg");
    expect(v2Response.status).toBe(200);
    expect(v2Response.headers.get("content-type")).toContain("image/svg+xml");

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
    expect(payload.data.startup_summary.project_id).toBe("buzz");
    expect(payload.data.startup_summary.branch).toBe("feat/recall");
    expect(payload.data.startup_summary.counts.active_learnings).toBe(1);
    expect(payload.data.startup_summary.counts.open_threads).toBe(2);
    expect(payload.data.startup_summary.highlights.issues).toHaveLength(0);
    expect(payload.data.context.features).toEqual(["SMARTER_NFT_TESTS"]);
    expect(payload.data.context.recent_decisions).toHaveLength(1);
    expect(payload.data.context.recent_decisions[0].summary).toBe("Prefer storage adapter boundaries");
    expect(payload.data.context.recent_learnings).toHaveLength(1);
    expect(payload.data.context.recent_learnings[0].summary).toBe("Regenerate fixtures before authoring NFT tests");
    expect(payload.data.context.open_threads).toHaveLength(2);
    expect(payload.data.context.open_threads.some((thread) => thread.kind === "entry")).toBe(true);
    expect(payload.data.context.open_threads.some((thread) => thread.kind === "rule_check")).toBe(true);
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
  return createApp({ service, accessLogger });
}

async function createProject(app) {
  return app.request("/v1/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      project_id: "buzz",
      name: "Buzz",
      root_path: "/repo/buzz",
      default_branch: "main",
      description: "Buzz project"
    })
  });
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
