// Entries arrive in recency order. Classify the full set before limiting any
// signal or recommendation so archived entries cannot crowd out current ones.
export function buildEntryReview(entries, { limit, now = Date.now() }) {
  const signals = {
    review_queue: [], recent_decisions: [], open_feedback: [], open_risks: [],
    stale_open_entries: [], tooling_notes: []
  };
  const actions = new Map();
  const staleCutoff = now - 7 * 24 * 60 * 60 * 1000;
  for (const entry of entries) {
    const state = entry.applicability?.state;
    if (entry.lifecycle_state === "superseded" || state === "retired") continue;
    const decision = entry.entry_type === "decision";
    if (entry.lifecycle_state === "resolved" && !decision) continue;
    const knowledge = decision || entry.entry_type === "tooling_note";
    const incident = ["risk", "feedback"].includes(entry.entry_type);
    const reasons = [];
    if (state === "needs_review") {
      reasons.push(`Applicability explicitly requires review: ${entry.applicability.reason}`);
    } else if (knowledge && state !== "current") {
      reasons.push("Knowledge has no applicability assertion; verify current relevance and evidence before using it as guidance.");
    }
    if (incident && !entry.lifecycle_state) {
      reasons.push("Incident lifecycle is unset; verify whether the concern is still open.");
    }
    if (reasons.length) signals.review_queue.push(entry);
    if (knowledge && state === "current") {
      signals[decision ? "recent_decisions" : "tooling_notes"].push(entry);
    }
    if (incident && entry.lifecycle_state === "open") {
      signals[entry.entry_type === "feedback" ? "open_feedback" : "open_risks"].push(entry);
      reasons.push("Explicitly open concern; inspect resolution evidence before changing its lifecycle.");
    }
    if (entry.lifecycle_state === "open" && new Date(entry.updated_at).getTime() <= staleCutoff) {
      signals.stale_open_entries.push(entry);
      reasons.push("No update for at least 7 days; revalidate relevance. Age is not evidence of resolution.");
    }
    if (reasons.length) actions.set(entry.entry_id, {
      action_type: "review",
      target_kind: "entry",
      target_id: entry.entry_id,
      summary: `Review: ${entry.summary}`,
      reason: reasons.join(" "),
      priority: entry.importance === "high" ? "high" : "normal"
    });
  }
  return {
    signals: Object.fromEntries(Object.entries(signals).map(([name, items]) => [name, items.slice(0, limit)])),
    recommended_actions: [...actions.values()]
      .sort((a, b) => Number(b.priority === "high") - Number(a.priority === "high"))
      .slice(0, limit)
  };
}
