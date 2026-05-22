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

### `project_review`

Reviews one project's memory and recommends actions.

Input:

- `project_id`
- optional `branch`
- optional `limit`

Output includes:

- project summary
- recent decisions
- open feedback
- open risks
- stale open entries
- recommended actions

No mutation.

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

Reviews memory across projects for support/admin use.

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

## Audit Rules

- Review tools never mutate.
- Lifecycle and correction tools must be explicit and return updated records.
- Old entry content is retained; corrections are appended and linked.
- In multi-backend MCP setups, mutating tools route to exactly one resolved
  backend and fail when project/backend resolution is ambiguous.
