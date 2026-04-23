# HiveMind

![HiveMind](assets/hivemind-radial-grid-logo.svg)

Standalone MCP memory service extracted from PocketHive concepts and rebuilt as:

- `hivemind-api`
  - Hono REST backend
  - system of record for projects, sessions, and entries
  - `fs-jsonl` storage adapter for v0.1
- `hivemind-mcp`
  - thin MCP server
  - talks to `hivemind-api` over REST
- `reference/`
  - original PocketHive feedback-loop and scenario-builder POCs kept as reference material
- `docs/`
  - design notes and the current HiveMind MVP plan

## Quick Start

```bash
npm install
npm run bootstrap:hivemind
npm run start:api
```

Open the human session UI at:

```text
http://127.0.0.1:4010/
```

In another terminal:

```bash
npm run start:mcp
```

## Environment

`hivemind-api`:

- `HIVEMIND_DATA_ROOT`
  - optional
  - defaults to `<cwd>/.hivemind`
- `HIVEMIND_API_PORT`
  - optional
  - defaults to `4010`

`hivemind-mcp`:

- `HIVEMIND_API_BASE_URL`
  - optional
  - defaults to `http://127.0.0.1:4010`

## Tests

```bash
npm test
```

Or only the new HiveMind slice:

```bash
npm run test:hivemind
```

## Guide

See [docs/user-guide.md](docs/user-guide.md) for:

- fresh-clone bootstrap
- human session UI
- persistence layout
- local runtime workflow
- extending the bootstrap pattern to other projects
