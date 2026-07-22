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

Requires `Authorization: Bearer <admin-token>`.

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

## Admin Project Maintenance

All admin project maintenance endpoints require
`Authorization: Bearer <admin-token>`.

`DELETE /v1/admin/projects/:projectId`

Deletes one project and all project-scoped memory.

`POST /v1/admin/projects/merge`

Request:

```json
{
  "source_project_id": "sepa79/SkippyBot",
  "target_project_id": "skippybot",
  "standard_profile_resolution": {
    "strategy": "prefer_source"
  },
  "reason": "Correct non-canonical project registration."
}
```

Moves source project memory into the target project and deletes the source.
The merge fails with `PROJECT_MERGE_CONFLICT` if source identifiers would
overwrite target identifiers.

Delete and merge execute exclusively against other `/v1` requests in the API
process. One data root or OpenSearch index prefix supports one API process; the
deployment contract enforces one replica rather than distributed locking.

Merge is monotonic and resumable: it validates conflicts, idempotently moves
project-scoped records, publishes the target ruleset and metadata, and deletes
the source last. An explicit profile resolution that already produces the
published profile is accepted on retry. OpenSearch retains internal merge
provenance until the source marker is deleted so a successful retry returns
cumulative `moved_counts`, including records moved by earlier attempts. While
matching source and target markers identify an interrupted merge, both projects
reject deletion and unrelated merges with `PROJECT_MERGE_IN_PROGRESS`. After
the source is deleted, the target provenance is inactive and no longer blocks
maintenance. On the filesystem backend, deleting or
merging a legacy parent id that contains another project fails with
`PROJECT_CONTAINS_NESTED_PROJECTS`; migrate the nested project first.

`standard_profile_ref` is resolved automatically when both projects use the
same profile or only one project has a profile. When both profiles are set and
different, `standard_profile_resolution` is required and supports:

- `{ "strategy": "prefer_source" }`
- `{ "strategy": "prefer_target" }`
- `{ "strategy": "set", "standard_profile_ref": "profile@version" }`

The `set` profile must exist in the configured ruleset catalog. The response
includes the source, target, strategy, and resulting profile reference.

## Constraints

- Review endpoints are read-only.
- Lifecycle mutation updates metadata only.
- Correction appends new memory and links it to the original entry.
- Create/append operations require idempotency keys.
