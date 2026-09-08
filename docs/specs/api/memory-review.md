# REST Memory Review Contracts

## Purpose

REST contracts for entry lifecycle maintenance, entry corrections, project
memory review, and admin cross-project review.

Automatic startup and brief reads use the separate [automatic recall contract](automatic-recall.md). Review/search remains an explicit history surface.

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

`signals.recent_decisions` and `signals.tooling_notes` contain only knowledge
with explicit `applicability.state=current`. A resolved decision can remain
current; resolved tooling notes and resolved incidents are historical.
Superseded entries and entries with `applicability.state=retired` are excluded
from every review signal and recommendation. Explicit entry search still
returns them.

`signals.review_queue` contains unclassified knowledge, entries explicitly
marked `needs_review`, and incidents without a lifecycle state. It is separate
from current knowledge. `open_feedback` and `open_risks` describe explicit open
incidents; an incident awaiting applicability verification can also appear in
the queue. `stale_open_entries` means open entries without an update for at least
seven days; it does not imply that their advice is obsolete or their task done.

The current implementation emits only `review` actions. Reasons identify
missing applicability/lifecycle, explicit verification requests (including the
stored applicability reason), open concerns, or age-based revalidation. Multiple
signals for one entry produce one action with combined reasons. High-priority
actions precede normal ones, then preserve entry recency order. The calling
agent/human evaluates evidence and explicitly invokes lifecycle/correction tools;
the API does not infer semantic resolution, successor relationships or conflicts.

The complete matching entry set is classified before applying `limit` (default
10, maximum 50) independently to each signal and the recommendation list. Branch
filtering remains exact; without a branch the review covers the project. Review
is read-only and does not update lifecycle, applicability or timestamps.

## Admin Memory Review

`POST /v1/admin/memory-review`

Each included project uses the same knowledge filtering, verification queue and
recommendation policy as project review. The admin `query` filters entry
summary/details before classification; its per-project limit defaults to 10 and
has maximum 20.

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

Delete and merge acquire exclusive locks for their project(s) in the API
process. Project-scoped requests, including learning/issue creation, acquire
shared locks for the same project. Unrelated project requests can proceed even
while maintenance waits for a busy project. Global inventory/review reads are
not a transactionally consistent snapshot across projects. One data root or
OpenSearch index prefix supports one API process; the deployment contract
enforces one replica rather than distributed locking.

Requests addressed by context token or session id resolve their project, acquire
its lock, and revalidate ownership before executing. If the resource was deleted
in between, they return `404 CONTEXT_NOT_FOUND` or `404 SESSION_NOT_FOUND`. If a
merge moved it, they return `409 PROJECT_SCOPE_CHANGED` without executing or
automatically retrying the operation.

For JSON requests, any body field repeating a URL selector (`project_id`,
`session_id`, `context_token`, `entry_id`, `issue_id`, or `feature`) must match
the URL after whitespace trimming. A mismatch returns
`400 ROUTE_PARAMETER_MISMATCH` with `details.field`; matching redundant fields
are accepted. Body fields cannot redirect an operation to an unlocked resource.

OpenSearch collection deletion uses delete-by-query with `refresh=true` and
`conflicts=abort`. A returned timeout, conflict, failure, missing completion
fields, or unequal total/deleted count produces `502 STORAGE_DELETE_INCOMPLETE`.
Transport/backend errors also fail the operation. Missing collection indices
are errors, not empty collections. Ruleset and project metadata are deleted
only after all collection deletions succeed. Earlier deletions are not rolled
back on failure; an explicit retry continues cleanup from the retained project.
The same checks apply to source cleanup during merge.

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
