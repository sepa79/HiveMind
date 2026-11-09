# Memory freshness and lifecycle

Status: partially delivered. Remaining work is proposed and has no scheduled
implementation date. Reconciled against HiveMind 0.6.0 on 9 November 2026.

## Goal

Give agents bounded, applicable memory and explicit correction workflows while
retaining history and evidence. Completing a task does not retire a standing
decision, and a record's age does not determine whether it is still true.

## Delivered baseline

| Capability | Delivered in | Canonical reference |
| --- | --- | --- |
| Shared automatic recall with project/branch/feature scope, applicability, deduplication and one 8192-byte/eight-item budget | 0.5.5 | [Automatic recall](../specs/api/automatic-recall.md) |
| Current-applicability project/admin review, explicit review queue and no age-only closure recommendation | 0.5.6 | [Memory review](../specs/api/memory-review.md) |
| Explicit learning resolution with revision checks, typed evidence and idempotent recovery | 0.5.7 | [Learning lifecycle](../specs/api/learning-lifecycle.md) |

Entry marking/correction, context handles, work-unit closeouts, issues and
managed feature names already exist. Reuse those surfaces rather than building
parallel owners. Learning resolution changes the learning globally;
`resolution_scope` records the caller's assertion and does not implement a
partial branch-only resolution.

## Remaining work

### P0 Learning supersession

Define a dedicated workflow for replacing all or part of an existing learning
with one or more successors. A learning status value alone does not provide
this workflow.

- Specify the API-owned contract and matching thin MCP mapping before implementation.
- Require an expected revision, reason, typed predecessor/successor references,
  actor context and idempotency key.
- Reject self-reference, cycles, invalid project ownership and ambiguous scope.
- Make successor creation and predecessor transition atomic, or define explicit
  recoverable semantics supported by each adapter; never assume cross-record
  transactions exist.
- Preserve original content and references for historical retrieval.

### P0 One owner for each concern

Link related issues, entries, learnings and rule checks to the explicit owner
of the concern's current state. Do not infer identity from similar titles.

- Distinguish unresolved, deferred, fixed-pending-verification and resolved states.
- A historical blocked check retains its outcome. Current recall should expose
  the linked unresolved concern rather than repeatedly treating the check as a
  new blocker. Missing linkage requires review, not automatic closure.
- Resolving one concern must not resolve another concern or silently expand
  the evidence's branch, revision or environment scope.
- Define project ownership and access constraints for cross-project references.

### P0 Complete history retrieval

Extend existing search/list surfaces with stable cursor traversal, explicit
effective scope, snapshot/as-of semantics and `hasMore`/next-cursor information.
Specify the exact public field names in the owning contracts when implementing.

- Prevent gaps and duplicates during concurrent appends.
- Apply the same ordering, scope and continuation semantics in fs-jsonl and
  OpenSearch.
- Distinguish bounded automatic recall from a complete historical traversal.
- Never silently widen an empty branch/feature query.

### P0 Evidence-based review

Extend existing project/admin review to identify concrete contradictions,
successors and proposed operations with their evidence. The existing review
queue is useful but is not a semantic verification engine.

- Age and negative feedback may request revalidation; neither proves resolution.
- A resolved implementation can leave its governing decision applicable.
- Unknown applicability must remain explicit.

### P1 Evidence context and workflow cost

- Add type-appropriate source revision, observation time, environment/image
  provenance and owner references where they affect applicability. Do not
  require runtime metadata for ordinary design decisions.
- Evaluate explicit feature aliases on top of existing feature list/add/remove/
  rename behavior. Basic vocabulary management is already delivered.
- Consider one explicit bootstrap/closeout orchestration surface over existing
  operations, exposing every step, failure and retry result without hidden
  fallback or closing another agent's active context.

### P2 Controlled application to retained memory

After the relevant P0 capabilities are verified, prepare a separate authorized
data-cleanup plan with exact record IDs, expected revisions and proposed
operations. Preserve history. Product documentation must use synthetic examples;
actual project data, audit findings and environment observations stay outside
this repository.

## Acceptance criteria

- Both adapters and REST/MCP agree on current versus historical behavior.
- Startup/brief responses retain the canonical total budget and explicit
  truncation/omitted-rule reporting after lifecycle changes.
- Rejected ownership, revision, scope or cycle checks produce no partial write.
- Crash/retry tests prove successor/state recovery and idempotency per adapter.
- Stable history traversal remains complete during concurrent appends.
- Explicit history reads never reactivate retired advice in later recall.
- Concern links preserve distinct problems and historical rule-check outcomes.
- Tests use generic synthetic data and verify persistence, not source strings.

## Boundaries and references

Follow [AGENTS.md](../../AGENTS.md): API owns contracts and state; MCP calls REST;
storage adapters hide persistence. This plan does not add a task-board module,
authorize deployments or perform a data cleanup.

See [memory review tools](../specs/mcp/memory-review-tools.md), the
[user guide](../user-guide.md), and historical summaries of
[session semantics](archive/session-semantics-slice.md) and
[contexts/learnings/issues](archive/context-learning-issue-slice.md).
