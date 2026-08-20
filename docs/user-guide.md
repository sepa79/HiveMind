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
  Example repository-standardization profiles such as `base@v3` and
  `aws-microservice@v3`.

Default endpoints:

- API: `http://127.0.0.1:4010`
- UI: `http://127.0.0.1:4010/`
- health diagnostics: `http://127.0.0.1:4010/health`

MCP clients should call `health_check` as the first diagnostic step. It checks
the configured API `/health` endpoint quickly and reports whether the backend is
`ok`, `unhealthy`, or `unreachable`, including transport details for support.
When MCP is configured with multiple backend profiles, `health_check` reports
each configured deployment.

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

Do not submit a rule check only to prove HiveMind was used. A session with
concise entries is the evidence of use; rule checks are for rules that need a
separate verification signal.

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
aws-microservice@v3
```

`guidance_check` reads the canonical stored marker for the project to learn
whether required starter files are present or the project is assigned to a newer
profile. The starter files are templates: teams are expected to customize them
after applying a profile. Customized content is not drift. The Human UI can show
real drift only after a client refreshes that stored marker from a repository
workspace. A central API or dashboard does not have direct access to a
contributor's local repository files.

Typical flow:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v3 --target /repo
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v3 --target /repo --write
npm run hivemind:standard -- marker update --project my-service --target /repo
```

The first command is a dry-run and writes nothing. `--write` creates missing
files; customized files are skipped unless `--conflict overwrite` is passed.
`marker update` hashes the tracked files in the target repo and stores the
canonical marker in HiveMind for later `guidance_check` and UI drift views.

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
- `HIVEMIND_ADMIN_TOKEN`
  bearer token for `/v1/admin/*` API endpoints and the MCP-to-API hop; if unset,
  the API creates or reuses `admin-token` under `HIVEMIND_DATA_ROOT`
- `HIVEMIND_MCP_ADMIN_TOKEN`
  separate bearer token accepted from Streamable HTTP MCP clients only when
  they invoke `admin_*`; ordinary MCP tools do not require it
- `HIVEMIND_ADMIN_TOKEN_FILE`, `HIVEMIND_MCP_ADMIN_TOKEN_FILE`
  explicit token-file alternatives used by Docker secrets; each is mutually
  exclusive with its matching direct token variable
- `HIVEMIND_BACKENDS`
  JSON backend profile list for MCP clients that need to route across multiple
  separate HiveMind deployments; each item has `backend_id`, `api_base_url`, and
  optional `admin_token_env` for admin tools
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
HIVEMIND_API_IMAGE=ghcr.io/<owner>/hivemind-api:<release-tag>
HIVEMIND_RULESET_CATALOG_PATH=/opt/hivemind/ai-rulesets
```

Admin endpoints require `Authorization: Bearer <token>`. If
`HIVEMIND_ADMIN_TOKEN` is not set, the API creates `admin-token` in
`HIVEMIND_DATA_ROOT` and logs the token source without printing the token value.
Read that file from the host or container and pass the value to a stdio MCP
process as `HIVEMIND_ADMIN_TOKEN`, or configure it in the shared HTTP MCP
service for the MCP-to-API hop.
The API owns token normalization: surrounding whitespace is ignored consistently
for environment, file, and bearer-token inputs. Whitespace-only configured
values and empty token files fail explicitly; an empty environment value is
treated as unset for Compose compatibility.

The shared Streamable HTTP MCP has a separate admin boundary. Configure
`HIVEMIND_MCP_ADMIN_TOKEN` in the MCP service and send it in the
`Authorization: Bearer <token>` header when invoking `admin_*`. Calls to other
MCP tools remain unauthenticated. Keep this client-to-MCP token distinct from
`HIVEMIND_ADMIN_TOKEN`, which authorizes the MCP-to-API hop. If the MCP admin
token is unset, HTTP `admin_*` calls fail with `UNAUTHORIZED`; stdio behavior is
unchanged.

OpenSearch `9200` is not published by the default stack. The API reaches it
over the private Docker network. The shared Docker stack runs separate
`hivemind-api` and `hivemind-mcp` services from the same release image:
`hivemind-api` serves API/UI on `4010`, and `hivemind-mcp` serves Streamable
HTTP MCP on `4011`.

One data root or OpenSearch index prefix supports exactly one running
`hivemind-api` process. MCP and client processes may scale independently, but
the API is a single writer by design. The supplied Swarm configuration fixes
the API at one replica and uses `stop-first` updates; do not scale that service
horizontally without first adding storage-level coordination.

For production environments, provide these passwords through the platform secret
mechanism instead of plain environment variables. The HiveForge Swarm playbooks
consume Docker secrets named `hivemind_opensearch_admin_password` and
`hivemind_opensearch_password` by default; HiveMind does not store secret values
itself.

## Other Projects

HiveMind can track other local repos against the same API. Register them through REST, MCP, or the helper command described in `docs/team-quickstart.md`.
Project metadata must include repository identity (`repository_url` and
`repository_slug`). HiveMind canonicalizes `project_id` from the Git repository
name in `repository_slug`, lowercased and without the owner or `.git` suffix.
For example, `sepa79/HiveMind` becomes `hivemind`. Keep `name` as the display
label, such as `HiveMind`. Re-registering the same normalized
`repository_slug` updates that project's metadata. If a different repository
has the same canonical basename, registration fails with
`PROJECT_ID_REPOSITORY_CONFLICT` and leaves the existing project unchanged.

One HiveMind deployment should have one project record per Git repository. Use
features, branches, sessions, or separate HiveMind deployments for work-stream
separation. Clients should use `project_list` or `project_resolve` instead of
guessing from the local directory name.

For isolated spaces, run separate HiveMind deployments and configure MCP with
`HIVEMIND_BACKENDS`. MCP discovery lists projects across configured backends
and fails when duplicate `project_id` values make routing ambiguous.

Use a small, explicit feature vocabulary for each project. Good feature names are broad work streams, user stories, or plan names.
