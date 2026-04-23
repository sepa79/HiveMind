# Skrybe MCP MVP Plan

## 1. Goal

`Skrybe` is a standalone MCP server for cross-project development memory.

It should help agents and humans:

- preserve important context between chats,
- keep a lightweight execution journal,
- store project-specific rules of work,
- confirm rule compliance during development,
- recall prior decisions, problems, and useful tooling,
- search past work across sessions, branches, and projects.

`Skrybe` is not a task runner, planner, or source of truth for code.
It is a structured project memory and policy layer.

## 2. Core Product Shape

`Skrybe` combines three loops:

1. `capture`
   Agent writes the important parts of a session.
2. `policy`
   Project defines rules the agent must follow.
3. `recall`
   Next session retrieves the most relevant prior context.

This extends the existing feedback-loop concept from PocketHive:

- keep `tool_event` style structured telemetry,
- keep `feedback_event` style structured reflection,
- add durable project/session/branch memory,
- add project rules and compliance confirmation,
- add retrieval-oriented summaries for the next agent.

## 2A. Target Deployment Shape

For team use, `Skrybe` should be a small distributed system, not a single local MCP process with embedded storage.

Recommended shape:

1. `skrybe-mcp`
   MCP server used by agents inside coding sessions.
2. `skrybe-api`
   HTTP backend exposing the domain API.
3. `storage adapter`
   backend abstraction used by `skrybe-api`.
4. `storage backend`
   concrete implementation such as `fs-jsonl`, later `mongo`, and optionally search indexing.

Logical flow:

`agent -> skrybe-mcp -> HTTP -> skrybe-api -> storage adapter -> backend`

This is the correct boundary if:

- multiple agents will use the same shared memory,
- humans may later use CLI or web UI,
- authentication and auditing matter,
- storage backend will evolve over time.

## 2B. Adapter Boundaries

There are two different adapter layers and they should not be conflated.

### 2B.1 MCP-side API client

Lives inside `skrybe-mcp`.

Responsibilities:

- call `skrybe-api`,
- translate HTTP failures into MCP-friendly responses,
- apply request idempotency headers when needed,
- keep MCP handlers thin.

This is an API client or gateway, not a storage adapter.

### 2B.2 API-side storage adapter

Lives inside `skrybe-api`.

Responsibilities:

- persist projects, sessions, entries, and rule checks,
- provide search and retrieval primitives,
- hide backend-specific details.

This is the true storage adapter.

## 3. Non-Goals

For MVP, `Skrybe` should not:

- become a full PM system,
- replace git, PRs, issues, docs, or code review,
- store arbitrary giant transcripts,
- invent a new canonical planning format,
- do automatic truth inference from vague text,
- enforce rules via hard execution blocking.

The first version should guide and record, not govern.

## 4. MVP Principles

- Store short, structured entries instead of long chat dumps.
- Prefer links to real artifacts over copying their full contents.
- Separate facts, decisions, progress, and opinions by entry type.
- Make project rules explicit and machine-readable enough to confirm.
- Optimize retrieval for the next session, not perfect analytics.
- Start with filesystem-backed storage.
- Make the MCP surface small and composable.

## 5. Main Entities

### 5.1 Project

Represents one codebase or workspace family.

Required fields:

- `project_id`
- `name`
- `root_path`
- `default_branch`
- `description`
- `features[]`
- `categories[]`
- `ruleset_id`
- `created_at`
- `updated_at`

Notes:

- `features[]` are product/domain areas like `billing`, `auth`, `editor`.
- `categories[]` are generic work buckets like `backend`, `frontend`, `infra`, `testing`, `docs`.
- both should be extendable by the project.
- `project_id` should be unique within one `skrybe-api` instance.
- `root_path` is the canonical default repository root for the project; actual per-session checkout paths belong in `workspace_path`.

### 5.2 Session

Represents one development/chat session.

Required fields:

- `session_id`
- `project_id`
- `branch`
- `workspace_path`
- `author_id`
- `author_type`
- `source`
- `agent_id`
- `started_at`
- `ended_at`
- `status`
- `goal`
- `plan_ref`
- `ruleset_version`

Suggested `status` values:

- `active`
- `paused`
- `completed`
- `abandoned`

Notes:

- `branch` is a git branch name scoped to the project, not globally unique across the whole Skrybe instance.
- `session_id` should be globally unique within one `skrybe-api` instance.
- `ruleset_version` should be a monotonically increasing integer per project.
- `agent_id` identifies the executing agent implementation for agent-driven sessions; in v0.1, direct human-authored sessions are a secondary path and can be normalized through `author_type` and `source`.

