# Automatic Memory Recall

First implementation slice of the memory freshness plan. API domain schemas
own this contract; both storage backends supply records to the same selection
policy. This changes the previous startup/brief response shapes.

## Surfaces

- Session start returns `{ session, recall }`; optional `feature` scopes recall
  and is persisted in the session. It no longer returns separate `context` and
  `startup_summary` copies of memory.
- Context open returns `{ context, recall }`.
- Project and branch briefs return the recall document directly. Project brief
  uses the context's branch/feature; it does not widen the scope silently.
- Open threads returns a recall document with `view: "threads"`, without rules
  or guidance. Its optional limit can reduce the thread count, not widen scope.

Recall contains `scope` (project_id, branch, feature), `view`, `rules`,
`project_guidance`, `guidance`, `open_threads`, `counts`, `review_required`,
`truncated`, `required_rules_omitted`, `budget`, and `retrieval`.
Items carry their kind/id, a short summary, selection state (`current` applicability or unresolved incident status) and the
selection reason. They do not embed historical details or executable
recommended actions. Memory is informational and never grants authorization.

## Current session metadata

`GET /v1/sessions/:sessionId` returns data `{ session }` using the canonical
session record schema, including its current project, branch, optional feature
and status. It includes no journal entries, closeout or automatic recall.
Unknown sessions return `404 SESSION_NOT_FOUND`. Reads use the existing project
ownership resolution, locking and revalidation used by other session routes.
Ended sessions remain readable; this read does not reactivate them.

CLI `--resume` fetches this metadata, requires an active session, refreshes its
local state and compares any explicit feature with the current server value.
`run` fetches it again after the command, before appending progress, to observe
feature renames during command execution. Lookup failures or an inactive session
stop the workflow without sending progress from cached metadata.

## Applicability and lifecycle

Entry append/correction and learning capture accept optional `applicability`:

```json
{
  "state": "current",
  "scope": "branch",
  "reason": "Verified against the current repository contract.",
  "evidence_refs": [{ "kind": "repo_file", "target": "docs/specs/api.md" }]
}
```

States: `current`, `needs_review`, `retired`. Scopes: `project`, `branch`,
`feature`. Reason and at least one evidence reference are required. Feature
scope requires the entry/context to name a feature. Applicability is a recorded
assertion, independent of the status of an implementation task; it does not
claim deployment or verification on an arbitrary revision/environment.

- Decisions with explicit current applicability are eligible even when their
  implementation lifecycle is `resolved`. Superseded decisions are excluded.
- Tooling notes need current applicability and cannot be resolved/superseded.
- Learnings need current applicability, active lifecycle and no negative
  feedback. Negative feedback requires review, never automatic resolution.
- Open risks/feedback and active issues represent unresolved concerns. They
  must match the branch and, when selected, feature. Closed/resolved/superseded
  incidents never become candidates merely to fill remaining space.
- Missing applicability for knowledge entries, missing lifecycle for incident
  entries, and unlinked historical blocked checks are counted for review. Their
  text is not injected as current advice. Existing data is not rewritten.
- Historical authorization/tooling records without a current applicability
  assertion are excluded along with other unclassified knowledge. Even a
  selected record remains informational, never an authorization grant.

Project guidance requires explicit project scope and is presented separately.
Branch scope must match the branch. Feature scope must match branch and feature.
When no feature is requested, branch-wide knowledge and incidents without a
feature are eligible; feature-specific records require an explicit feature.
No matching candidates means empty arrays. Age and importance never override
these eligibility checks. Sorting is deterministic: required rules, project
guidance, incidents by severity/importance, scoped guidance, with timestamp and
kind/id tie breakers. Dedupe uses record identity, never similar titles.

## Budget and completeness

The default logical API response data budget is **8192 UTF-8 bytes**, including
the entire session/context record when returned, all memory sections and recall
metadata. Creation input metadata is limited to 2048 UTF-8 JSON bytes. HTTP/MCP protocol envelopes are outside this data budget. MCP carries
one compact JSON text representation of automatic recall, avoiding a second
copy in structuredContent. There is one **8-item memory limit** shared across
guidance and threads; rules count against the byte budget and precede memory.

The byte and item budgets are applied once to the complete candidate set with
all final response metadata already included. If a candidate cannot fit, later
smaller candidates remain eligible in priority order. The open-thread limit
counts included threads, not candidates rejected for size.

Whole items are omitted rather than truncating rules or advice mid-sentence.
`counts` describes eligible candidates before the budget; `review_required`
counts withheld ambiguous records, not resolved problems. `truncated` reports
budget omissions and `required_rules_omitted` explicitly reports incomplete
required guidance. A missing project ruleset fails explicitly with `RULESET_MISSING`
instead of implying there are no rules. `retrieval` points to rules_get and explicit history/search
tools. No omitted required rule may be interpreted as permission to proceed
without fetching it. Oversized non-memory metadata fails explicitly rather
than bypassing the budget. Session/context creation validates metadata size
before persistence; idempotent retries still resolve to the same stored object.

## First-slice boundaries

Historical search/list and session closeout remain explicit history surfaces.
They do not reactivate records or adopt this automatic-recall filter.
Review counts identify work that still needs classification; they do not mutate
records. Learning resolution/supersession, revision checks, typed concern-owner
links (including dedupe across linked records), snapshot pagination and expanded
revision/environment applicability remain subsequent slices of P0/P1. Historical
blocked checks are withheld pending explicit owner linking; existing open risks
and active issues are still shown in their declared scope.

OpenSearch initialization explicitly installs session feature and opaque
applicability mappings on existing indices; mapping failures stop initialization.
No historical records are reclassified during this schema update. Session feature
references participate in feature rename and in-use deletion checks.
