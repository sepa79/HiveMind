import { describe, expect, it } from "vitest";
import { buildAutomaticRecall } from "./automatic-recall.mjs";
import { AutomaticRecallSchema } from "./schemas.mjs";

const scope = { project_id: "alpha", branch: "main", feature: "PAYMENTS" };
const applicability = { state: "current", scope: "feature", reason: "Verified current contract", evidence_refs: [{ kind: "repo_file", target: "README.md" }] };
const entry = (id, patch = {}) => ({ entry_id: id, entry_type: "decision", summary: id, branch: "main", feature: "PAYMENTS", lifecycle_state: "open", importance: "normal", timestamp: "2026-09-07", applicability, ...patch });
const source = (patch = {}) => ({ rules: [], entries: [], learnings: [], learning_feedback: [], issues: [], sessions: [], rule_checks: [], ...patch });
const ids = (recall) => [...recall.project_guidance, ...recall.guidance, ...recall.open_threads].map((item) => item.id);

describe("automatic recall policy", () => {
  it("keeps applicable decisions after implementation, excludes closed incidents and ambiguous legacy advice", () => {
    const recall = buildAutomaticRecall(source({ entries: [
      entry("current-decision", { lifecycle_state: "resolved" }),
      entry("superseded", { lifecycle_state: "superseded" }),
      entry("retired", { applicability: { ...applicability, state: "retired" } }),
      entry("legacy-permission", { applicability: undefined, summary: "Old permission to deploy" }),
      entry("review", { applicability: { ...applicability, state: "needs_review" } }),
      entry("closed-risk", { entry_type: "risk", lifecycle_state: "resolved" }),
      entry("closed-tool", { entry_type: "tooling_note", lifecycle_state: "resolved" }),
      entry("ambiguous-risk", { entry_type: "risk", lifecycle_state: null }),
      entry("open-risk", { entry_type: "risk", applicability: undefined })
    ] }), scope);
    expect(ids(recall).sort()).toEqual(["current-decision", "open-risk"]);
    expect(recall.review_required).toBe(3);
    expect(recall.authority).toBe("informational");
    expect(JSON.stringify(recall)).not.toContain("Old permission");
    expect(AutomaticRecallSchema.parse(recall)).toEqual(recall);
  });

  it("requires exact incident scope and explicitly separates project guidance", () => {
    const records = [entry("same"), entry("other-branch", { branch: "dev" }), entry("other-feature", { feature: "REPORTS" }),
      entry("project", { branch: "dev", applicability: { ...applicability, scope: "project" } }),
      entry("branch", { feature: undefined, applicability: { ...applicability, scope: "branch" } }),
      entry("risk-unscoped", { entry_type: "risk", feature: undefined }),
      entry("risk-project-claim", { entry_type: "risk", branch: "dev", applicability: { ...applicability, scope: "project" } })];
    const recall = buildAutomaticRecall(source({ entries: records }), scope);
    expect(ids(recall).sort()).toEqual(["branch", "project", "same"]);
    expect(recall.project_guidance.map((item) => item.id)).toEqual(["project"]);
    expect(ids(buildAutomaticRecall(source({ entries: records }), { ...scope, feature: undefined })).sort()).toEqual(["branch", "project", "risk-unscoped"]);
    expect(ids(buildAutomaticRecall(source({ entries: records.slice(0, 3) }), { ...scope, branch: "empty" }))).toEqual([]);
  });

  it("withholds negative learnings and historical blocked checks without reactivating them on reads", () => {
    const records = source({
      learnings: ["active", "negative", "resolved", "superseded", "legacy"].map((id) => ({ learning_id: id, summary: id, context: scope,
        status: ["resolved", "superseded"].includes(id) ? id : "active", applicability: id === "legacy" ? undefined : applicability,
        importance: "high", created_at: "2026-09-07" })),
      learning_feedback: [{ learning_id: "negative", feedback_type: "did_not_work" }, { learning_id: "negative", feedback_type: "confirm" }],
      issues: ["open", "fixed_pending_verification", "resolved", "closed"].map((status) => ({ issue_id: status, title: status, summary: status, context: scope, status, severity: "high", updated_at: "2026-09-07" })),
      sessions: [{ session_id: "s", ...scope }], rule_checks: [{ rule_check_id: "c", session_id: "s", status: "blocked" }]
    });
    const original = structuredClone(records);
    const recall = buildAutomaticRecall(records, scope);
    expect(ids(recall).sort()).toEqual(["active", "fixed_pending_verification", "open"]);
    expect(recall.review_required).toBe(3);
    expect(buildAutomaticRecall(records, scope)).toEqual(recall);
    expect(records).toEqual(original);
    expect(buildAutomaticRecall(records, { ...scope, view: "threads", limit: 1 }).open_threads).toHaveLength(1);
  });

  it("shares one item and UTF-8 budget across sections and the session envelope", () => {
    const records = source({ entries: Array.from({ length: 30 }, (_, n) => entry(`e${n}`, { summary: "żółć🧠".repeat(80),
      entry_type: n % 2 ? "risk" : "decision", applicability: n % 3 ? applicability : { ...applicability, scope: "project" } })) });
    records.entries.push(records.entries[0]);
    const response = buildAutomaticRecall(records, scope, { session: { goal: "ą".repeat(700) } });
    expect(Buffer.byteLength(JSON.stringify(response), "utf8")).toBeLessThanOrEqual(8192);
    expect(ids(response.recall).length).toBeLessThanOrEqual(8);
    expect(new Set(ids(response.recall)).size).toBe(ids(response.recall).length);
    expect(response.recall.counts.guidance + response.recall.counts.open_threads).toBe(30);
    expect(response.recall.truncated).toBe(true);
    expect(buildAutomaticRecall(records, scope, { session: { goal: "ą".repeat(700) } })).toEqual(response);
  });

  it.each(["decision", "risk"])("considers smaller %s candidates after an oversized candidate cannot fit", (entry_type) => {
    const records = source({ entries: [
      entry("large", { entry_type, summary: "x".repeat(6500), importance: "high" }),
      ...Array.from({ length: 8 }, (_, n) => entry(`small-${n}`, { entry_type, summary: "y".repeat(500) }))
    ] });
    const result = buildAutomaticRecall(records, scope, { session: { goal: "g".repeat(1600) } });
    expect(ids(result.recall)).toEqual(Array.from({ length: 8 }, (_, n) => `small-${n}`));
    expect(result.recall.truncated).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(result), "utf8")).toBeLessThanOrEqual(8192);
  });

  it("reports required rule omissions, never cuts text, and fails on oversized fixed metadata", () => {
    const rules = [
      { rule_id: "oversized", severity: "required", description: "x".repeat(9000) },
      { rule_id: "small", severity: "required", description: "Required complete rule" }
    ];
    const recall = buildAutomaticRecall(source({ rules }), scope);
    expect(recall.rules).toEqual([rules[1]]);
    expect(recall.required_rules_omitted).toBe(1);
    expect(recall.truncated).toBe(true);
    expect(recall.retrieval.rules).toBe("rules_get");
    expect(() => buildAutomaticRecall(source({ rules }), scope, { session: { goal: "x".repeat(9000) } })).toThrow("metadata exceeds");
  });
});
