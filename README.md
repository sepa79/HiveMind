# HiveMind

![HiveMind](assets/hivemind-radial-grid-logo.svg)

HiveMind is a local-first project memory service for AI-assisted software work. It gives agents and teammates a shared, structured record of what happened across coding sessions: decisions, progress, feedback, rule checks, learnings, issues, and the work-unit context that produced them.

As of 0.2.0, HiveMind also includes an AI ruleset catalog for onboarding repositories to company standards. A project can be assigned a standard profile such as `aws-microservice@v3`, clients can call `guidance_check` against the canonical stored marker, and `scripts/hivemind-standard.mjs` can dry-run, apply, or refresh the expected starter-file marker for a target repo.

The problem it solves: chat history is fragile, private, and hard to audit. HiveMind turns the useful parts of development work into durable project memory that the next agent or teammate can search, inspect, and reuse.

## Shape

- `hivemind-api` is the HTTP backend and system of record.
- `hivemind-mcp` is the thin MCP server agents connect to.
- `.hivemind/` is the default local filesystem data root.
- `bootstrap/` contains committed seed/demo state for local onboarding.
- `ai-rulesets/` contains example standardization profiles and starter files.
- `hiveforge.yaml` and `deploy/hiveforge/` make the repo deployable through HiveForge.

## Quick Start

Choose the right path first:

