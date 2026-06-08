# Commands - HiveMind

Canonical commands for humans and AI agents. Prefer these over ad-hoc guesses.

## Requirements

- Node.js 22 or newer.
- npm.
- Docker/Compose for shared stack validation and local OpenSearch deployments.
- HiveForge only when running lifecycle playbooks.

## Install / Bootstrap

```bash
npm install
./bootstrap.sh
```

`bootstrap.sh` restores demo state when `bootstrap/demo-hivemind-state.tar.gz`
is present.

## Build

There is no separate compile step. Runtime files are plain ESM JavaScript.

```bash
npm run pack:mcp
```

Use `pack:mcp` when validating MCP package contents.

## Test

```bash
npm test
```

## Focused Test

```bash
npm run test:hivemind
```

For a narrower MCP slice:

```bash
npm test -- hivemind-mcp/src/api-client.test.mjs hivemind-mcp/src/runtime.test.mjs
```

## Static Checks

```bash
git diff --check
docker compose config
```

`docker compose config` requires local deployment environment variables such as
`HIVEMIND_API_IMAGE`, OpenSearch credentials, and ports.

## Run Locally

API:

```bash
npm run start:api
```

MCP stdio:

```bash
npm run start:mcp
```

OpenSearch-backed API:

```bash
npm run start:api:opensearch
```

Shared Docker stack:

```bash
docker compose up
```

## Debug / Inspect

```bash
npm run doctor
npm run hivemind:standard -- catalog list
npm run hivemind:standard -- guidance check --project hivemind --target /home/sepa/HiveMind
```

MCP clients should use the `health_check` tool first when diagnosing backend
reachability.

## Standardization

Dry run:

```bash
npm run hivemind:standard -- apply --project hivemind --profile base@v1 --target /home/sepa/HiveMind
```

Write missing standard files while preserving customized files:

```bash
npm run hivemind:standard -- apply --project hivemind --profile base@v1 --target /home/sepa/HiveMind --write
```

## Package / Release

```bash
npm run pack:mcp
```

Version metadata is tracked in `VERSION`, root `package.json`,
`hivemind-mcp/package.json`, and `package-lock.json`.

## Deployment

Local Compose:

```bash
docker compose up
```

HiveForge lifecycle actions are documented in `README.md` and
`deploy/hiveforge/`.

## Known Command Caveats

- Do not run `git push`; project rules reserve pushing for humans.
- Do not commit unless explicitly asked.
- Docker Compose commands need local secret/env configuration.
- Shared deployment operations can affect durable OpenSearch data; treat purge
  and upgrade approvals as protected operations.
- Runtime data under `.hivemind/` is local state and should not be committed.

## Agent Command Rules

- Read `AGENTS.md`, `README.md`, `docs/user-guide.md`, this file, and relevant
  code before editing.
- Record meaningful decisions/progress in HiveMind.
- Capture command output in final summaries when it matters for verification.
