# Architecture - HiveMind

HiveMind is intentionally small: a REST API owns contracts, service behavior,
and persistence; MCP remains a thin client layer over that API.

## Architecture Principles

- Keep the API as the system of record.
- Keep MCP thin: tool registration, input mapping, API client behavior.
- Keep storage hidden behind the API storage adapter.
- Prefer explicit failure and configuration over silent fallbacks.
- Keep one canonical schema/contract per public shape.
- Require idempotency on create/append operations.
- Store concise structured memory, not transcripts.

## System Overview

```text
MCP client / human UI / scripts
        |
        v
hivemind-mcp or HTTP client
        |
        v
hivemind-api REST routes
        |
        v
service layer + schema validation
        |
        v
storage adapter
        |
        +-- fs-jsonl local backend
        +-- OpenSearch shared backend
```

## Main Components

| Component | Responsibility | Notes |
|---|---|---|
| `hivemind-api/src/http` | REST routes, UI, envelopes, access logs | Public HTTP boundary |
| `hivemind-api/src/app` | Product/service logic | Owns behavior above storage |
| `hivemind-api/src/domain` | Canonical schemas | SSOT for REST/domain shapes |
| `hivemind-api/src/storage` | Backend adapters | Hides backend-specific persistence |
| `hivemind-mcp/src/api-client.mjs` | REST client for MCP runtime | Handles transport/API errors |
| `hivemind-mcp/src/runtime.mjs` | MCP-friendly result mapping | No storage access |
| `hivemind-mcp/src/server.mjs` | MCP tool registration/transports | stdio and Streamable HTTP |
| `scripts/hivemind-standard.mjs` | Apply/check AI ruleset starter files | Writes `.hivemind-standard.json` markers |
| `deploy/hiveforge` | Deployment lifecycle playbooks | Docker Compose/Swarm profiles |

## Boundaries

- MCP -> REST client -> API -> service -> storage adapter -> backend.
- MCP must not import storage implementations.
- Storage adapters must not leak backend details into MCP contracts.
- API envelopes and domain schemas are protected public contracts.
- Deployment templates must preserve the same service semantics as local
  Compose where possible.

## Data Model

Core records:

- projects and project standard profile metadata,
- sessions and closeouts,
- entries,
- learnings and learning feedback,
- issues and issue events,
- rulesets and rule checks,
- idempotency records.

Entries are append-oriented memory records. Existing records can carry
`lifecycle_state`, but first-class correction/supersede workflows are still an
open product need.

## APIs / Contracts / Specs

Canonical schemas live in `hivemind-api/src/domain/schemas.mjs`.
Contract-oriented documentation belongs under `docs/specs/`.

When changing REST or MCP shapes, update schemas, tests, and user-facing docs in
the same change.

## Runtime / Deployment

Local development can run:

```bash
npm run start:api
npm run start:mcp
```

Shared deployments run separate `hivemind-api` and `hivemind-mcp` services,
usually backed by OpenSearch. The default shared ports are `4010` for API/UI and
`4011` for Streamable HTTP MCP.

## Observability

- API `/health` reports service/version/project diagnostics.
- MCP `health_check` checks backend reachability from the client side.
- API server writes structured access logs with request id, method, path,
  status, duration, client IP, user agent, and error code.
- Session closeouts summarize work-unit activity.

## Failure Modes

- MCP can be reachable while API or OpenSearch is down.
- OpenSearch role or restart-policy mistakes can break shared deployments.
- Project identity can become ambiguous without repository metadata.
- Stale open entries can pollute startup/review context.
- Local MCP clients can run stale package versions until parent clients restart.

## Open Architecture Questions

- First-class entry correction/supersede API and MCP tools.
- Project-scoped and admin cross-project memory review tools.
- Optional HiveMap sidecar integration for decision mapping.
- More explicit specs under `docs/specs/` for REST and MCP contracts.