### 5.3 Entry

Represents one structured journal item.

Required fields:

- `entry_id`
- `project_id`
- `session_id`
- `branch`
- `author_id`
- `author_type`
- `source`
- `entry_type`
- `timestamp`
- `summary`

Optional fields:

- `feature`
- `category`
- `tags[]`
- `details`
- `links[]`
- `artifacts[]`
- `related_rule_ids[]`
- `related_entry_ids[]`
- `lifecycle_state`
- `importance`

Suggested `importance` values:

- `low`
- `normal`
- `high`

Notes:

- `entry_id` should be globally unique within one `skrybe-api` instance.
- `summary` is mandatory and should stay short enough to be useful in search results and brief views.
- `lifecycle_state` is mainly relevant for `risk` and unresolved `feedback` style entries.

Suggested `lifecycle_state` values:

- `open`
- `resolved`
- `superseded`

### 5.4 Rule

Represents one project development rule.

Required fields:

- `rule_id`
- `label`
- `description`
- `severity`
- `check_mode`

Optional fields:

- `evidence_hint`
- `applies_to[]`
- `tags[]`

Suggested `severity` values:

- `required`
- `advisory`

Suggested `check_mode` values:

- `manual_confirm`
- `artifact_required`
- `file_reference_required`
- `command_reference_required`

### 5.5 Rule Check

Represents one agent confirmation for one rule in one session.

Required fields:

- `rule_check_id`
- `project_id`
- `session_id`
- `rule_id`
- `author_id`
- `author_type`
- `source`
- `timestamp`
- `status`

Optional fields:

- `evidence`
- `note`
- `links[]`

Suggested `status` values:

- `applied`
- `not_applicable`
- `blocked`
- `skipped`

Notes:

- `rule_check_id` should be globally unique within one `skrybe-api` instance.

## 6. Entry Types

MVP should support a small fixed set.

### 6.1 `decision`

For fast decisions outside the formal plan.

Examples:

- chosen implementation shape,
- rejected alternative,
- narrowed scope,
- selected storage model.

### 6.2 `plan_ref`

Reference to the active plan file.

This should point to a real file instead of duplicating the whole plan into the database.

For v0.1, `plan_ref` should use a small structured object:

- `kind`
- `target`
- `label?`
- `source?`
- `digest?`

Recommended values:

- `kind`: `file`
- `source`: `agent_plan`, `human_plan`, `imported`

`digest` is optional and can be used later for stale-plan detection.

For v0.1, local absolute paths are acceptable in single-user mode, but for shared team usage the preferred target format should become project-relative rather than machine-absolute.

Recommended long-term direction:

- local mode: absolute file path is acceptable,
- team mode: prefer project-relative file targets plus project context,
- avoid assuming the same absolute path exists on every machine.

### 6.2A `/plan` fit

If the agent framework exposes a `/plan` workflow, `Skrybe` should not model it as a special first-class planning engine in v0.1.

Instead:

- the plan itself remains outside Skrybe,
- `Skrybe` stores a `plan_ref`,
- plan execution updates are stored as `progress` entries,
- plan corrections or plan failures are stored as `feedback` or `decision` entries.

That keeps `Skrybe` compatible with multiple agent frameworks without binding it to one planner implementation.

### 6.3 `progress`

What was completed in this iteration.

Examples:

- implemented parser,
- added tests,
- wired endpoint,
- refactored schema handling.

### 6.4 `feedback`

Structured reflection on what worked and what did not.

Examples:

- tool was useful,
- idea was bad,
- architecture assumption was wrong,
- repeated source of friction.

This is the direct descendant of the PocketHive `feedback_event` concept.

### 6.5 `artifact_ref`

Reference to real outputs.

Examples:

- commit hash,
- PR id,
- file path,
- test command,
- benchmark result,
- review note.

For v0.1, `links[]` and `artifacts[]` should use a minimal object shape:

- `kind`
- `target`
- `label?`

Recommended `kind` values:

- `file`
- `repo_file`
- `commit`
- `pr`
- `command`
- `url`

For team portability, `repo_file` should be preferred over absolute `file` paths whenever the artifact can be expressed relative to the project root.

### 6.6 `tooling_note`

Useful commands, scripts, or workflows.

Examples:

- the one command that reliably reproduces the bug,
- the test subset that is fast and relevant,
- the script that rebuilds fixtures.

### 6.7 `risk`

