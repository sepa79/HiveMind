import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "./app.mjs";
import { HiveMindService } from "../app/service.mjs";
import { FsJsonlStorage } from "../storage/fs-jsonl-storage.mjs";
import { OpenSearchStorage } from "../storage/opensearch-storage.mjs";
import { FakeOpenSearchClient } from "../storage/test-support/fake-opensearch-client.mjs";

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const provenance = { project_id: "alpha", branch: "main", feature: "PAYMENTS", workspace_path: "/repo/alpha", author_id: "codex", author_type: "agent", source: "mcp", agent_id: "codex" };
const applicability = { state: "current", scope: "feature", reason: "Verified against current code", evidence_refs: [{ kind: "repo_file", target: "README.md" }] };

for (const backend of ["fs-jsonl", "opensearch"]) describe(`automatic recall REST and ${backend} persistence`, () => {
  async function setup() {
    const root = mkdtempSync(join(tmpdir(), "recall-contract-")); roots.push(root);
    const storage = backend === "fs-jsonl" ? new FsJsonlStorage({ dataRoot: root }) : new OpenSearchStorage({ client: new FakeOpenSearchClient(), indexPrefix: "test" });
    await storage.createProject({ project_id: "alpha", name: "Alpha", repository_url: "https://github.com/example/alpha.git", repository_slug: "example/alpha", root_path: "/repo/alpha", default_branch: "main", features: ["PAYMENTS"] });
    await storage.addFeature("alpha", "PAYMENTS");
    const app = createApp({ service: new HiveMindService({ storage }) });
    async function request(path, body, key = path) {
      const response = await app.request(path, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
      return { status: response.status, ...(await response.json()) };
    }
    return { storage, app, request };
  }

  it("persists applicability, filters every recall surface, preserves history and honors create idempotency", async () => {
    const { storage, app, request } = await setup();
    const started = await request("/v1/sessions", { ...provenance, goal: "Seed recall" });
    expect(started.status).toBe(201);
    const session = started.data.session;
    expect(session.feature).toBe("PAYMENTS");
    const opened = await request("/v1/contexts", provenance);
    const token = opened.data.context.context_token;
    const body = { ...provenance, session_id: session.session_id, entry_type: "decision", summary: "Keep API boundaries", lifecycle_state: "resolved", applicability };
    const decision = await request("/v1/entries", body, "decision");
    expect(decision.status).toBe(201);
    expect(decision.data.entry.applicability).toEqual(applicability);
    const repeated = await request("/v1/entries", body, "decision");
    expect(repeated.data.entry.entry_id).toBe(decision.data.entry.entry_id);
    expect((await request("/v1/entries", { ...body, applicability: { ...applicability, state: "retired" } }, "decision")).status).toBe(409);
    const old = await request("/v1/entries", { ...body, summary: "Closed risk should stay in history", entry_type: "risk", applicability: undefined }, "closed-risk");
    await request("/v1/entries", { ...body, summary: "Obsolete high priority", importance: "high", lifecycle_state: "superseded" }, "superseded");
    await request("/v1/entries", { ...body, summary: "Legacy decision", applicability: undefined }, "legacy");
    const risk = await request("/v1/entries", { ...body, summary: "Unresolved risk", entry_type: "risk", lifecycle_state: "open", applicability: undefined }, "risk");
    const learningBody = { context_token: token, summary: "Current learning", scope: "workflow", recommended_action: "Follow current workflow", applicability };
    const learning = await request("/v1/learnings", learningBody, "learning");
    expect(learning.status).toBe(201);
    expect(learning.data.learning.applicability).toEqual(applicability);
    expect((await request("/v1/learnings", learningBody, "learning")).data.learning.learning_id).toBe(learning.data.learning.learning_id);
    const retry = await request("/v1/sessions", { ...provenance, goal: "Seed recall" });
    expect(retry.data.session.session_id).toBe(session.session_id);
    expect(retry.data.recall.guidance.map((item) => item.id).sort()).toEqual([decision.data.entry.entry_id, learning.data.learning.learning_id].sort());
    expect(retry.data.recall.open_threads.map((item) => item.id)).toEqual([risk.data.entry.entry_id]);
    expect(retry.data.recall.review_required).toBe(1);
    expect(Object.keys(retry.data).sort()).toEqual(["recall", "session"]);
    const contextRetry = await request("/v1/contexts", provenance);
    expect(contextRetry.data.context.context_token).toBe(token);
    for (const kind of ["project-brief", "branch-brief"]) {
      const result = await (await app.request(`/v1/contexts/${token}/${kind}`)).json();
      expect(result.data).toEqual(retry.data.recall);
    }
    const threads = await (await app.request(`/v1/contexts/${token}/open-threads`)).json();
    expect(threads.data.guidance).toEqual([]);
    expect(threads.data.open_threads).toEqual(retry.data.recall.open_threads);
    const empty = await request("/v1/sessions", { ...provenance, branch: "unrelated", goal: "Empty scope" }, "empty");
    expect(empty.data.recall.guidance).toEqual([]);
    expect(empty.data.recall.open_threads).toEqual([]);
    const history = await request("/v1/entries/search", { project_id: "alpha", branch: "main", limit: 20 });
    expect(history.data.entries.map((item) => item.entry_id)).toContain(old.data.entry.entry_id);
    expect((await storage.getEntry("alpha", old.data.entry.entry_id)).lifecycle_state).toBe("resolved");
    await storage.appendLearningFeedback({ context_token: token, learning_id: learning.data.learning.learning_id, feedback_type: "did_not_work" }, { idempotencyKey: "negative" });
    const reviewed = await request("/v1/sessions", { ...provenance, goal: "Seed recall" });
    expect(reviewed.data.recall.guidance.map((item) => item.id)).toEqual([decision.data.entry.entry_id]);
    expect(reviewed.data.recall.review_required).toBe(2);
    expect((await storage.getRecentLearnings({ context_token: token, limit: 10 })).learnings[0].status).toBe("active");
    for (const response of [retry.data, contextRetry.data, threads.data, reviewed.data]) expect(Buffer.byteLength(JSON.stringify(response), "utf8")).toBeLessThanOrEqual(8192);
  });

  it.each(["sessions", "contexts"])("fits required rules once with the full %s response, including retries", async (surface) => {
    const { storage, request } = await setup();
    const rules = [
      { rule_id: "a-large", label: "Large", description: "x".repeat(6500), severity: "required", check_mode: "manual_confirm" },
      { rule_id: "b-small", label: "Small", description: "y".repeat(1400), severity: "required", check_mode: "manual_confirm" }
    ];
    await storage.upsertRuleset("alpha", { rules });
    const input = { ...provenance, [surface === "sessions" ? "goal" : "environment"]: "g".repeat(1600) };
    const first = await request(`/v1/${surface}`, input, "budget");
    const retry = await request(`/v1/${surface}`, input, "budget");
    for (const result of [first, retry]) {
      expect(result.status).toBe(201);
      expect(result.data.recall.rules).toEqual([rules[1]]);
      expect(result.data.recall.counts.rules).toBe(2);
      expect(result.data.recall.required_rules_omitted).toBe(1);
      expect(result.data.recall.truncated).toBe(true);
      expect(Buffer.byteLength(JSON.stringify(result.data), "utf8")).toBeLessThanOrEqual(8192);
    }
    expect(retry.data).toEqual(first.data);
  });

  it("rejects invalid applicability and oversized creation metadata before storing anything", async () => {
    const { storage, request } = await setup();
    const sessionsBefore = (await storage.listSessions({ project_id: "alpha" })).sessions.length;
    expect((await request("/v1/sessions", { ...provenance, goal: "🧠".repeat(1000) })).status).toBe(413);
    expect((await storage.listSessions({ project_id: "alpha" })).sessions.length).toBe(sessionsBefore);
    const openSpy = vi.spyOn(storage, "openContext");
    expect((await request("/v1/contexts", { ...provenance, environment: "x".repeat(3000) })).status).toBe(413);
    expect(openSpy).not.toHaveBeenCalled();
    const appendSpy = vi.spyOn(storage, "appendEntry");
    const body = { ...provenance, session_id: "missing", entry_type: "decision", summary: "Invalid", applicability };
    expect((await request("/v1/entries", { ...body, applicability: { ...applicability, evidence_refs: [] } })).status).toBe(400);
    const noFeature = await request("/v1/entries", { ...body, feature: undefined });
    expect(noFeature.error.code).toBe("APPLICABILITY_FEATURE_REQUIRED");
    expect(appendSpy).not.toHaveBeenCalled();
  });

  it("fails explicitly when a project ruleset is missing instead of implying no required rules", async () => {
    const { storage } = await setup();
    vi.spyOn(storage, "getRuleset").mockResolvedValue(null);
    await expect(storage.getSessionStartContext(provenance)).rejects.toMatchObject({ code: "RULESET_MISSING" });
  });

  it("gets current session metadata without history, including renamed features and ended sessions", async () => {
    const { storage, app, request } = await setup();
    const started = await request("/v1/sessions", { ...provenance, goal: "Read current metadata" });
    const id = started.data.session.session_id;
    await storage.renameFeature("alpha", "PAYMENTS", "BILLING");
    const response = await app.request(`/v1/sessions/${id}`);
    expect(response.status).toBe(200);
    const data = (await response.json()).data;
    expect(Object.keys(data)).toEqual(["session"]);
    expect(data.session).toMatchObject({ session_id: id, feature: "BILLING", status: "active" });
    await storage.endSession(id, "completed");
    expect((await (await app.request(`/v1/sessions/${id}`)).json()).data.session.status).toBe("completed");
    const missing = await app.request("/v1/sessions/nonexistent");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error.code).toBe("SESSION_NOT_FOUND");
  });

  it("tracks session feature references when renaming or deleting a feature", async () => {
    const { storage, request } = await setup();
    const started = await request("/v1/sessions", { ...provenance, goal: "Feature scope" });
    await expect(storage.removeFeature("alpha", "PAYMENTS")).rejects.toMatchObject({ code: "FEATURE_IN_USE" });
    await storage.renameFeature("alpha", "PAYMENTS", "BILLING");
    expect((await storage.getSession(started.data.session.session_id)).feature).toBe("BILLING");
    const retry = await request("/v1/sessions", { ...provenance, goal: "Feature scope" });
    expect(retry.data.recall.scope.feature).toBe("BILLING");
  });
});
