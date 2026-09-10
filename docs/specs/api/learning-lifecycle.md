# Learning Lifecycle

## Resolve an existing learning

`POST /v1/projects/{projectId}/learnings/{learningId}/resolve` marks one active
learning as resolved. It requires `Idempotency-Key` and this JSON body:

```json
{
  "context_token": "ctx-...",
  "expected_revision": 0,
  "reason": "The permanent fix is verified.",
  "evidence_refs": [
    { "kind": "repo_file", "target": "test/permanent-fix.test.mjs" }
  ],
  "resolution_scope": "branch"
}
```

The context must be active and belong to the route project. `resolution_scope`
records the resolving agent's assertion and does not constrain the operation or
create a partial lifecycle state. The status transition is global, and the
caller is responsible for choosing the correct scope. Evidence uses the
canonical link shape and requires at least one item.

New learnings start at revision `0`. Existing records without a stored revision
are explicitly treated as revision `0`. Resolution compares `expected_revision`,
changes `active` to `resolved`, increments the revision, and stores the reason,
evidence, scope, actor context snapshot, and timestamp on the learning. The
learning remains available through historical search but is excluded from
automatic recall.

The response contains the updated `learning` and an `action` summary. A retry
with the same idempotency key and identical payload returns the same result. A
different payload using that key fails with the standard idempotency conflict.
Missing keys, stale revisions, inactive learnings, closed contexts, and
ownership mismatches fail explicitly. A retry of a completed operation remains
valid after its context is closed. Storage keeps recovery metadata on the
resolved learning so a retry can repair an interrupted idempotency-record write.

MCP exposes the same contract as `learning_resolve`.