Known problem or unresolved concern.

Examples:

- flaky test remains,
- migration path unclear,
- branch diverges from current architecture.

## 7. MVP MCP Tool Surface

The first version should stay small.

### 7.1 Project and Session

- `project.register`
- `project.get`
- `project.list`
- `project.set_features`
- `project.set_categories`
- `session.start`
- `session.end`
- `session.get`

### 7.2 Rules

- `rules.define`
- `rules.get`
- `rule_check.submit`
- `rule_check.list_for_session`

### 7.3 Memory Capture

- `entry.append`
- `entry.list_recent`
- `entry.search`
- `entry.get`

### 7.4 Recall

- `context.get_project_brief`
- `context.get_branch_brief`
- `context.get_session_brief`
- `context.get_open_threads`

## 7A. API Surface v0.1

The HTTP API should mirror the domain model closely enough that `skrybe-mcp` stays thin.

Recommended endpoints:

### 7A.1 Projects

- `POST /v1/projects`
- `GET /v1/projects`
- `GET /v1/projects/:projectId`
- `PUT /v1/projects/:projectId/features`
- `PUT /v1/projects/:projectId/categories`

### 7A.2 Sessions

- `POST /v1/sessions`
- `GET /v1/sessions/:sessionId`
- `POST /v1/sessions/:sessionId/end`

### 7A.3 Rules

- `PUT /v1/projects/:projectId/ruleset`
- `GET /v1/projects/:projectId/ruleset`
- `POST /v1/rule-checks`
- `GET /v1/projects/:projectId/rule-checks`

### 7A.4 Entries

- `POST /v1/entries`
- `GET /v1/entries/:entryId`
- `POST /v1/entries/search`
- `GET /v1/projects/:projectId/entries/recent`

### 7A.5 Context

- `GET /v1/projects/:projectId/context/brief`
- `GET /v1/projects/:projectId/branches/:branch/context/brief`
- `GET /v1/sessions/:sessionId/context/brief`
- `GET /v1/projects/:projectId/context/open-threads`

## 7B. Why REST First

REST is the right first transport between `skrybe-mcp` and `skrybe-api` because:

- it is easy to debug,
- easy to proxy,
- easy to secure,
- easy to use from MCP, CLI, and future web UI,
- stable enough for domain-style endpoints.

If later there is a need for streaming or subscriptions, that can be added without changing the storage model.

## 8. Tool Semantics

### 8.1 `project.register`

Creates or updates a project definition.

Input:

- `project_id`
- `name`
- `root_path`
- `default_branch`
- `description?`

Output:

- project metadata
- active ruleset summary
- recent context summary

### 8.2 `session.start`

Opens a new session for a project and branch.

Input:

- `project_id`
- `branch`
- `workspace_path`
- `author_id`
- `author_type`
- `source`
- `agent_id`
- `goal`
- `plan_ref?`

Output:

- `session_id`
- applicable rules
- recent decisions
- recent risks
- recent useful tools
- open threads

This is one of the most important tools because it gives the next agent a compact warm start.

Additional v0.1 behavior:

- if a matching active session already exists for the same `project_id`, `branch`, and `agent_id`, the API may return that session instead of creating a duplicate, provided idempotency semantics are satisfied,
- `session.start` should attach the current `ruleset_version` to the new session snapshot,
- `session.start` should include recall context, but the output must stay bounded and summary-oriented.

### 8.3 `entry.append`

Appends one structured journal entry.

Input:

- `project_id`
- `session_id`
- `branch`
- `author_id`
- `author_type`
- `source`
- `entry_type`
- `summary`
- `details?`
- `feature?`
- `category?`
- `tags[]?`
- `links[]?`
- `artifacts[]?`
- `importance?`

Output:

- stored entry
- optional dedupe or related-entry hints

### 8.4 `entry.search`

Searches prior memory.

Input:

- `project_id?`
- `branch?`
- `entry_type[]?`
- `feature?`
- `category?`
- `tags[]?`
- `query?`
- `limit?`

Output:

- matching entries
- grouped facets
- short search summary

For v0.1, search scope should default to one project unless cross-project search is explicitly requested by an admin or future higher-scope caller.

### 8.5 `rules.define`

Defines or updates the project ruleset.

Input:

- `project_id`
- `rules[]`

Output:

- active ruleset
- version

### 8.6 `rule_check.submit`

Agent records whether a rule was followed.

Input:

- `project_id`
- `session_id`
- `rule_id`
- `author_id`
- `author_type`
- `source`
- `status`
- `evidence?`
- `note?`
- `links[]?`

