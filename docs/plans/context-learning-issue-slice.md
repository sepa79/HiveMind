# Context, Learnings, and Issue Slice Plan

## Goal

Turn `Skrybe` from a structured session journal into a more ergonomic agent-memory system that can:

- bind repeated request context once,
- store actionable operational learnings for the next agent,
- distinguish between informal learnings and formal tracked issues,
- support future MCP-to-Skrybe integrations without collapsing into raw telemetry storage.

This plan focuses on the next product slice after the current `project/session/entry/rules/rule_check` baseline.

## Why This Slice Matters

The current model is already useful for:

- durable project metadata,
- sessions and structured entries,
- rulesets and rule checks,
- bounded warm-start recall.

But the next practical user need is more specific:

- one agent discovers a failure mode or working approach while using another MCP,
- the next agent should be able to ask for recent learnings before trying the same work,
- some of those learnings are just operational knowledge,
- some become formal bugs that need tracking and later fix notes.

This means `Skrybe` needs a stronger distinction between:

- context,
- learnings,
- issues.

## Scope

This slice is intentionally staged.

Planned phases:

1. `context token`
2. `learning.capture` and `learning.get_recent`
3. `learning.search`
4. `session.end`
5. `context.get_project_brief`, `context.get_branch_brief`, `context.get_open_threads`
6. `issue` plus `issue_event`

This plan documents the whole slice, but implementation should start with phases 1 and 2.

## Non-Goals

This slice should not:

- turn `Skrybe` into a generic logging backend,
- create a telemetry firehose from every MCP tool call,
- require agents to repeat full context on every call,
- replace GitHub Issues or project management tools,
- introduce chat-like hidden session state outside explicit contracts.

## Core Product Direction

`Skrybe` should support two different but connected layers of memory:

1. `learning`
   high-signal operational knowledge for the next agent
2. `issue`
   formal tracked bug or problem with lifecycle updates

And one ergonomic foundation:

3. `context token`
   short-lived request context binding for agent or tool workflows

Principle:

- agent writes meaning,
- future tool integrations may write evidence,
- recall should prefer meaning over raw exhaust.

## Phase 1: Context Token

### Problem

Current APIs require too much repeated context such as:

- project,
- branch,
- workspace,
- feature,
- source tool,
- tool version.

This is noisy and becomes worse once learnings and issues are added.

### Proposed Model

Add a context handle that binds request context once and returns a reusable token.

New API surface:

- `context.open`
- `context.get`
- `context.update`
- `context.close`

Suggested input for `context.open`:

- `project_id`
- `branch`
- `workspace_path`
- `feature?`
- `source_tool?`
- `tool_version?`
- `environment?`
- `dataset_version?`
- `author_id`
- `author_type`
- `source`
- `agent_id?`

Suggested output:

- `context_token`
- `resolved_context`
- `created_at`
- durable until explicit close

### Storage Shape

Add a new domain record:

- `context_id`
- `project_id`
- `branch`
- `workspace_path`
- `feature?`
- `source_tool?`
- `tool_version?`
- `environment?`
- `dataset_version?`
- `author_id`
- `author_type`
- `source`
- `agent_id?`
- `status`
- `created_at`
- `updated_at`

The token can be an API-facing alias for a durable stored context record.
Contexts should remain valid until explicit close rather than expiring on a timer.

### Acceptance Criteria

- agent can bind a project and branch once and reuse a token,
- future `learning.*` and `issue.*` calls can rely on `context_token`,
- internal persistence still keeps provenance and branch lineage,
- no hidden conversational state is required.

## Phase 2: Learnings

### Problem

Most useful knowledge discovered during test generation or tool usage is not a formal bug.
It is usually:

- a workaround,
- an environment caveat,
- a tool-specific trick,
- a known data setup pattern,
- a working strategy for a feature area.

This should be queryable as “recent learnings”.

### Proposed Model

Add a first-class `learning` record.

Suggested public write API:

- `learning.capture`
- later `learning.feedback`

Suggested public read APIs:

- `learning.get_recent`
- `learning.search`

Suggested write input:

- `context_token`
- `summary`
- `details?`
- `scope`
  values like `tool`, `env`, `data`, `workflow`, `test_strategy`
- `recommended_action`
- `status`
  values like `active`, `superseded`, `resolved`
- `importance?`
- `tags[]?`
- `links[]?`
- `artifacts[]?`
- `related_issue_ids[]?`

Default behavior:

- new learnings default to `active` unless explicitly resolved or superseded

Follow-up feedback support should allow agents to say “this did not work for me” without invalidating the original learning.
This should be modeled as lightweight comments, confirmations, or negative confirmations rather than destructive edits.

Suggested storage shape:

- `learning_id`
- resolved context snapshot
- `summary`
- `details`
- `scope`
- `recommended_action`
- `status`
- `importance`
- `tags[]`
- `links[]`
- `artifacts[]`
- `related_issue_ids[]`
- `created_at`
- `updated_at`

### Retrieval Behavior

`learning.get_recent` should support:

- `context_token`
- optional overrides such as `feature`, `source_tool`, `status`
- `limit`

`learning.search` should support:

- project-scoped search,
- branch filter,
- feature filter,
- source tool filter,
- scope filter,
- status filter,
- text query,
- active-only or all.

Future ranking should eventually take follow-up confirmations and “did not work for me” feedback into account, not only recency and importance.

### Recall Integration

Once learnings exist, `session.start` should eventually include:

- `recent_learnings`

