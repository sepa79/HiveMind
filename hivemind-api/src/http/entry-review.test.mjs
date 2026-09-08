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
afterEach(() => {
  vi.useRealTimers();
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const applicability = { state: "current", scope: "project", reason: "Verified against code", evidence_refs: [{ kind: "repo_file", target: "README.md" }] };
const provenance = { project_id: "alpha", branch: "main", workspace_path: "/repo/alpha", author_id: "codex", author_type: "agent", source: "mcp", agent_id: "codex" };

for (const backend of ["fs-jsonl", "opensearch"]) describe(`entry review REST and ${backend}`, () => {
  async function setup() {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    const root = mkdtempSync(join(tmpdir(), "entry-review-")); roots.push(root);
    const storage = backend === "fs-jsonl" ? new FsJsonlStorage({ dataRoot: root }) : new OpenSearchStorage({ client: new FakeOpenSearchClient(), indexPrefix: "test" });
    await storage.createProject({ project_id: "alpha", name: "Alpha", repository_url: "https://github.com/example/alpha.git", repository_slug: "example/alpha", root_path: "/repo/alpha", default_branch: "main" });
    const app = createApp({ service: new HiveMindService({ storage }), adminToken: "test-admin" });
    async function request(path, body) {
      const response = await app.request(path, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer test-admin" }, body: JSON.stringify(body) });
      expect(response.status).toBe(200);
      return (await response.json()).data;
    }
    const { session } = await storage.createSession({ ...provenance, goal: "Review fixtures" }, { idempotencyKey: "session" });
    async function append(summary, overrides = {}) {
      return (await storage.appendEntry({ ...provenance, session_id: session.session_id, entry_type: "decision", summary, ...overrides }, { idempotencyKey: summary })).entry;
    }
    return { storage, request, append };
  }

  it("separates current knowledge from review, never resolves by age, and preserves history", async () => {
    const { storage, request, append } = await setup();
    const current = await append("Old valid decision", { applicability, lifecycle_state: "open" });
    const implemented = await append("Implemented valid decision", { applicability, lifecycle_state: "resolved" });
    const legacy = await append("Unclassified decision");
    const pending = await append("Needs evidence", { applicability: { ...applicability, state: "needs_review", reason: "Conflicting implementation evidence" }, lifecycle_state: "resolved" });
    const tool = await append("Valid tooling", { entry_type: "tooling_note", applicability });
    const unknownTool = await append("Unknown tooling", { entry_type: "tooling_note" });
    const risk = await append("Old open risk", { entry_type: "risk", lifecycle_state: "open", importance: "high", applicability: { ...applicability, state: "needs_review" } });
    const unknownRisk = await append("Unknown risk lifecycle", { entry_type: "risk" });
    const progress = await append("Old open task", { entry_type: "progress", lifecycle_state: "open" });
    const archived = [
      await append("Superseded", { lifecycle_state: "superseded", applicability }),
      await append("Retired", { lifecycle_state: "open", applicability: { ...applicability, state: "retired" } }),
      await append("Retired risk", { entry_type: "risk", lifecycle_state: "open", applicability: { ...applicability, state: "retired" } }),
      await append("Closed tooling", { entry_type: "tooling_note", lifecycle_state: "resolved", applicability }),
      await append("Closed risk", { entry_type: "risk", lifecycle_state: "resolved" })
    ];
    const { session: otherSession } = await storage.createSession({ ...provenance, branch: "other", goal: "Other branch" }, { idempotencyKey: "other-session" });
    await append("Other branch", { branch: "other", session_id: otherSession.session_id });
    const before = await storage.listEntries({ project_id: "alpha" });
    vi.setSystemTime(new Date("2026-09-08T00:00:00Z"));
    const review = await request("/v1/projects/alpha/review", { branch: "main", limit: 50 });
    const ids = (items) => items.map(e => e.entry_id).sort();
    expect(ids(review.signals.recent_decisions)).toEqual(ids([current, implemented]));
    expect(ids(review.signals.tooling_notes)).toEqual(ids([tool]));
    expect(ids(review.signals.review_queue)).toEqual(ids([legacy, pending, unknownTool, risk, unknownRisk]));
    expect(ids(review.signals.stale_open_entries)).toEqual(ids([current, risk, progress]));
    expect(ids(review.signals.open_risks)).toEqual(ids([risk]));
    expect(review.recommended_actions.every(a => a.action_type === "review")).toBe(true);
    expect(new Set(review.recommended_actions.map(a => a.target_id)).size).toBe(review.recommended_actions.length);
    const riskAction = review.recommended_actions.find(a => a.target_id === risk.entry_id);
    expect(riskAction.reason).toContain("Applicability explicitly requires review");
    expect(riskAction.reason).toContain("Explicitly open concern");
    expect(riskAction.reason).toContain("Age is not evidence of resolution");
    expect(review.recommended_actions[0].target_id).toBe(risk.entry_id);
    expect(review.recommended_actions.find(a => a.target_id === pending.entry_id).reason).toContain("Conflicting implementation evidence");
    expect(review.recommended_actions.some(a => a.target_id === implemented.entry_id)).toBe(false);
    for (const entry of archived) expect(JSON.stringify(review)).not.toContain(entry.entry_id);
    const admin = await request("/v1/admin/memory-review", { project_ids: ["alpha"], branch: "main", limit: 20 });
    expect(admin.project_reviews[0].signals).toEqual(review.signals);
    expect(admin.recommended_actions).toEqual(review.recommended_actions);
    const query = await request("/v1/admin/memory-review", { project_ids: ["alpha"], branch: "main", query: "Unclassified", limit: 20 });
    expect(ids(query.project_reviews[0].signals.review_queue)).toEqual([legacy.entry_id]);
    expect(query.recommended_actions).toHaveLength(1);
    expect(await storage.listEntries({ project_id: "alpha" })).toEqual(before);
    const history = await request("/v1/entries/search", { project_id: "alpha", lifecycle_state: "superseded" });
    expect(ids(history.entries)).toEqual([archived[0].entry_id]);
  });

  it("applies limits after classification across more than 200 archived entries", async () => {
    const { request, append } = await setup();
    const current = await append("Older current decision", { applicability });
    const pending = await append("Older unclassified decision");
    vi.setSystemTime(new Date("2026-09-08T00:00:00Z"));
    for (let index = 0; index < 205; index += 1) {
      await append(`New archived decision ${index}`, { applicability, lifecycle_state: "superseded" });
    }
    const review = await request("/v1/projects/alpha/review", { limit: 1 });
    expect(review.signals.recent_decisions.map(e => e.entry_id)).toEqual([current.entry_id]);
    expect(review.signals.review_queue.map(e => e.entry_id)).toEqual([pending.entry_id]);
    expect(review.recommended_actions.map(a => a.target_id)).toEqual([pending.entry_id]);
  });
});
