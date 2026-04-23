# skrybe

Standalone MCP memory service extracted from PocketHive concepts and rebuilt as:

- `skrybe-api`
  - Hono REST backend
  - system of record for projects, sessions, and entries
  - `fs-jsonl` storage adapter for v0.1
- `skrybe-mcp`
  - thin MCP server
  - talks to `skrybe-api` over REST
- `reference/`
  - original PocketHive feedback-loop and scenario-builder POCs kept as reference material
- `docs/`
  - design notes and the current Skrybe MVP plan

## Quick Start

```bash
npm install
npm run bootstrap:skrybe
npm run start:api
```

In another terminal:

```bash
npm run start:mcp
```

## Environment

`skrybe-api`:

- `SKRYBE_DATA_ROOT`
  - optional
  - defaults to `<cwd>/.skrybe`
- `SKRYBE_API_PORT`
  - optional
  - defaults to `4010`

`skrybe-mcp`:

- `SKRYBE_API_BASE_URL`
  - optional
  - defaults to `http://127.0.0.1:4010`

## Tests

```bash
npm test
```

Or only the new Skrybe slice:

```bash
npm run test:skrybe
```

## Guide

See [docs/user-guide.md](docs/user-guide.md) for:

- fresh-clone bootstrap
- persistence layout
- local runtime workflow
- extending the bootstrap pattern to other projects
