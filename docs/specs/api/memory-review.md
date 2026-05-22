# REST Memory Review Contracts

## Purpose

REST contracts for entry lifecycle maintenance, entry corrections, project
memory review, and admin cross-project review.

## Entry Lifecycle

`POST /v1/projects/:projectId/entries/:entryId/mark`

Request:

```json
{
  "lifecycle_state": "superseded",
  "reason": "Replaced by newer deployment decision.",
  "replacement_entry_id": "ent-..."
}
```

Response data:

```json
{
  "entry": {},
  "action": {
    "entry_id": "ent-...",
    "previous_lifecycle_state": "open",
    "lifecycle_state": "superseded",
    "reason": "Replaced by newer deployment decision.",
    "replacement_entry_id": "ent-..."
  }
}
```

## Entry Correction

`POST /v1/projects/:projectId/entries/:entryId/corrections`

Requires `Idempotency-Key`.

Request creates a new entry and marks the original as `superseded`.

## Project Review

`POST /v1/projects/:projectId/review`

Request:

```json
{
  "branch": "main",
  "limit": 20
}
```

Response data includes `project`, `summary`, `signals`, and
`recommended_actions`. Each recommended action has:

- `action_type`: `mark_superseded`, `mark_resolved`, `create_issue`,
  `update_docs`, `verify_state`, or `review`
- `target_kind`: `entry`, `project`, `docs`, or `deployment`
- `target_id`
- `summary`
- `reason`
- `priority`: `low`, `normal`, or `high`

## Admin Memory Review

`POST /v1/admin/memory-review`

Request:

```json
{
  "project_ids": ["hivemind", "skippybot"],
  "branch": "main",
  "query": "HiveMind",
  "limit": 10
}
```

Response data includes all reviewed projects plus global recommendations.

## Constraints

- Review endpoints are read-only.
- Lifecycle mutation updates metadata only.
- Correction appends new memory and links it to the original entry.
- Create/append operations require idempotency keys.
