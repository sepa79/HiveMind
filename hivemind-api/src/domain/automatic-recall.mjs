import { ApiError } from "../app/errors.mjs";

import { RECALL_MAX_BYTES, RECALL_MAX_ITEMS } from "./schemas.mjs";
const importance = { high: 3, normal: 2, low: 1 };
const severity = { critical: 4, high: 3, normal: 2, low: 1 };
const bytes = (value) => Buffer.byteLength(JSON.stringify(value), "utf8");

export function validateRecallCreationMetadata(payload) {
  if (bytes(payload) > 2048) {
    throw new ApiError(413, "RECALL_METADATA_TOO_LARGE", "Session/context creation metadata must fit in 2048 UTF-8 JSON bytes.");
  }
}

export function validateApplicabilityFeature(applicability, feature) {
  if (applicability?.scope === "feature" && !feature) {
    throw new ApiError(400, "APPLICABILITY_FEATURE_REQUIRED", "Feature applicability requires a named feature.");
  }
}

function inScope(record, scope) {
  return record.branch === scope.branch && (record.feature ?? null) === scope.feature;
}

function guidanceInScope(record, applicability, scope) {
  if (applicability?.scope === "project") return true;
  if (applicability?.scope === "branch") return record.branch === scope.branch;
  return inScope(record, scope);
}

export function buildAutomaticRecall(source, { project_id, branch, feature, view = "all", limit = RECALL_MAX_ITEMS }, responseMetadata = null) {
  const scope = { project_id, branch, feature: feature ?? null };
  const candidates = [];
  const review = new Set();
  const add = (section, kind, id, summary, state, reason, weight, timestamp) => {
    candidates.push({ section, item: { kind, id, summary, state, reason }, weight, timestamp });
  };
  for (const entry of source.entries) {
    const { applicability } = entry;
    if (!guidanceInScope(entry, applicability, scope)) continue;
    if (entry.lifecycle_state === "superseded" || applicability?.state === "retired") continue;
    const key = `entry:${entry.entry_id}`;
    if (["risk", "feedback"].includes(entry.entry_type)) {
      if (!inScope(entry, scope) || entry.lifecycle_state === "resolved") continue;
      if (entry.lifecycle_state === "open" && applicability?.state !== "needs_review") {
        add("open_threads", "entry", entry.entry_id, entry.summary, "open", "Explicit unresolved concern in this scope.",
          importance[entry.importance], entry.timestamp);
      } else if (!entry.lifecycle_state || applicability?.state === "needs_review") review.add(key);
      continue;
    }
    if (!["decision", "tooling_note"].includes(entry.entry_type) || view === "threads") continue;
    if (entry.entry_type !== "decision" && entry.lifecycle_state === "resolved") continue;
    if (applicability?.state !== "current") { review.add(key); continue; }
    add(applicability.scope === "project" ? "project_guidance" : "guidance", "entry", entry.entry_id,
      entry.summary, "current", applicability.reason, importance[entry.importance], entry.timestamp);
  }
  const negativeLearnings = new Set(source.learning_feedback.filter((feedback) => feedback.feedback_type === "did_not_work").map((feedback) => feedback.learning_id));
  if (view === "all") for (const learning of source.learnings) {
    const applicability = learning.applicability;
    if (learning.status !== "active" || applicability?.state === "retired" ||
        !guidanceInScope(learning.context, applicability, scope)) continue;
    if (applicability?.state !== "current" || negativeLearnings.has(learning.learning_id)) {
      review.add(`learning:${learning.learning_id}`);
      continue;
    }
    add(applicability.scope === "project" ? "project_guidance" : "guidance", "learning", learning.learning_id,
      learning.summary, "current", applicability.reason, importance[learning.importance], learning.created_at);
  }
  for (const issue of source.issues) {
    if (!inScope(issue.context, scope) || !["open", "fixed_pending_verification"].includes(issue.status)) continue;
    add("open_threads", "issue", issue.issue_id, `${issue.title}: ${issue.summary}`, issue.status,
      "Explicit unresolved issue in this scope.", severity[issue.severity], issue.updated_at);
  }
  const sessions = new Map(source.sessions.map((session) => [session.session_id, session]));
  for (const check of source.rule_checks) {
    if (check.status === "blocked" && inScope(sessions.get(check.session_id) ?? {}, scope)) {
      review.add(`rule_check:${check.rule_check_id}`);
    }
  }
  candidates.sort((a, b) => (b.weight - a.weight) || b.timestamp.localeCompare(a.timestamp) ||
    `${a.item.kind}:${a.item.id}`.localeCompare(`${b.item.kind}:${b.item.id}`));
  const seen = new Set();
  const recall = {
    scope, view, authority: "informational",
    rules: view === "all" ? [...source.rules].sort((a, b) =>
      Number(b.severity === "required") - Number(a.severity === "required") || a.rule_id.localeCompare(b.rule_id)) : [],
    project_guidance: [], guidance: [], open_threads: [],
    counts: { rules: view === "all" ? source.rules.length : 0, guidance: 0, open_threads: 0 },
    review_required: review.size, truncated: false, required_rules_omitted: 0,
    budget: { max_bytes: RECALL_MAX_BYTES, max_memory_items: RECALL_MAX_ITEMS },
    retrieval: { rules: "rules_get", history: ["entry_search", "learning_search", "issue_list", "rule_check_list_for_session"] }
  };
  for (const candidate of candidates) {
    const key = `${candidate.item.kind}:${candidate.item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const isThread = candidate.section === "open_threads";
    recall.counts[isThread ? "open_threads" : "guidance"] += 1;
    recall[candidate.section].push(candidate.item);
  }
  return fitRecallResponse(responseMetadata === null ? recall : { ...responseMetadata, recall }, limit);
}

// Fit the complete candidate set once, including any session/context metadata.
function fitRecallResponse(response, threadLimit) {
  const output = structuredClone(response);
  const recall = output.recall ?? output;
  const sections = ["rules", "project_guidance", "open_threads", "guidance"];
  const candidates = Object.fromEntries(sections.map((name) => [name, recall[name]]));
  for (const name of sections) recall[name] = [];
  // Reserve the worst-case omission metadata before attempting to fit items.
  recall.required_rules_omitted = candidates.rules.filter((rule) => rule.severity === "required").length;
  recall.truncated = false;
  if (bytes(output) > RECALL_MAX_BYTES) {
    throw new ApiError(413, "RECALL_METADATA_TOO_LARGE", "Non-memory response metadata exceeds the recall budget.");
  }
  let memoryItems = 0;
  let omissions = 0;
  for (const name of sections) for (const item of candidates[name]) {
    if ((name !== "rules" && memoryItems >= RECALL_MAX_ITEMS) ||
        (name === "open_threads" && recall.open_threads.length >= threadLimit)) { omissions += 1; continue; }
    recall[name].push(item);
    if (bytes(output) > RECALL_MAX_BYTES) {
      recall[name].pop();
      omissions += 1;
      continue;
    }
    if (name === "rules" && item.severity === "required") recall.required_rules_omitted -= 1;
    if (name !== "rules") memoryItems += 1;
  }
  recall.truncated = omissions > 0;
  return output;
}