Output:

- stored rule check
- optional missing-rule reminder

### 8.7 `context.get_project_brief`

Returns compact recall-oriented context.

Output should include:

- active ruleset
- latest `plan_ref`
- latest important decisions
- latest unresolved risks
- latest useful tooling notes
- latest feedback themes

This should be optimized for fast agent consumption, not raw database dumping.

For v0.1, `open_threads` should mean only unresolved structured work items derived from stored data, not arbitrary conversation fragments.

Recommended sources for `open_threads`:

- `risk` entries with `lifecycle_state = open`,
- `rule_check` entries with status `blocked`,
- `feedback` entries with `lifecycle_state = open`,
- future explicit unresolved markers if added later.

## 8A. REST Request and Response Shape

The HTTP API should return compact, predictable payloads with explicit metadata.

Recommended envelope:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request_id": "req-123",
    "timestamp": "2026-04-23T11:30:00Z"
  }
}
```

Error envelope:

```json
{
  "ok": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "No project exists with id 'buzz'.",
    "details": {
      "project_id": "buzz"
    }
  },
  "meta": {
    "request_id": "req-124",
    "timestamp": "2026-04-23T11:31:00Z"
  }
}
```

This gives the MCP layer a stable shape for success and failure classification.

## 8B. Example REST Contracts

### 8B.1 `POST /v1/sessions`

Request:

```json
{
  "project_id": "buzz",
  "branch": "feat/skrybe-mvp",
  "workspace_path": "/home/sepa/buzz",
  "author_id": "codex-main",
  "author_type": "agent",
  "source": "mcp",
  "agent_id": "codex-main",
  "goal": "Define Skrybe MVP architecture",
  "plan_ref": {
    "kind": "file",
    "target": "/home/sepa/buzz/docs/skrybe-mcp-mvp-plan.md"
  }
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "session": {
      "session_id": "sess-123",
      "project_id": "buzz",
      "branch": "feat/skrybe-mvp",
      "status": "active"
    },
    "context": {
      "rules": [],
      "recent_decisions": [],
      "recent_risks": [],
      "recent_tooling_notes": [],
      "open_threads": []
    }
  },
  "meta": {
    "request_id": "req-123",
    "timestamp": "2026-04-23T11:30:00Z"
  }
}
```

### 8B.2 `POST /v1/entries`

Request:

```json
{
  "project_id": "buzz",
  "session_id": "sess-123",
  "branch": "feat/skrybe-mvp",
  "author_id": "codex-main",
  "author_type": "agent",
  "source": "mcp",
  "entry_type": "decision",
  "summary": "Chosen HTTP API plus storage adapter split",
  "details": "MCP will call skrybe-api over REST. Backend storage stays behind API.",
  "feature": "architecture",
  "category": "backend",
  "tags": ["api", "storage"],
  "importance": "high"
}
```

Response:

```json
{
  "ok": true,
  "data": {
    "entry": {
      "entry_id": "ent-200",
      "project_id": "buzz",
      "session_id": "sess-123"
    },
    "hints": {
      "possible_duplicates": [],
      "related_entries": []
    }
  },
  "meta": {
    "request_id": "req-125",
    "timestamp": "2026-04-23T11:32:00Z"
  }
}
```

## 8C. Transport-Level Requirements

For team usage, the API contract should account for:

- `request_id` for tracing,
- `idempotency_key` for append operations,
- later authentication headers,
- later project/team scoping headers if needed.

Even if authentication is deferred in MVP, request tracing and idempotency are worth adding early.

For v0.1, `idempotency_key` should travel as an HTTP header, for example `Idempotency-Key`, not as a body field.

For v0.1, `idempotency_key` should be required for:

- `POST /v1/sessions`
- `POST /v1/entries`
- `POST /v1/rule-checks`

It may be optional for other mutating endpoints where duplicate retries are less harmful.

## 9. Rule Definition Format

The rules format should be structured enough for confirmation and filtering.

Example:

```json
{
  "project_id": "buzz",
  "rules": [
    {
      "rule_id": "always_review",
      "label": "Always review changes",
      "description": "Before closing work, perform a code review mindset pass and record findings or confirm none.",
      "severity": "required",
      "check_mode": "manual_confirm",
      "evidence_hint": "Short note or review artifact reference",
      "tags": ["quality", "review"]
    },
    {
      "rule_id": "always_test",
      "label": "Always test",
      "description": "Run the most relevant available tests before closing work.",
      "severity": "required",
      "check_mode": "command_reference_required",
      "evidence_hint": "Command and result summary",
      "tags": ["quality", "testing"]
    },
    {
      "rule_id": "check_architecture_md",
      "label": "Check Architecture.md",
      "description": "Read the architecture document before making structural changes.",
      "severity": "required",
      "check_mode": "file_reference_required",
      "evidence_hint": "Path reference to Architecture.md",
      "tags": ["architecture"]
    },
    {
      "rule_id": "no_fallbacks",
      "label": "No Freaking Fallbacks",
      "description": "Do not add silent fallback paths unless explicitly approved.",
      "severity": "required",
      "check_mode": "manual_confirm",
      "tags": ["design"]
    },
    {
      "rule_id": "kiss",
      "label": "Keep it simple",
      "description": "Prefer the simplest coherent implementation that satisfies the goal.",
      "severity": "advisory",
      "check_mode": "manual_confirm",
      "tags": ["design"]
    }
  ]
}
```

## 10. Storage Model

Filesystem-first is still the correct first backend choice, but it should sit behind `skrybe-api`.

Important extension:

Even if MVP starts on local files, storage must be behind an adapter from day one and exposed to agents only through the HTTP API.
Otherwise the first migration to team/shared storage will leak through the whole codebase.

### 10.1 Why not Mongo or Elasticsearch yet

- extra infra too early,
- weaker local debuggability,
- harder setup,
- not needed for first validation.

### 10.2 Proposed filesystem layout

This layout should be understood as one backend data root, not as one project-only directory.

So:

- one `skrybe-api` instance can serve many projects,
- each project gets its own subdirectory under the shared data root,
- `.skrybe/` is acceptable for local development, but not the only intended placement.

Recommended mental model:

- `data_root` is configurable, for example:
  - local dev: `/home/sepa/buzz/.skrybe/`
  - shared server: `/var/lib/skrybe/`
  - container volume: `/data/skrybe/`

```text
<data_root>/
  projects/
    buzz/
      project.json
      ruleset.json
      sessions/
        sess-001.json
        sess-002.json
      entries.jsonl
      rule-checks.jsonl
      indexes/
        tags.json
        entry-types.json
        branches.json
    another-project/
      project.json
      ruleset.json
      sessions/
      entries.jsonl
      rule-checks.jsonl
      indexes/