- Using an existing shared HiveMind service as a client: do not clone this repo just to run MCP. Install the packaged `hivemind-mcp` client from a `.tgz` artifact or from a private registry package you control. Start with [MCP Client Install For Users](#mcp-client-install-for-users) and [docs/mcp-client-distribution.md](docs/mcp-client-distribution.md).
- Developing or operating this HiveMind repository itself: use the local bootstrap and `npm run start:*` flow below.

Requirements:

- Node.js `22+`
- npm

```bash
./bootstrap.sh
npm run start:api
```

Open:

```text
http://127.0.0.1:4010/
```

Run:

```bash
npm run doctor
```

List bundled AI ruleset profiles:

```bash
npm run hivemind:standard -- catalog list
```

Dry-run applying the AWS microservice starter into a repo:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v3 --target /path/to/repo
```

Standardization flow for a real repo:

```bash
npm run hivemind:standard -- catalog list
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v3 --target /path/to/repo --write
curl -X PUT http://127.0.0.1:4010/v1/projects/my-service/standard-profile -H 'content-type: application/json' -d '{"standard_profile_ref":"aws-microservice@v3"}'
npm run hivemind:standard -- marker update --project my-service --target /path/to/repo
npm run hivemind:standard -- guidance check --project my-service
```

`marker update` requires the project to have the same `standard_profile_ref`
assigned first, whether through the Human UI, REST, or MCP.

Upgrade from an older standard profile:

- `base@v2 -> base@v3`: follow [docs/ai-ruleset-catalog.md](docs/ai-ruleset-catalog.md) and the bundled upgrade guide at [ai-rulesets/base/v3/files/docs/ai/STANDARD_PROFILE_UPGRADE.md](ai-rulesets/base/v3/files/docs/ai/STANDARD_PROFILE_UPGRADE.md).
- `aws-microservice@v2 -> aws-microservice@v3`: apply the `v3` bundle, assign `standard_profile_ref` to `aws-microservice@v3`, refresh the stored marker, then rerun `guidance_check`.

For the full local onboarding flow, use [docs/team-quickstart.md](docs/team-quickstart.md).
For runtime concepts and workflow, use [docs/user-guide.md](docs/user-guide.md).
For AI ruleset catalog usage, use [docs/ai-ruleset-catalog.md](docs/ai-ruleset-catalog.md).
For HiveForge deployment, use [HiveForge Deployment](#hiveforge-deployment), [hiveforge.yaml](hiveforge.yaml), and the HiveForge repo docs at [github.com/sepa79/HiveForge](https://github.com/sepa79/HiveForge).

## Shared Docker Stack

For a shared API backed by OpenSearch:

```bash
docker compose up
```

Create a local `.env` file first:

```bash
OPENSEARCH_INITIAL_ADMIN_PASSWORD=<strong-bootstrap-admin-password>
HIVEMIND_OPENSEARCH_USERNAME=hivemind_api
HIVEMIND_OPENSEARCH_PASSWORD=<strong-service-user-password>
HIVEMIND_API_IMAGE=ghcr.io/<owner>/hivemind-api:<release-tag>
HIVEMIND_RULESET_CATALOG_PATH=/opt/hivemind/ai-rulesets
```

Open:

```text
http://127.0.0.1:4010/
```

The stack runs:

- `hivemind-api` on `4010` with `HIVEMIND_STORAGE_BACKEND=opensearch`
- `hivemind-mcp` on `4011`, using HTTP transport and calling `hivemind-api`
- one private OpenSearch node

One data root or OpenSearch index prefix supports one running `hivemind-api`
process. The supplied deployment keeps the API at one replica and uses
`stop-first` Swarm updates. MCP clients and the MCP service may scale
independently.

OpenSearch `9200` is not published on the host. `docker-compose.yml` uses the image named by `HIVEMIND_API_IMAGE` for both `hivemind-api` and `hivemind-mcp`; CI publishes that image to GHCR. See [docs/plans/opensearch-storage-stack.md](docs/plans/opensearch-storage-stack.md). For a company rollout with shared VS Code MCP clients, use [docs/company-swarm-rollout.md](docs/company-swarm-rollout.md).

## HiveForge Deployment

HiveForge manages this repo through `hiveforge.yaml`.

Repo-local HiveForge manifests:

- [hiveforge.yaml](hiveforge.yaml)
- [hivemind-service.hiveforge.yaml](hivemind-service.hiveforge.yaml)
- [deploy/hiveforge/](deploy/hiveforge/)

Use the current HiveForge operator flow from the HiveForge project docs:

- [HiveForge repository](https://github.com/sepa79/HiveForge)
- [HiveForge README](https://github.com/sepa79/HiveForge#how-to-use)
- [First Swarm quickstart](https://github.com/sepa79/HiveForge/blob/main/docs/quickstart/first-swarm.md)

HiveMind does not duplicate HiveForge MCP or REST usage here. Treat the
HiveForge docs as the source of truth for project registration, environment
policy, requirement validation, and action execution.

The declared lifecycle actions are `deploy`, `remove`, `purge`, `update`, and
`upgrade`.

HiveMind declares two explicit HiveForge profiles:

- `docker-single` - Docker Compose deployment on one Docker engine.
- `swarm` - Docker Swarm deployment of the same shared OpenSearch stack.

Both profiles require a HiveForge managed root with `managedRoot.shared: true`.
The `swarm` profile uses Docker Swarm services and stack-level Docker secrets.

HiveForge profile selection is an action parameter. HiveForge passes the
selected profile to the project playbooks as `HIVEFORGE_PROFILE`; it is not a
project environment requirement.

All HiveMind actions require these explicit project inputs:

```bash
HIVEMIND_API_IMAGE=ghcr.io/sepa79/hivemind-api:<release-tag>
HIVEMIND_OPENSEARCH_USERNAME=hivemind_api
HIVEMIND_OPENSEARCH_INDEX_PREFIX=hivemind
HIVEMIND_OPENSEARCH_TLS_REJECT_UNAUTHORIZED=false
HIVEMIND_RULESET_CATALOG_PATH=/app/ai-rulesets
HIVEMIND_API_PORT=4010
HIVEMIND_MCP_PORT=4011
```

For `docker-single`, also set:

```bash
OPENSEARCH_INITIAL_ADMIN_PASSWORD=<strong-bootstrap-admin-password>
HIVEMIND_OPENSEARCH_PASSWORD=<strong-service-user-password>
```

For `swarm`, create Docker secrets before deploying:

```bash
printf '%s' '<strong-bootstrap-admin-password>' | docker secret create hivemind_opensearch_admin_password -
printf '%s' '<strong-service-user-password>' | docker secret create hivemind_opensearch_password -
```

Override the secret names only when the environment uses different existing
Docker secrets:

```bash
OPENSEARCH_INITIAL_ADMIN_PASSWORD_SECRET=<admin-secret-name>
HIVEMIND_OPENSEARCH_PASSWORD_SECRET=<service-password-secret-name>
```

`HIVEMIND_OPENSEARCH_NODE` is optional. The playbooks default it to
`https://opensearch:9200` for both profiles. In Swarm this uses the service
alias on the stack network, so it remains stable when HiveForge owns the
generated Docker stack name.

The Swarm profile publishes API and MCP ports through Swarm ingress and uses the
stack default network.

For HiveForge contract `0.5`, the project playbooks run with the project root
mounted at `/hf` and render the Compose file to `/hf/stacks/compose.yml`;
HiveForge owns Docker Compose/Swarm execution. Do not run Docker from the
project Ansible playbooks.

HiveForge assigns and persists the deployment slot. Redeploying the same
registered project/component/profile reuses the same Docker project or stack
name, so the scoped `opensearch-data` volume is retained.

`upgrade` and `purge` require explicit approval through the runtime environment:
`HIVEFORGE_UPGRADE_APPROVED=true` and `HIVEFORGE_PURGE_APPROVED=true`
respectively. `purge` deletes OpenSearch data.

## Releases

- Current version: [VERSION](VERSION)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- GitHub Actions workflow: [`.github/workflows/publish.yml`](.github/workflows/publish.yml)

On pushes to `main`, CI runs tests and uploads the packed MCP tarball as a workflow artifact. On `v*.*.*` tags, CI publishes the API container image to GHCR as the tagged version and `latest`, then attaches the MCP tarball to a GitHub Release.

## MCP

If you are a normal user connecting Codex, VS Code, or Claude Desktop to an
existing HiveMind API, do not clone this repo and do not run `npm run
start:mcp`. Use the packaged client from a `.tgz` artifact or a private
registry package instead.

## MCP Client Install For Users

Use the packaged MCP client with your shared API URL:

```bash
HIVEMIND_API_BASE_URL=https://hivemind.example.com npx -y /path/to/hivemind-mcp-<version>.tgz
```

Or install it into VS Code:

```bash
code --add-mcp '{"name":"hivemind","type":"stdio","command":"npx","args":["-y","/path/to/hivemind-mcp-<version>.tgz"],"env":{"HIVEMIND_API_BASE_URL":"https://hivemind.example.com"}}'
```

If you publish the client to a private registry you control, replace the
tarball path with that package spec. Do not assume public `npx -y hivemind-mcp`
resolves to this project.

User-level example configs:

- [docs/examples/codex-mcp.json](docs/examples/codex-mcp.json)
- [docs/examples/claude-desktop-mcp.json](docs/examples/claude-desktop-mcp.json)
- [docs/examples/vscode-user-mcp.json](docs/examples/vscode-user-mcp.json)

For team installs where the API runs centrally and developers install only the
MCP client, see [docs/mcp-client-distribution.md](docs/mcp-client-distribution.md).

## MCP For Local Repository Development

Start the MCP server in another terminal:

```bash
npm run start:mcp
```

Example client configs:

- [docs/examples/codex-local-repo-mcp.json](docs/examples/codex-local-repo-mcp.json)
- [docs/examples/claude-desktop-local-repo-mcp.json](docs/examples/claude-desktop-local-repo-mcp.json)

For shared user-level installs, prefer the packed tarball from `npm run pack:mcp`
or a private registry package you control. Do not assume public
`npx -y hivemind-mcp` resolves to this project.

## Demo State

`./bootstrap.sh` restores `bootstrap/demo-hivemind-state.tar.gz` when present, so a fresh clone shows useful demo history immediately. The committed snapshot currently restores four sanitized projects with real project names and scrubbed sensitive data:

- `hivemind`
- `hivemap`
- `hiveforge`
- `bootstrap`

Refresh the committed, sanitized snapshot intentionally:

```bash
npm run hivemind:refresh-demo
```

`npm run hivemind:save-demo` is still available for ad-hoc local packing of your
current `HIVEMIND_DATA_ROOT`, but it does not fetch or sanitize shared demo
data.

## Tests

```bash
npm test
```

Focused HiveMind slice:

```bash
npm run test:hivemind
```