These should be bounded and sorted for usefulness, not just recency.

### Acceptance Criteria

- agent can store a learning without repeating full project context,
- next agent can ask for recent learnings for a feature area,
- learnings can be marked superseded or resolved,
- learnings remain distinct from formal issues.

## Phase 3: Session End

### Problem

The current lifecycle starts sessions well but does not close them explicitly.

### Proposed Model

Add:

- `session.end`

Suggested output:

- stored session status update,
- missing required rule checks summary,
- optional reminder about active learnings or open issues in the session.

### Acceptance Criteria

- sessions can be marked completed or abandoned,
- closeout can surface missing compliance notes,
- project history becomes easier to read and trust.

## Phase 4: Context Read Models

### Proposed APIs

- `context.get_project_brief`
- `context.get_branch_brief`
- `context.get_open_threads`

These should aggregate:

- rules,
- latest plan reference,
- recent decisions,
- recent risks,
- recent learnings,
- active issues,
- blocked rule checks,
- unresolved feedback.

### Acceptance Criteria

- agents can fetch warm-start context without always creating a session,
- open threads are explicit and bounded,
- read models stay summary-oriented.

## Phase 5: Issues

### Problem

Some learnings are not just useful notes.
They are real bugs:

- tool bugs,
- env defects,
- data defects,
- known failures later fixed in another branch or release.

### Proposed Model

Add:

- `issue`
- `issue_event`

Suggested public APIs:

- `issue.report`
- `issue.get`
- `issue.list`
- `issue.add_event`

Suggested `issue` fields:

- `issue_id`
- resolved context snapshot
- `title`
- `summary`
- `details`
- `status`
  values like `open`, `fixed_pending_verification`, `resolved`, `closed`
- `severity`
- `github_issue_url?`
- `created_at`
- `updated_at`

Suggested `issue_event` types:

- `reported`
- `workaround_added`
- `github_issue_linked`
- `fix_linked`
- `verified_fixed`
- `reopened`

### Relationship with Learnings

Not every learning becomes an issue.

But a learning may reference one or more issues through:

- `related_issue_ids[]`

This supports the desired lifecycle:

- agent finds a failure,
- agent records a workaround as a learning,
- same or another agent reports a formal issue,
- another agent later records “fixed in v7.44” as an issue event,
- a future learning can mark the workaround as superseded.

“Fixed in vX.Y” should be supported in two places:

- as `issue_event` history for the formal bug timeline,
- as learning supersession guidance when the practical advice for agents changes.

### Acceptance Criteria

- active vs resolved issues can be listed clearly,
- workaround history and fix history remain visible,
- GitHub issue links can be attached,
- issues do not replace learnings as the main recent-knowledge channel.

## API Strategy

### Agent-Facing MCP

Use explicit, semantic tools:

- `context.open`
- `context.get`
- `context.update`
- `learning.capture`
- `learning.get_recent`
- `learning.search`
- later `issue.*`

### REST Layer

Keep the same domain split:

- context endpoints,
- learning endpoints,
- issue endpoints.

The MCP remains thin and forwards to REST.

### Future Integration Layer

Do not build generic telemetry ingestion in this slice.

If future MCP-to-Skrybe integrations are added, they should use a separate evidence-oriented model and should not pollute agent recall by default.

## Storage Considerations

Extend the current storage adapter with explicit methods instead of overloading entries:

- `openContext(contextInput)`
- `getContext(contextToken)`
- `updateContext(contextToken, patch)`
- `captureLearning(learningInput)`
- `searchLearnings(query)`
- `createIssue(issueInput)`
- `appendIssueEvent(issueEventInput)`
- `listIssues(query)`

Filesystem backend can use:

- JSON for context summaries if needed,
- append-only JSONL for learnings and issue events,
- JSON summaries for issue state if beneficial,
- indexes later only if recall performance actually requires them.

## Sequence Recommendation

Recommended implementation order:

1. schemas for context and learning
2. storage adapter extensions
3. fs-jsonl persistence
4. REST endpoints
5. MCP tools
6. tests
7. wire recent learnings into `session.start`
8. only then move to issues

Feature handling should evolve beyond a free-form string.
Planned vocabulary management should later support:

- `feature.list`
- `feature.add`
- `feature.remove`
- `feature.rename`

## Testing Plan

Tests should cover:

- context token creation and reuse,
- learning capture with resolved context,
- recent learnings filtering by feature and source tool,
- superseded and resolved learning behavior,
- session recall including bounded recent learnings,
- eventual issue lifecycle and GitHub issue linking.

Keep tests behavior-focused across:

- storage,
- HTTP API,
- MCP runtime.

## Resolved Decisions

- context tokens should be durable until explicit close
- `feature` should evolve into a project-managed vocabulary with future list, add, remove, and rename support
- learnings should default to `active` unless explicitly resolved or superseded
- agents should be able to record “did not work for me” style follow-up feedback without invalidating the original learning
- “fixed in vX.Y” should be supported both as issue history and as learning supersession guidance
- future integration signals should be stored in the same project data root rather than a separate evidence partition

## Definition of Done for the First Implementation Pass

The first implementation pass for this plan is done when:

- `context.open` exists and returns a reusable token,
- `learning.capture` exists and binds to that token,
- `learning.get_recent` can answer the “show me recent learnings” workflow,
- `session.start` can surface bounded recent learnings,
- storage, API, and MCP tests cover the new flow,
- the plan is executed using `Skrybe` itself through `plan_ref` and progress notes.
