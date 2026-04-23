import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FsJsonlStorage } from "./fs-jsonl-storage.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("FsJsonlStorage", () => {
  it("keeps multiple projects isolated under one data root", async () => {
    const storage = createStorage();

    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    await storage.createProject({
      project_id: "beta",
      name: "Beta",
      root_path: "/repo/beta",
      default_branch: "main",
      description: "Beta project"
    });

    const alphaSession = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "feat/a",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Alpha session"
        },
        { idempotencyKey: "alpha-session" }
      )
    ).session;

    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: alphaSession.session_id,
        branch: "feat/a",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "alpha entry"
      },
      { idempotencyKey: "alpha-entry" }
    );

    const betaSearch = await storage.searchEntries({ project_id: "beta" });
    expect(betaSearch.entries).toHaveLength(0);
  });

  it("returns the same session when the same idempotency key is retried", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });

    const first = await storage.createSession(
      {
        project_id: "alpha",
        branch: "feat/a",
        workspace_path: "/repo/alpha",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Alpha session"
      },
      { idempotencyKey: "same-key" }
    );
    const second = await storage.createSession(
      {
        project_id: "alpha",
        branch: "feat/a",
        workspace_path: "/repo/alpha",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Alpha session"
      },
      { idempotencyKey: "same-key" }
    );

    expect(second.idempotent).toBe(true);
    expect(second.session.session_id).toBe(first.session.session_id);
  });

  it("manages a project feature vocabulary with cascading rename and explicit remove conflicts", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });

    await storage.addFeature("alpha", "SMARTER_NFT_TESTS");
    await storage.addFeature("alpha", "LEGACY_TESTS");
    const session = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "feat/a",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Feature vocabulary"
        },
        { idempotencyKey: "feature-session" }
      )
    ).session;
    const context = (
      await storage.openContext(
        {
          project_id: "alpha",
          branch: "feat/a",
          workspace_path: "/repo/alpha",
          feature: "SMARTER_NFT_TESTS",
          source_tool: "scenario-builder",
          tool_version: "7.43",
          environment: "local",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex"
        },
        { idempotencyKey: "feature-context" }
      )
    ).context;
    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: session.session_id,
        branch: "feat/a",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "Track the smarter NFT test work here",
        feature: "SMARTER_NFT_TESTS"
      },
      { idempotencyKey: "feature-entry" }
    );
    await storage.captureLearning(
      {
        context_token: context.context_token,
        summary: "Regenerate fixtures before authoring NFT tests",
        scope: "data",
        recommended_action: "Run fixture regeneration first."
      },
      { idempotencyKey: "feature-learning" }
    );

    await expect(storage.removeFeature("alpha", "SMARTER_NFT_TESTS")).rejects.toMatchObject({
      code: "FEATURE_IN_USE"
    });

    const renamed = await storage.renameFeature("alpha", "SMARTER_NFT_TESTS", "SMARTER_NFT_COVERAGE");
    const listed = await storage.listFeatures("alpha");
    const updatedContext = await storage.getContext(context.context_token);
    const searchEntries = await storage.searchEntries({
      project_id: "alpha",
      feature: "SMARTER_NFT_COVERAGE"
    });
    const searchLearnings = await storage.searchLearnings({
      context_token: context.context_token,
      feature: "SMARTER_NFT_COVERAGE"
    });

    expect(renamed.features).toEqual(["SMARTER_NFT_COVERAGE", "LEGACY_TESTS"]);
    expect(listed.features).toEqual(["SMARTER_NFT_COVERAGE", "LEGACY_TESTS"]);
    expect(updatedContext.feature).toBe("SMARTER_NFT_COVERAGE");
    expect(searchEntries.entries).toHaveLength(1);
    expect(searchEntries.entries[0].feature).toBe("SMARTER_NFT_COVERAGE");
    expect(searchLearnings.learnings).toHaveLength(1);
    expect(searchLearnings.learnings[0].context.feature).toBe("SMARTER_NFT_COVERAGE");

    const removed = await storage.removeFeature("alpha", "LEGACY_TESTS");
    expect(removed.features).toEqual(["SMARTER_NFT_COVERAGE"]);
  });

  it("opens, updates, gets, and closes a durable context token", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });

    const opened = await storage.openContext(
      {
        project_id: "alpha",
        branch: "feat/a",
        workspace_path: "/repo/alpha",
        feature: "NFT_TESTS",
        source_tool: "scenario-builder",
        tool_version: "7.43",
        environment: "local",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex"
      },
      { idempotencyKey: "context-open" }
    );

    const fetched = await storage.getContext(opened.context.context_token);
    const updated = await storage.updateContext(opened.context.context_token, {
      context_token: opened.context.context_token,
      feature: "SMARTER_NFT_TESTS",
      tool_version: "7.44"
    });
    const closed = await storage.closeContext(opened.context.context_token);

    expect(fetched?.context_token).toBe(opened.context.context_token);
    expect(updated.feature).toBe("SMARTER_NFT_TESTS");
    expect(updated.tool_version).toBe("7.44");
    expect(closed.status).toBe("closed");
    expect(closed.closed_at).toBeTruthy();
  });

  it("captures learnings via context tokens and returns recent project learnings", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });

    const currentContext = (
      await storage.openContext(
        {
          project_id: "alpha",
          branch: "feat/nft",
          workspace_path: "/repo/alpha",
          feature: "SMARTER_NFT_TESTS",
          source_tool: "scenario-builder",
          tool_version: "7.43",
          environment: "local",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex"
        },
        { idempotencyKey: "context-current" }
      )
    ).context;
    const legacyContext = (
      await storage.openContext(
        {
          project_id: "alpha",
          branch: "feat/legacy",
          workspace_path: "/repo/alpha",
          feature: "LEGACY_TESTS",
          source_tool: "scenario-builder",
          tool_version: "7.43",
          environment: "local",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex"
        },
        { idempotencyKey: "context-legacy" }
      )
    ).context;

    const first = await storage.captureLearning(
      {
        context_token: currentContext.context_token,
        summary: "Regenerate fixtures before authoring NFT tests",
        details: "Scenario Builder reuses stale fixture schema unless fixtures are refreshed first.",
        scope: "data",
        recommended_action: "Run fixture regeneration before test authoring.",
        importance: "high",
        tags: ["nft", "fixtures"]
      },
      { idempotencyKey: "learning-fixtures" }
    );
    const same = await storage.captureLearning(
      {
        context_token: currentContext.context_token,
        summary: "Regenerate fixtures before authoring NFT tests",
        details: "Scenario Builder reuses stale fixture schema unless fixtures are refreshed first.",
        scope: "data",
        recommended_action: "Run fixture regeneration before test authoring.",
        importance: "high",
        tags: ["nft", "fixtures"]
      },
      { idempotencyKey: "learning-fixtures" }
    );
    await storage.captureLearning(
      {
        context_token: currentContext.context_token,
        summary: "Pin worker count to 1 for local Scenario Builder runs",
        scope: "env",
        recommended_action: "Use one worker locally to avoid flaky port allocation."
      },
      { idempotencyKey: "learning-workers" }
    );
    await storage.captureLearning(
      {
        context_token: legacyContext.context_token,
        summary: "Legacy fixture workaround is obsolete in v7.44",
        scope: "workflow",
        recommended_action: "Upgrade to v7.44 instead of using the old branch patch.",
        status: "resolved"
      },
      { idempotencyKey: "learning-legacy" }
    );
    await storage.appendLearningFeedback(
      {
        context_token: currentContext.context_token,
        learning_id: first.learning.learning_id,
        feedback_type: "confirm",
        comment: "Worked on local fixtures too."
      },
      { idempotencyKey: "feedback-confirm" }
    );
    await storage.appendLearningFeedback(
      {
        context_token: currentContext.context_token,
        learning_id: first.learning.learning_id,
        feedback_type: "did_not_work",
        comment: "Did not help on stale remote cache."
      },
      { idempotencyKey: "feedback-did-not-work" }
    );

    const recent = await storage.getRecentLearnings({
      context_token: currentContext.context_token
    });
    const search = await storage.searchLearnings({
      context_token: currentContext.context_token,
      query: "legacy",
      status: "resolved"
    });

    expect(same.idempotent).toBe(true);
    expect(same.learning.learning_id).toBe(first.learning.learning_id);
    expect(recent.learnings).toHaveLength(2);
    expect(recent.learnings[0].summary).toBe("Regenerate fixtures before authoring NFT tests");
    expect(recent.learnings[0].feedback_summary.confirm_count).toBe(1);
    expect(recent.learnings[0].feedback_summary.did_not_work_count).toBe(1);
    expect(recent.learnings.every((learning) => learning.context.feature === "SMARTER_NFT_TESTS")).toBe(true);
    expect(search.learnings).toHaveLength(1);
    expect(search.learnings[0].context.feature).toBe("LEGACY_TESTS");
    expect(search.learnings[0].status).toBe("resolved");
  });

  it("tracks issue lifecycle events and filters active versus resolved issues", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });

    const context = (
      await storage.openContext(
        {
          project_id: "alpha",
          branch: "feat/issues",
          workspace_path: "/repo/alpha",
          feature: "SMARTER_NFT_TESTS",
          source_tool: "scenario-builder",
          tool_version: "7.43",
          environment: "local",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex"
        },
        { idempotencyKey: "issue-context" }
      )
    ).context;

    const reported = await storage.createIssue(
      {
        context_token: context.context_token,
        title: "Scenario Builder stale schema cache",
        summary: "Generated NFT scenarios fail until fixtures are regenerated.",
        details: "Observed during SMARTER_NFT_TESTS authoring on local fixtures.",
        severity: "high"
      },
      { idempotencyKey: "issue-report" }
    );
    await storage.appendIssueEvent(
      {
        context_token: context.context_token,
        issue_id: reported.issue.issue_id,
        event_type: "workaround_added",
        summary: "Regenerate fixtures before authoring tests",
        details: "This unblocks local authoring immediately."
      },
      { idempotencyKey: "issue-workaround" }
    );
    await storage.appendIssueEvent(
      {
        context_token: context.context_token,
        issue_id: reported.issue.issue_id,
        event_type: "github_issue_linked",
        summary: "Linked upstream GitHub issue",
        github_issue_url: "https://github.com/acme/pockethive/issues/123"
      },
      { idempotencyKey: "issue-github" }
    );
    await storage.appendIssueEvent(
      {
        context_token: context.context_token,
        issue_id: reported.issue.issue_id,
        event_type: "fix_linked",
        summary: "Fixed in v7.44",
        version: "7.44",
        branch: "release/7.44"
      },
      { idempotencyKey: "issue-fix" }
    );
    await storage.appendIssueEvent(
      {
        context_token: context.context_token,
        issue_id: reported.issue.issue_id,
        event_type: "verified_fixed",
        summary: "Verified on v7.44"
      },
      { idempotencyKey: "issue-verified" }
    );

    const fetched = await storage.getIssue(context.context_token, reported.issue.issue_id);
    const active = await storage.listIssues({
      context_token: context.context_token,
      status: "active"
    });
    const resolved = await storage.listIssues({
      context_token: context.context_token,
      status: "resolved"
    });

    expect(fetched.issue.status).toBe("resolved");
    expect(fetched.issue.github_issue_url).toBe("https://github.com/acme/pockethive/issues/123");
    expect(fetched.events).toHaveLength(5);
    expect(fetched.events.at(-1).event_type).toBe("verified_fixed");
    expect(active.issues).toHaveLength(0);
    expect(resolved.issues).toHaveLength(1);
    expect(resolved.issues[0].issue_id).toBe(reported.issue.issue_id);
  });

  it("builds project and branch briefs with active issues and open threads", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    await storage.upsertRuleset("alpha", {
      project_id: "alpha",
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

    const session = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "feat/brief",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Seed brief context",
          plan_ref: {
            kind: "file",
            target: "docs/plans/context-learning-issue-slice.md",
            label: "Plan",
            source: "agent_plan"
          }
        },
        { idempotencyKey: "brief-session" }
      )
    ).session;
    const context = (
      await storage.openContext(
        {
          project_id: "alpha",
          branch: "feat/brief",
          workspace_path: "/repo/alpha",
          feature: "SMARTER_NFT_TESTS",
          source_tool: "scenario-builder",
          tool_version: "7.43",
          environment: "local",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex"
        },
        { idempotencyKey: "brief-context" }
      )
    ).context;

    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: session.session_id,
        branch: "feat/brief",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "Keep API contracts in one schema file",
        importance: "high"
      },
      { idempotencyKey: "brief-decision" }
    );
    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: session.session_id,
        branch: "feat/brief",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "risk",
        summary: "Open thread for smarter NFT tests",
        lifecycle_state: "open"
      },
      { idempotencyKey: "brief-risk" }
    );
    await storage.captureLearning(
      {
        context_token: context.context_token,
        summary: "Regenerate fixtures before authoring NFT tests",
        scope: "data",
        recommended_action: "Run fixture regeneration before test authoring.",
        importance: "high"
      },
      { idempotencyKey: "brief-learning" }
    );
    const issue = await storage.createIssue(
      {
        context_token: context.context_token,
        title: "Scenario Builder fixture cache bug",
        summary: "NFT generation stays stale until fixtures are regenerated.",
        severity: "high"
      },
      { idempotencyKey: "brief-issue" }
    );
    await storage.appendRuleCheck(
      {
        project_id: "alpha",
        session_id: session.session_id,
        rule_id: "always_test",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        status: "blocked",
        note: "Test command is still missing"
      },
      { idempotencyKey: "brief-rule-check" }
    );

    const projectBrief = await storage.getProjectBrief(context.context_token);
    const branchBrief = await storage.getBranchBrief(context.context_token);
    const openThreads = await storage.getOpenThreadsReadModel(context.context_token);

    expect(projectBrief.latest_plan_ref?.target).toBe("docs/plans/context-learning-issue-slice.md");
    expect(projectBrief.recent_decisions).toHaveLength(1);
    expect(projectBrief.recent_learnings).toHaveLength(1);
    expect(projectBrief.active_issues).toHaveLength(1);
    expect(projectBrief.active_issues[0].issue_id).toBe(issue.issue.issue_id);
    expect(branchBrief.branch).toBe("feat/brief");
    expect(openThreads.open_threads.some((thread) => thread.kind === "entry")).toBe(true);
    expect(openThreads.open_threads.some((thread) => thread.kind === "rule_check")).toBe(true);
    expect(openThreads.open_threads.some((thread) => thread.kind === "issue")).toBe(true);
  });

  it("returns a startup summary digest with counts, highlights, and drill-down hints", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    await storage.upsertRuleset("alpha", {
      project_id: "alpha",
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
    const session = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "main",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Seed startup summary"
        },
        { idempotencyKey: "startup-session" }
      )
    ).session;
    const context = (
      await storage.openContext(
        {
          project_id: "alpha",
          branch: "main",
          workspace_path: "/repo/alpha",
          feature: "SMARTER_NFT_TESTS",
          source_tool: "scenario-builder",
          tool_version: "7.43",
          environment: "local",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex"
        },
        { idempotencyKey: "startup-context" }
      )
    ).context;
    await storage.captureLearning(
      {
        context_token: context.context_token,
        summary: "Regenerate fixtures before authoring NFT tests",
        scope: "data",
        recommended_action: "Run fixture regeneration before test authoring.",
        importance: "high"
      },
      { idempotencyKey: "startup-learning" }
    );
    await storage.createIssue(
      {
        context_token: context.context_token,
        title: "Scenario Builder fixture cache bug",
        summary: "NFT generation stays stale until fixtures are regenerated.",
        severity: "high"
      },
      { idempotencyKey: "startup-issue" }
    );
    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: session.session_id,
        branch: "main",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "risk",
        summary: "Open thread seeded for startup summary",
        lifecycle_state: "open"
      },
      { idempotencyKey: "startup-risk" }
    );

    const summary = await storage.getStartupSummary("alpha", "main", "SMARTER_NFT_TESTS");

    expect(summary.project_id).toBe("alpha");
    expect(summary.branch).toBe("main");
    expect(summary.feature).toBe("SMARTER_NFT_TESTS");
    expect(summary.counts.rules).toBe(1);
    expect(summary.counts.active_learnings).toBe(1);
    expect(summary.counts.active_issues).toBe(1);
    expect(summary.counts.open_threads).toBeGreaterThanOrEqual(2);
    expect(summary.highlights.learnings[0].summary).toBe("Regenerate fixtures before authoring NFT tests");
    expect(summary.highlights.issues[0].title).toBe("Scenario Builder fixture cache bug");
    expect(summary.hint).toContain("context.get_project_brief");
  });

  it("upserts rulesets with stable PUT-like semantics", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });

    const first = await storage.upsertRuleset("alpha", {
      project_id: "alpha",
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
    const second = await storage.upsertRuleset("alpha", {
      project_id: "alpha",
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
    const third = await storage.upsertRuleset("alpha", {
      project_id: "alpha",
      rules: [
        {
          rule_id: "always_test",
          label: "Always test",
          description: "Run tests before closing work.",
          severity: "required",
          check_mode: "command_reference_required"
        },
        {
          rule_id: "review",
          label: "Review changes",
          description: "Review changes before closing work.",
          severity: "advisory",
          check_mode: "manual_confirm"
        }
      ]
    });

    expect(first.version).toBe(1);
    expect(second.version).toBe(1);
    expect(third.version).toBe(2);
    expect(third.rules).toHaveLength(2);
  });

  it("creates a new session when a new idempotency key is used", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });

    const first = await storage.createSession(
      {
        project_id: "alpha",
        branch: "feat/a",
        workspace_path: "/repo/alpha",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Alpha session"
      },
      { idempotencyKey: "first-key" }
    );
    const second = await storage.createSession(
      {
        project_id: "alpha",
        branch: "feat/a",
        workspace_path: "/repo/alpha",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        agent_id: "codex",
        goal: "Alpha session"
      },
      { idempotencyKey: "second-key" }
    );

    expect(second.idempotent).toBe(false);
    expect(second.session.session_id).not.toBe(first.session.session_id);
  });

  it("ends sessions explicitly and rejects changing a final status", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });

    const session = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "feat/a",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Alpha session"
        },
        { idempotencyKey: "session-end" }
      )
    ).session;

    const ended = await storage.endSession(session.session_id, "completed");
    const repeated = await storage.endSession(session.session_id, "completed");

    expect(ended.status).toBe("completed");
    expect(ended.ended_at).toBeTruthy();
    expect(repeated.ended_at).toBe(ended.ended_at);
    await expect(storage.endSession(session.session_id, "abandoned")).rejects.toMatchObject({
      code: "SESSION_ALREADY_ENDED_WITH_DIFFERENT_STATUS"
    });
  });

  it("lists sessions with derived last_seen_at and closes stale active sessions", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });

    const quietSession = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "main",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Quiet session"
        },
        { idempotencyKey: "quiet-session" }
      )
    ).session;

    await new Promise((resolve) => setTimeout(resolve, 5));

    const activeSession = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "main",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Active session"
        },
        { idempotencyKey: "active-session" }
      )
    ).session;

    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: activeSession.session_id,
        branch: "main",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "progress",
        summary: "Recorded activity"
      },
      { idempotencyKey: "active-entry" }
    );

    const list = await storage.listSessions({
      project_id: "alpha",
      status: "active"
    });

    expect(list.sessions).toHaveLength(2);
    expect(list.sessions[0].session_id).toBe(activeSession.session_id);
    expect(list.sessions[0].last_seen_at >= activeSession.updated_at).toBe(true);

    const closeResult = await storage.closeSessionsOlderThan({
      project_id: "alpha",
      older_than_hours: 0.000001,
      status: "abandoned"
    });

    expect(closeResult.closed_sessions.some((session) => session.session_id === quietSession.session_id)).toBe(true);
    expect(closeResult.closed_sessions.every((session) => session.status === "abandoned")).toBe(true);
  });

  it("filters unresolved entries by lifecycle_state", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    const session = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "feat/a",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Alpha session"
        },
        { idempotencyKey: "session" }
      )
    ).session;

    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: session.session_id,
        branch: "feat/a",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "risk",
        summary: "Still open",
        lifecycle_state: "open"
      },
      { idempotencyKey: "entry-open" }
    );
    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: session.session_id,
        branch: "feat/a",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "feedback",
        summary: "Resolved already",
        lifecycle_state: "resolved"
      },
      { idempotencyKey: "entry-resolved" }
    );

    const result = await storage.searchEntries({
      project_id: "alpha",
      lifecycle_state: "open"
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].summary).toBe("Still open");
  });

  it("builds bounded warm-start context from prior project memory", async () => {
    const storage = createStorage();
    await storage.createProject({
      project_id: "alpha",
      name: "Alpha",
      root_path: "/repo/alpha",
      default_branch: "main",
      description: "Alpha project"
    });
    await storage.upsertRuleset("alpha", {
      project_id: "alpha",
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

    const seedSession = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "feat/a",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Seed context"
        },
        { idempotencyKey: "seed-session" }
      )
    ).session;
    const currentContext = (
      await storage.openContext(
        {
          project_id: "alpha",
          branch: "feat/a",
          workspace_path: "/repo/alpha",
          feature: "SMARTER_NFT_TESTS",
          source_tool: "scenario-builder",
          tool_version: "7.43",
          environment: "local",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex"
        },
        { idempotencyKey: "context-feat-a" }
      )
    ).context;
    const otherBranchSession = (
      await storage.createSession(
        {
          project_id: "alpha",
          branch: "feat/b",
          workspace_path: "/repo/alpha",
          author_id: "agent-alpha",
          author_type: "agent",
          source: "mcp",
          agent_id: "codex",
          goal: "Seed secondary branch context"
        },
        { idempotencyKey: "other-branch-session" }
      )
    ).session;

    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: seedSession.session_id,
        branch: "feat/a",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "decision",
        summary: "Use HTTP between MCP and API",
        importance: "high"
      },
      { idempotencyKey: "decision-entry" }
    );
    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: seedSession.session_id,
        branch: "feat/a",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "risk",
        summary: "Rules flow is still missing",
        lifecycle_state: "open"
      },
      { idempotencyKey: "risk-entry" }
    );
    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: seedSession.session_id,
        branch: "feat/a",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "tooling_note",
        summary: "Use rg for repo scans",
        tags: ["tooling"]
      },
      { idempotencyKey: "tooling-entry" }
    );
    await storage.appendEntry(
      {
        project_id: "alpha",
        session_id: otherBranchSession.session_id,
        branch: "feat/b",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        entry_type: "feedback",
        summary: "Naming can wait until core flow works",
        lifecycle_state: "open"
      },
      { idempotencyKey: "feedback-entry" }
    );
    const learning = await storage.captureLearning(
      {
        context_token: currentContext.context_token,
        summary: "Regenerate fixtures before authoring NFT tests",
        scope: "data",
        recommended_action: "Run fixture regeneration before test authoring.",
        importance: "high"
      },
      { idempotencyKey: "learning-entry" }
    );
    await storage.appendLearningFeedback(
      {
        context_token: currentContext.context_token,
        learning_id: learning.learning.learning_id,
        feedback_type: "confirm",
        comment: "Confirmed on the feature branch."
      },
      { idempotencyKey: "learning-feedback-entry" }
    );
    await storage.appendRuleCheck(
      {
        project_id: "alpha",
        session_id: seedSession.session_id,
        rule_id: "always_test",
        author_id: "agent-alpha",
        author_type: "agent",
        source: "mcp",
        status: "blocked",
        note: "Test harness is not wired yet"
      },
      { idempotencyKey: "blocked-rule-check" }
    );

    const context = await storage.getSessionStartContext({
      project_id: "alpha",
      branch: "feat/a"
    });

    expect(context.rules).toHaveLength(1);
    expect(context.recent_decisions).toHaveLength(1);
    expect(context.recent_decisions[0].summary).toBe("Use HTTP between MCP and API");
    expect(context.recent_risks[0].summary).toBe("Rules flow is still missing");
    expect(context.recent_tooling_notes[0].summary).toBe("Use rg for repo scans");
    expect(context.recent_learnings).toHaveLength(1);
    expect(context.recent_learnings[0].summary).toBe("Regenerate fixtures before authoring NFT tests");
    expect(context.recent_learnings[0].feedback_summary.confirm_count).toBe(1);
    expect(context.open_threads).toHaveLength(3);
    expect(context.open_threads[0].branch).toBe("feat/a");
    expect(context.open_threads.some((thread) => thread.kind === "rule_check" && thread.rule_id === "always_test")).toBe(
      true
    );
  });
});

function createStorage() {
  const dataRoot = mkdtempSync(join(tmpdir(), "skrybe-storage-"));
  roots.push(dataRoot);
  return new FsJsonlStorage({ dataRoot });
}
