# HiveMind User Guide

## What HiveMind Is

HiveMind is a small project-memory service for coding sessions. It stores concise structured records that survive beyond one chat or agent run.

It is meant for:

- project and branch memory
- work-unit provenance
- important decisions and progress
- feedback and friction
- project rules and rule checks
- AI ruleset catalog profiles and standardization guidance
- reusable learnings and tracked issues
- bounded recall for the next session

It is not a task runner, source-control replacement, or detailed project-management system.

For first-run setup, use `docs/team-quickstart.md`. This guide focuses on the runtime model.

## Runtime Shape

Default local pieces:

- `hivemind-api`
  HTTP API, validation, service logic, and persistence orchestration.
- `hivemind-mcp`
  Thin MCP layer that talks to the API over REST.
- `.hivemind/`
  Default local filesystem data root.
- OpenSearch
  Optional shared backend for Docker/team use.
- `bootstrap/`
  Committed seed/demo assets for local onboarding.
- `ai-rulesets/`
  Example repository-standardization profiles such as `base@v1` and
  `aws-microservice@v2`.

Default endpoints:

- API: `http://127.0.0.1:4010`
- UI: `http://127.0.0.1:4010/`
- health diagnostics: `http://127.0.0.1:4010/health`

The API writes one structured JSON access log line per request when started
through `hivemind-api/src/server.mjs`. Each line includes request id, method,
path, status, duration, client IP from forwarding headers when present, user
agent, and error code for failed requests.

## Memory Model

Durable project memory lives in:

- project metadata
- project standard profile metadata
- rulesets
- entries
- learnings
- issues
- rule checks

Sessions are work-unit write contexts and provenance envelopes. A session helps answer "who wrote this, on which branch, during what task?" The session itself is not project truth, and recall should not depend on a session remaining active.

`session_end` is a closeout checkpoint. It records end metadata and returns a report with entries, rule checks, missing required checks, and active learnings/issues. It is not a cleanup operation.

## Entry Types

Use entries for concise, high-signal memory:

- `decision`
  durable design or implementation choice
- `plan_ref`
  link to a plan file or external plan
- `progress`
  meaningful milestone
- `feedback`
  friction, lesson, or follow-up note
- `artifact_ref`
  output reference such as a file, command, commit, or PR
- `tooling_note`
  local workflow/tool behavior worth remembering
- `risk`
  unresolved concern

Use `feature`, `category`, `tags`, and `links` when they improve future recall. Prefer repo-relative `repo_file` links for repository files.

## Recommended Agent Workflow

For meaningful work:

1. Start a session early with a useful goal.
2. Read the returned startup summary and project features.
3. Record important decisions, progress, feedback, risks, and plan references.
4. Use features/tags for useful grouping, not micro-task tracking.
5. Run relevant tests.
6. Submit relevant rule checks.
7. End the session and inspect the closeout report.

For local shell work, `npm run hivemind:work -- ...` wraps the common `session_start`, progress logging, rule checks, and `session_end` flow. See `docs/team-quickstart.md` for exact commands.

## AI Ruleset Catalog

HiveMind 0.2.0 can expose a read-only catalog of standard starter profiles.
The default catalog lives in `ai-rulesets/`, and shared deployments can point at
a company-maintained checkout:

```bash
HIVEMIND_RULESET_CATALOG_PATH=/opt/hivemind/ai-rulesets
HIVEMIND_RULESET_CATALOG_SOURCE_URL=https://git.company.example/eng/ai-rulesets
```

Assign a project to a profile during registration or later through the standard
profile endpoint/MCP tool. Example profile ref:

```text
aws-microservice@v2
```

Clients can call `guidance_check` with the local `.hivemind-standard.json`
marker to learn whether the repo is current, missing files, or assigned to a
newer profile. The marker is produced by the standardization CLI:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v2 --target /repo
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v2 --target /repo --write
```

The first command is a dry-run and writes nothing. `--write` creates missing
files and `.hivemind-standard.json`; changed files are skipped unless
`--conflict overwrite` is passed.

## Human UI

The API serves a local dashboard at `http://127.0.0.1:4010/`.

The dashboard is for human inspection:

- work-unit/session list
- session details and closeout activity
- project-memory entry search
- filters by project, branch, feature, tag, and type

Session IDs are mostly provenance; normal users should drill into them only when auditing details.

## Local Data

Persistence is per API instance and per `HIVEMIND_DATA_ROOT`.

Default data root:

```text
<repo>/.hivemind
```

Shared Docker deployments can use OpenSearch instead of the filesystem data root:

```bash
HIVEMIND_STORAGE_BACKEND=opensearch
HIVEMIND_OPENSEARCH_NODE=https://opensearch:9200
HIVEMIND_OPENSEARCH_USERNAME=hivemind_api
HIVEMIND_OPENSEARCH_PASSWORD=<service-user-password>
```

Important environment variables:

- `HIVEMIND_STORAGE_BACKEND`
  choose `fs-jsonl` or `opensearch`
- `HIVEMIND_DATA_ROOT`
  choose a different data root
- `HIVEMIND_OPENSEARCH_NODE`
  OpenSearch URL when `HIVEMIND_STORAGE_BACKEND=opensearch`
- `HIVEMIND_OPENSEARCH_INDEX_PREFIX`
  OpenSearch index prefix; default is `hivemind`
- `HIVEMIND_OPENSEARCH_USERNAME`
  OpenSearch service user for the API; required for the OpenSearch backend
- `HIVEMIND_OPENSEARCH_PASSWORD`
  OpenSearch service user password; required for the OpenSearch backend
- `HIVEMIND_OPENSEARCH_TLS_CA_FILE`
  optional CA file for HTTPS OpenSearch deployments
- `HIVEMIND_OPENSEARCH_TLS_REJECT_UNAUTHORIZED`
  `true` or `false`; defaults to `true` for HTTPS
- `HIVEMIND_API_PORT`
  choose a different API port
- `HIVEMIND_API_BASE_URL`
  point the MCP server or wrapper at a different API instance
- `HIVEMIND_RULESET_CATALOG_PATH`
  choose the local filesystem catalog path for AI ruleset profiles
- `HIVEMIND_RULESET_CATALOG_SOURCE_URL`
  optional display/audit URL for the source repository behind the catalog

Committed seed/demo files live under `bootstrap/`. Runtime data under `.hivemind/` stays local and should not be committed directly.

For the Docker OpenSearch stack, create a local `.env` file next to `docker-compose.yml` with:

```bash
OPENSEARCH_INITIAL_ADMIN_PASSWORD=<strong-bootstrap-admin-password>
HIVEMIND_OPENSEARCH_USERNAME=hivemind_api
HIVEMIND_OPENSEARCH_PASSWORD=<strong-service-user-password>
HIVEMIND_API_IMAGE=ghcr.io/<owner>/<repo>/hivemind-api:0.2.0
HIVEMIND_RULESET_CATALOG_PATH=/opt/hivemind/ai-rulesets
```

OpenSearch `9200` is not published by the default stack. The API reaches it over the private Docker network.

For production environments, provide these passwords through the platform secret mechanism instead of plain environment variables. The repository stack documents the required values but does not implement a secret backend.

## Other Projects

HiveMind can track other local repos against the same API. Register them through REST, MCP, or the helper command described in `docs/team-quickstart.md`.

Use a small, explicit feature vocabulary for each project. Good feature names are broad work streams, user stories, or plan names.