```

If team usage becomes the default, I would avoid repo-local placement as the primary deployment shape.
In that mode the preferred setup is:

- shared `skrybe-api`
- one shared `data_root`
- many projects under `projects/<project_id>/`

Repo-local `.skrybe/` still makes sense for:

- local development,
- offline testing,
- export/import,
- single-user fallback mode.

### 10.3 Storage choices

- append-only JSONL for entries and rule checks,
- plain JSON for project, ruleset, and session summaries,
- optional derived indexes for faster filtering,
- optional daily compaction later.

This keeps writes simple and recovery easy.

## 10A. Storage Adapter

`Skrybe` should define one storage boundary early and keep `skrybe-mcp` unaware of backend details.

### 10A.1 Why it matters

The likely evolution path is:

1. local `skrybe-api` with JSONL backend in one repo,
2. shared `skrybe-api` with local or synced volume for a small team,
3. real multi-user backend such as MongoDB, with optional search indexing.

If writes, filters, and summaries are coupled directly to files, migration cost will be high and behavior will drift.

### 10A.2 Adapter goals

- stable domain-level API,
- backend-specific indexing hidden underneath,
- deterministic writes,
- support for append-heavy workloads,
- support for search and recall queries,
- support for later multi-user concurrency controls.

### 10A.3 Proposed adapter interface

The exact language-level shape can vary, but the service boundary should cover:

- `createProject(project)`
- `getProject(projectId)`
- `listProjects(filter)`
- `upsertRuleset(projectId, ruleset)`
- `getRuleset(projectId)`
- `createSession(session)`
- `updateSession(sessionId, patch)`
- `getSession(sessionId)`
- `appendEntry(entry)`
- `getEntry(entryId)`
- `searchEntries(query)`
- `appendRuleCheck(ruleCheck)`
- `listRuleChecks(query)`
- `getProjectBrief(projectId, options)`
- `getBranchBrief(projectId, branch, options)`

This is intentionally domain-shaped, not database-shaped.

### 10A.4 Query model

The adapter should accept one explicit query object instead of many backend-specific knobs.

Example dimensions:

- `project_id`
- `branch`
- `session_id`
- `entry_type[]`
- `feature`
- `category`
- `tags[]`
- `importance`
- `text`
- `created_after`
- `created_before`
- `limit`
- `sort`

This keeps HTTP handlers and MCP tools stable when storage changes.

### 10A.5 Write model

For appendable records like entries and rule checks:

- prefer immutable append semantics,
- treat edits as rare and explicit,
- allow optional later support for `supersedes_entry_id`.

This aligns well with both JSONL and document databases.

## 10B. Backend Strategy

### 10B.1 `fs-jsonl` adapter

First API-side backend.

Strengths:

- zero infra,
- easy debugging,
- easy export/import,
- ideal for validating schema and workflows.

Weaknesses:

- weak concurrency,
- weak multi-user coordination,
- basic search only,
- awkward for central team memory if used too long.

### 10B.2 `mongo` adapter

Most pragmatic first shared-team backend if you want operational simplicity and document-shaped storage.

Strengths:

- natural fit for project/session/entry documents,
- straightforward indexing,
- acceptable text search,
- easy metadata filtering,
- good enough concurrency for team use.

Weaknesses:

- text search and ranking are still limited compared with search-first engines,
- analytics are possible but not the main strength.

### 10B.3 `opensearch` or `elasticsearch` adapter

Best when search quality becomes the main product value, likely as a secondary indexing layer rather than the first system of record.

Strengths:

- strong full-text search,
- faceting,
- ranking,
- good cross-project retrieval.

Weaknesses:

- more infra,
- more operational complexity,
- awkward as the only source for transactional metadata.

### 10B.4 Recommended path

The practical order is:

1. `fs-jsonl` behind `skrybe-api` for MVP
2. `mongo` behind `skrybe-api` for first shared team rollout
3. optional search adapter later, either:
   - keep Mongo as system of record and add OpenSearch as search index
   - or keep a single backend if search demands stay modest

That path gives you the smallest early cost with a credible team-scale upgrade.

## 10C. Multi-User Design Considerations

If this will be used by a team, some fields should exist already even in MVP schemas.

Recommended additions:

- `author_id`
- `author_type`
- `updated_at`
- `source`
- `visibility`

Suggested meanings:

- `author_id`: stable user or agent identifier
- `author_type`: `human | agent | system`
- `source`: `mcp`, `cli`, `web`, `import`
- `visibility`: `project`, later possibly `private`, `team`, `org`

These fields are cheap now and expensive later if omitted.

For v0.1, I would lock these decisions:

- `author_id` is required on sessions, entries, and rule checks,
- `author_type` is required on sessions, entries, and rule checks,
- `source` is required on sessions, entries, and rule checks,
- `visibility` exists in the schema now, but only `project` is supported in v0.1.

## 10D. Storage-Aware Boundaries

To keep the codebase clean, split the server into these layers:

1. MCP tool handlers
2. MCP-side API client
3. API HTTP handlers
4. application services
5. storage adapter
6. backend implementation

The MCP layer should never know whether data came from JSONL, Mongo, or OpenSearch.
The HTTP handlers should not know backend-specific storage details either.

The application service layer should own:

- validation,
- summarization,
- recall selection,
- rule-check completeness checks,
- duplicate detection heuristics.

The storage layer should own:

- persistence,
- indexing,
- filtering,
- retrieval primitives.

## 11. Search Strategy

MVP search should be simple and deterministic.

### 11.1 First version

- exact filtering on project, branch, type, feature, category, tags,
- plain substring match on `summary` and `details`,
- sort by recency and importance.

### 11.2 Later upgrade path

Later we can add:

- FTS index,
- embeddings,
- Elasticsearch,
- Mongo text search,
- retrieval ranking based on prior usefulness.

But not in v0.1.

## 11A. Search and Recall Boundaries

To avoid muddy behavior, v0.1 should make these boundaries explicit:

- search returns raw matching records plus light facets,
- recall briefs return curated summaries, not raw dumps,
- search is query-driven,
- recall is workflow-driven.

In other words:

- use `entry.search` when the caller knows what they are looking for,
- use `context.get_*` when the caller needs a warm start.

## 12. Reuse From Feedback MCP

The PocketHive feedback MCP already validated several good concepts.
`Skrybe` should reuse them directly.

### 12.1 Reuse as-is

- structured `session_id`
- structured `event_id`
- append-only JSONL logging
- explicit result status
- explicit summary field
- searchable aggregation by type

### 12.2 Extend

- `feedback_event` becomes generic `feedback` entry type,
- `tool_event` becomes optional `artifact_ref` or future `tool_event`,
- per-session summary becomes project/session recall context,
- add rules and rule-check confirmations,
- add project and branch scope.

### 12.3 Important boundary

Do not force every tool call into Skrybe from day one.

For MVP, store only meaningful entries:

- decisions,
- progress,
- feedback,
- rule checks,
- artifacts,
- useful tools,
- risks.

If you log everything, recall quality collapses.

## 12A. Service and Repository Split

The clean repo split is:

### 12A.1 `skrybe-mcp`

Responsibilities:

- MCP tool registration,
- request validation specific to MCP inputs,
- calling `skrybe-api`,
- converting API errors into MCP-friendly responses.

Suggested internal modules:

- `src/tools/`
- `src/api-client/`
- `src/contracts/`
- `src/mappers/`

### 12A.2 `skrybe-api`

Responsibilities:

- REST routing,
- domain validation,
- application services,
- summarization and recall logic,
- storage adapter wiring.

Suggested internal modules:

- `src/http/routes/`
- `src/http/controllers/`
- `src/app/services/`
- `src/domain/`
- `src/storage/adapter/`
- `src/storage/fs-jsonl/`
- `src/storage/mongo/`

### 12A.3 Optional future packages

- `skrybe-cli`
- `skrybe-web`
- `skrybe-sdk`

This split keeps the MCP integration thin and avoids coupling storage evolution to agent tooling.

## 13. Agent Workflow

### 13.1 Start of work

1. Agent reads project instructions from `AGENTS.md`.
2. `AGENTS.md` says to use `Skrybe`.
3. Agent calls `session.start`.
4. Agent receives project brief, rules, open threads, recent decisions.

If the agent uses a planner such as `/plan`, this is the right moment to also submit or update `plan_ref`.

### 13.2 During work

Agent appends only important entries:

- new decision,
- plan reference,
- meaningful progress milestone,
- problem found,
- useful command,
- feedback on bad idea or friction.

### 13.3 Before closing

1. Agent submits relevant `rule_check` entries.
2. Agent appends final `progress` and `feedback`.
3. Agent calls `session.end`.

### 13.4 Next session

1. New agent calls `context.get_project_brief` or `session.start`.
2. Skrybe returns compact prior memory.
3. Agent resumes with less context loss.

## 14. Example Records

### 14.1 `plan_ref`

```json
{
  "entry_id": "ent-001",
  "project_id": "buzz",
  "session_id": "sess-123",
  "branch": "feat/skrybe-mvp",
  "author_id": "codex-main",
  "author_type": "agent",
  "source": "mcp",
  "entry_type": "plan_ref",
  "timestamp": "2026-04-23T10:45:00Z",
  "summary": "MVP implementation plan recorded",
  "links": [
    {
      "kind": "file",
      "target": "/home/sepa/buzz/docs/skrybe-mcp-mvp-plan.md"
    }
  ],
  "importance": "high"
}
```

### 14.2 `decision`

```json
{
  "entry_id": "ent-002",
  "project_id": "buzz",
  "session_id": "sess-123",
  "branch": "feat/skrybe-mvp",
  "author_id": "codex-main",
  "author_type": "agent",
  "source": "mcp",
  "entry_type": "decision",
  "timestamp": "2026-04-23T10:47:00Z",
  "feature": "storage",
  "category": "backend",
  "summary": "Chosen append-only JSONL plus small JSON indexes for MVP storage",
  "details": "Mongo or Elasticsearch deferred until recall/search quality needs exceed local filesystem.",
  "tags": ["storage", "mvp"],
  "importance": "high"
}
```

### 14.3 `feedback`

```json
{
  "entry_id": "ent-003",
  "project_id": "buzz",
  "session_id": "sess-123",
  "branch": "feat/skrybe-mvp",
  "author_id": "codex-main",
  "author_type": "agent",
  "source": "mcp",
  "entry_type": "feedback",
  "timestamp": "2026-04-23T10:55:00Z",
  "summary": "Logging every micro-step would reduce retrieval quality",
  "details": "Only meaningful milestones and decisions should be stored. Full transcript capture would create noise.",
  "tags": ["feedback", "recall-quality"],
  "importance": "high"
}
```

### 14.4 `rule_check`

```json
{
  "rule_check_id": "rc-001",
  "project_id": "buzz",
  "session_id": "sess-123",
  "rule_id": "always_test",
  "author_id": "codex-main",
  "author_type": "agent",
  "source": "mcp",
  "timestamp": "2026-04-23T11:20:00Z",
  "status": "applied",
  "evidence": "npm test",
  "note": "Relevant tests passed"
}
```

## 15. Risks

### 15.1 Noise risk

If agents append too much, search and recall degrade.

Mitigation:

- mandatory short `summary`,
- small set of entry types,
- importance field,
- later dedupe hints.

### 15.2 Low-trust compliance

If `rule_check` is just checkbox theater, it loses value fast.

Mitigation:

- evidence-oriented check modes,
- artifact or file references where possible,
- visible missing-rule summary at session end.

### 15.3 Truth drift

If entries restate docs badly, Skrybe becomes a misinformation cache.

Mitigation:

- prefer links to source artifacts,
- use concise summaries,
- keep `details` optional,
- never treat Skrybe as canonical design source.

### 15.4 Retrieval overload

If recall returns too much, agents will ignore it.

Mitigation:

- brief-oriented retrieval tools,
- cap outputs,
- prioritize recent + high-importance + unresolved.

## 16. Implementation Plan

### Phase 1: API skeleton and local backend

Deliver:

- `skrybe-api` skeleton,
- storage adapter contract,
- `fs-jsonl` backend,
- `POST /v1/projects`,
- `POST /v1/sessions`,
- `POST /v1/entries`,
- `POST /v1/entries/search`.

Success criteria:

- API can create project/session,
- API can append entries,
- API can retrieve recent relevant history,
- storage is replaceable without changing routes.

### Phase 2: MCP integration

Deliver:

- `skrybe-mcp` skeleton,
- API client layer,
- MCP tools for:
  - `project.register`
  - `session.start`
  - `entry.append`
  - `entry.search`

Success criteria:

- agent can use Skrybe entirely through MCP,
- MCP stays thin and transport-oriented,
- API failures map cleanly to MCP responses.

### Phase 3: Rules and compliance

Deliver:

- `rules.define`,
- `rules.get`,
- `rule_check.submit`,
- missing-rule summaries in session closeout.

Success criteria:

- project rules are durable,
- agent can confirm compliance,
- next session can see applicable rules.

### Phase 4: Recall-focused briefs

Deliver:

- `context.get_project_brief`,
- `context.get_branch_brief`,
- `context.get_open_threads`.

Success criteria:

- new session gets compact useful startup context,
- context loss between chats is visibly reduced.

### Phase 5: Team backend rollout

Deliver:

- `mongo` backend for `skrybe-api`,
- migration/import path from `fs-jsonl`,
- basic auth or service-level access control if needed.

Success criteria:

- multiple users can share one Skrybe instance,
- writes and searches stay stable under concurrent use,
- MCP contract remains unchanged.

### Phase 6: Optional analytics

Deliver later if useful:

- top problem themes,
- most useful tooling notes,
- most common rule failures,
- recurring risks.

## 17. Recommended v0.1 Schema Decisions

These are the decisions I would lock early:

- separate `skrybe-mcp` and `skrybe-api`,
- REST between MCP and backend,
- storage adapter behind API,
- `fs-jsonl` as first backend, not as MCP-local persistence,
- `project_id` unique within one Skrybe instance,
- `session_id`, `entry_id`, and `rule_check_id` globally unique within one Skrybe instance,
- `branch` scoped to project, not globally unique,
- append-only JSONL for journal records,
- mandatory `summary`,
- fixed entry types,
- explicit project and branch scope,
- `request_id` in API responses,
- `idempotency_key` for append operations,
- `idempotency_key` required on session, entry, and rule-check creation,
- `visibility` present in schema but fixed to `project` in v0.1,
- `author_id`, `author_type`, and `source` required in v0.1 write contracts,
- ruleset with structured `check_mode`,
- `session.start` returns recall context,
- `plan_ref` stores links, not full plans,
- `/plan` integrates through `plan_ref` plus `progress`/`feedback`, not through a dedicated planner model,
- no transcript dumping,
- no vector search in MVP.

## 18. Recommended Next Build Step

The best next implementation step is:

1. create `skrybe-api` skeleton,
2. define the storage adapter contract,
3. implement `fs-jsonl` backend,
4. expose `POST /v1/projects`, `POST /v1/sessions`, `POST /v1/entries`, `POST /v1/entries/search`,
5. create `skrybe-mcp` skeleton with API client,
6. wire MCP tools for `project.register`, `session.start`, `entry.append`, `entry.search`,
7. only then add rules and recall briefs.

This keeps the first slice small, team-compatible, and structurally correct.
