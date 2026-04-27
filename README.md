# HiveMind

![HiveMind](assets/hivemind-radial-grid-logo.svg)

HiveMind is a local-first project memory service for AI-assisted software work. It gives agents and teammates a shared, structured record of what happened across coding sessions: decisions, progress, feedback, rule checks, learnings, issues, and the work-unit context that produced them.

The problem it solves: chat history is fragile, private, and hard to audit. HiveMind turns the useful parts of development work into durable project memory that the next agent or teammate can search, inspect, and reuse.

## Shape

- `hivemind-api` is the HTTP backend and system of record.
- `hivemind-mcp` is the thin MCP server agents connect to.
- `.hivemind/` is the default local filesystem data root.
- `bootstrap/` contains committed seed/demo state for local onboarding.

## Quick Start

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

For the full local onboarding flow, use [docs/team-quickstart.md](docs/team-quickstart.md).
For runtime concepts and workflow, use [docs/user-guide.md](docs/user-guide.md).

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
HIVEMIND_API_IMAGE=ghcr.io/<owner>/<repo>/hivemind-api:0.1.0
```

Open:

```text
http://127.0.0.1:4010/
```

The stack runs `hivemind-api` with `HIVEMIND_STORAGE_BACKEND=opensearch` and a single private OpenSearch node. OpenSearch `9200` is not published on the host. `docker-compose.yml` uses the image named by `HIVEMIND_API_IMAGE`; CI publishes the API image to GHCR. See [docs/plans/opensearch-storage-stack.md](docs/plans/opensearch-storage-stack.md). For a company rollout with shared VS Code MCP clients, use [docs/company-swarm-rollout.md](docs/company-swarm-rollout.md).

## Releases

- Current version: [VERSION](VERSION)
- Changelog: [CHANGELOG.md](CHANGELOG.md)
- GitHub Actions workflow: [`.github/workflows/publish.yml`](.github/workflows/publish.yml)

On pushes to `main`, CI runs tests and uploads the packed MCP tarball as a workflow artifact. On `v*.*.*` tags, CI publishes the API container image to GHCR as the tagged version and `latest`, then attaches the MCP tarball to a GitHub Release.

## MCP

Start the MCP server in another terminal:

```bash
npm run start:mcp
```

Example client configs:

- [docs/examples/codex-mcp.json](docs/examples/codex-mcp.json)
- [docs/examples/claude-desktop-mcp.json](docs/examples/claude-desktop-mcp.json)
- [docs/examples/vscode-user-mcp.json](docs/examples/vscode-user-mcp.json)

For team installs where the API runs centrally and developers install only the MCP client, see [docs/mcp-client-distribution.md](docs/mcp-client-distribution.md).

## Demo State

`./bootstrap.sh` restores `bootstrap/demo-hivemind-state.tar.gz` when present, so a fresh clone can show useful demo history immediately.

Refresh that snapshot intentionally:

```bash
npm run hivemind:save-demo
```

## Tests

```bash
npm test
```

Focused HiveMind slice:

```bash
npm run test:hivemind
```
