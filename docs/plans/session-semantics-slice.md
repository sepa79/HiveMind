# Session Semantics Slice

## Goal

Simplify HiveMind session semantics around work units and closeout.

A session is a temporary write/provenance context for one agent/chat task. It is not durable project truth by itself.

Durable project memory lives in:

- entries
- learnings
- issues
- rule checks

Session records help answer who wrote what, when, under which goal, branch, workspace, and plan reference.

## Decisions

- Keep `session_start` and `session_end`.
- Treat `session_start` as the beginning of a work unit.
- Treat `session_end` as a closeout checkpoint, not cleanup.
- Keep old session records for audit/provenance.
- Do not add session TTL or garbage collection until Auth gives token expiry a real security meaning.
- Remove "close old sessions" behavior from the human UI and public API.
- Session status and `ended_at` are operational metadata only.
- Project recall and durable memory must not depend on a session being active or open.

## Product Behavior

### Start

`session_start` returns:

- the session record
- startup summary
- bounded recall context
- project rules/reminders relevant to the current project state

The caller must provide a useful `goal`. If no plan exists, the goal should serve as the ad-hoc work summary.

### During Work

Writes through the session create durable project memory:

- `entry_append`
- `learning_capture`
- `issue_report`
- `rule_check_submit`

Durable records must remain recallable after `session_end`.

### End

`session_end` returns a closeout report:

- session goal and plan reference
- entries recorded in the work unit, grouped by type
- rule checks submitted for the work unit
- missing required rule checks
- active branch learnings and issues
- a short closeout summary for the next agent

The response is a reminder/report, not a hard gate.

## UI Behavior

The human UI should become an audit/activity view:

- list sessions/work units
- show author, branch, goal, plan reference, started time, ended time, and `last_seen_at`
- show counts for entries and rule checks
- avoid cleanup actions like "close older than Xh"

## Tests

- `session_end` returns a useful closeout report.
- project recall still returns durable entries after `session_end`.
- session listing exposes `last_seen_at` and activity counts.
- the UI no longer offers old-session cleanup.
