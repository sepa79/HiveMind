# MCP Memory Review Tools

## Purpose

These tools let agents review project memory, explicitly supersede stale
entries, and capture feedback about HiveMind itself without losing audit
history.

## Tools

### `entry_mark`

Marks an existing entry lifecycle state.

Input:

- `project_id`
- `entry_id`
- `lifecycle_state`: `open`, `resolved`, or `superseded`
- `reason`
- optional `replacement_entry_id`

Behavior:

- Updates only lifecycle metadata and audit fields.
- Preserves the original entry summary/details.
- Returns the updated entry and a structured action summary.

### `entry_correct`

Appends a correction/replacement entry and marks the original entry
`superseded`.

Input:

- `project_id`
- `entry_id`
- `session_id`
- `branch`
- `author_id`
- `author_type`
- `source`
- `summary`
- optional `details`, `entry_type`, `category`, `tags`, `links`, `artifacts`,
  `importance`, `reason`, `idempotencyKey`

Behavior:

- Creates a new entry linked to the original entry.
- Marks the original entry `superseded`.
- Returns both records.

### `learning_resolve`

Marks one active learning as `resolved` without deleting its history.

Input:

- `project_id`
- `context_token` for an active context in that project
- `learning_id`
- `expected_revision`
- `reason`
- one or more typed `evidence_refs`
- `resolution_scope`: `project`, `branch`, or `feature`
- optional `backend_id` and `idempotencyKey`

Behavior:

- Checks the current revision and rejects stale or repeated transitions.
- Treats `resolution_scope` as the agent's assertion without constraining the
  global status transition.
- Stores the resolution evidence and actor context snapshot.
- Increments the learning revision and returns the updated learning plus an
  action summary.
- Preserves resolved learnings for explicit history searches while automatic
  recall excludes them.

See the [REST learning lifecycle contract](../api/learning-lifecycle.md).

### `project_review`

Reviews one project's memory and recommends actions.

Input:

- `project_id`
- optional `branch`
- optional `limit`

Output includes:

- project summary
- recent decisions
- `signals.review_queue` for knowledge without applicability, explicit
  `needs_review` records and incidents without lifecycle
- open feedback
- open risks
- stale open entries
- recommended actions

No mutation.

Recent decisions/tooling require explicit current applicability. Superseded or
retired records are available through history search and excluded from review
signals. Resolved decisions can still be current guidance. Seven-day inactivity
only requests revalidation: recommendations use `review`, combine reasons into
one action per entry and never recommend resolution based on age alone. API owns
this policy and filters the full candidate set before response limits; MCP
forwards the response without a second classification layer. See the
[REST review contract](../api/memory-review.md#project-review).

### `hivemind_feedback`

Captures feedback about HiveMind itself even when the current work happens in a
different project.

Input:

- `session_id` in the `hivemind` project
- `branch`
- `author_id`
- `author_type`
- `source`
- `summary`
- optional `details`, `source_project_id`, `source_session_id`,
  `source_entry_id`, `source_workspace_path`, `tags`, `idempotencyKey`

Behavior:

- Always writes to project `hivemind`.
- Uses `entry_type=feedback`, `category=product-feedback`,
  `lifecycle_state=open`, and `importance=high` by default.
- Adds source-context tags/details when provided.

### `admin_memory_review`

Reviews memory across projects for support/admin use. Over Streamable HTTP it
requires the configured MCP admin Bearer token.

Input:

- optional `project_ids`
- optional `branch`
- optional `query`
- optional `limit`

Output includes:

- per-project review summaries
- global open feedback/risk counts
- cross-project recommendations

No mutation.

### `admin_project_delete`

Deletes one project and all project-scoped memory. Requires the configured
MCP admin Bearer token over Streamable HTTP and the API admin token on the
MCP-to-API hop. The MCP client sends this destructive request once and does not
retry transport failures or transient HTTP responses automatically.

Input:

- `project_id`
- optional `backend_id`
- optional `reason`

Output includes:

- deleted project metadata
- deleted record counts
- summary

### `admin_project_merge`

Moves all project-scoped memory from `source_project_id` into
`target_project_id`, then deletes the source project. Requires the configured
MCP admin Bearer token over Streamable HTTP and the API admin token on the
MCP-to-API hop. The merge fails with a conflict instead of silently renaming
records when source identifiers would overwrite target identifiers.
The MCP client sends this destructive request once and does not retry transport
failures or transient HTTP responses automatically.

Input:

- `source_project_id`
- `target_project_id`
- optional `backend_id`
- conditionally required `standard_profile_resolution` when source and target
  use different profiles:
  - `prefer_source`
  - `prefer_target`
  - `set` with `standard_profile_ref`
- optional `reason`

Output includes:

- source and target project ids
- merged target project metadata
- applied standard profile resolution
- moved record counts
- summary

## Audit Rules

- Review tools never mutate.
- Lifecycle and correction tools must be explicit and return updated records.
- Old entry content is retained; corrections are appended and linked.
- In multi-backend MCP setups, mutating tools route to exactly one resolved
  backend and fail when project/backend resolution is ambiguous.

## Automatic recall surfaces

`session_start`, `context_open`, `context_get_project_brief`,
`context_get_branch_brief`, and `context_get_open_threads` expose the API-owned
[automatic recall contract](../api/automatic-recall.md). Session start accepts
optional `feature`. Entry append/correction and learning capture forward
`applicability` to API validation without a separate MCP policy/schema.

These tools return one compact JSON `content` text block, without a duplicate
`structuredContent`. Session start data is `{ session, recall }`, context open
is `{ context, recall }`, and briefs/threads return recall directly. Clients must
consume the new shape; the previous `startup_summary` and session `context`
shapes are removed. Errors retain the standard MCP error representation.

`session_get` accepts `session_id` and optional `backend_id`, maps to
`GET /v1/sessions/:sessionId`, and returns `{ session }` using the normal MCP
JSON result representation. It reads current session metadata without loading
history, closing or resuming the session. It uses the same backend routing as
`session_end`; unknown IDs report `SESSION_NOT_FOUND`.
