# Session semantics

Status: completed work-unit slice; historical design summary. Reconciled on
9 November 2026. Use the [user guide](../../user-guide.md) and
[automatic recall contract](../../specs/api/automatic-recall.md) for current behavior.

## Delivered scope

- `session_start` opens a task/work-unit provenance context with a useful goal.
- `session_end` produces a closeout rather than deleting durable memory.
- Session listing exposes activity counts and `last_seen_at`.
- The human UI presents work-unit activity and closeouts rather than old-session
  cleanup actions.
- Durable entries, learnings and issues remain retrievable after session end.

## Current startup shape

Session startup returns `{ session, recall }`. There is no separate
`startup_summary` or legacy `context` copy. Recall selection, scope and total
response budgets are defined only in the canonical automatic-recall contract.

## Closeout responsibilities

Closeout includes the goal/plan reference, entries grouped by type, submitted
rule checks, missing required checks, active scoped learnings/issues and a
summary. It reports results; it is not a hard execution gate.

Session status and `ended_at` are operational metadata. Ending a session does
not revoke the applicability of durable project decisions. A future token-expiry
or access-control design requires a separate explicit decision; this slice did
not introduce session TTL or garbage collection.
