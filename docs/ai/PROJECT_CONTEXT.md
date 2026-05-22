# Project Context - HiveMind

## Purpose

HiveMind is a local-first project memory service for AI-assisted software work.
It stores concise, structured memory that survives individual chat sessions:
decisions, progress, feedback, risks, rule checks, learnings, issues, and
work-unit closeouts.

## What This Project Does

HiveMind provides an HTTP API, a thin MCP client/server layer, a human inspection
UI, and storage adapters for local JSONL files or OpenSearch. It also ships an
AI ruleset catalog so teams can apply starter project standards such as
`base@v1` or `aws-microservice@v2` to repositories. The main product goal is to
make project memory searchable, auditable, and reusable across agent runs.

## What This Project Does Not Do

- It is not a source-control replacement.
- It is not a task runner or deployment orchestrator.
- It is not a general ticketing/project-management system.
- It does not store raw transcripts.
- It does not silently mutate downstream repositories or tools.

## Main Users / Operators

- AI coding agents that need durable project memory.
- Developers reviewing session history, decisions, and feedback.
- Teams running a shared HiveMind API/MCP service.
- Support/admin users diagnosing MCP/API/storage issues.

## Main Modules

| Module | Purpose | Notes |
|---|---|---|
| `hivemind-api` | HTTP API, validation, service logic, response envelopes | Owns storage-facing behavior |
| `hivemind-mcp` | Thin MCP tool layer and API client | Must not know storage internals |
| `hivemind-api/src/storage` | Storage adapter implementations | `fs-jsonl` and OpenSearch backends |
| `ai-rulesets` | Bundled repository-standardization profiles | Starter templates, not immutable policy files |
| `scripts` | Local bootstrap, standardization, and helper workflows | Keep commands documented in `docs/ai/COMMANDS.md` |
| `deploy/hiveforge` | HiveForge lifecycle playbooks/templates | Docker Compose and Swarm deployment support |

## Runtime Model

Local development usually runs `hivemind-api` on `127.0.0.1:4010` and the MCP
server either over stdio or Streamable HTTP on `127.0.0.1:4011/mcp`. Shared
deployments run the API and MCP services from the same release image, with
OpenSearch as the durable backend.

## Deployment Model

The repository supports:

- local Node.js development,
- Docker Compose with OpenSearch,
- HiveForge-managed Docker Compose and Swarm deployments,
- GHCR-published release images,
- packed `hivemind-mcp` tarballs for client installs.

## Data / Storage Model

`fs-jsonl` is the local backend. OpenSearch is the shared/team backend.
The API owns storage contracts; MCP must call REST and never access storage
directly.

## External Integrations

- MCP clients such as Codex, VS Code, and Claude-compatible clients.
- OpenSearch for shared persistence.
- Docker/Compose/Swarm for deployment.
- HiveForge playbooks for managed lifecycle actions.
- GitHub Actions/GHCR for release publishing.

## Important Risks

- Losing project identity by relying on workspace basename instead of repository
  metadata.
- Silent fallback behavior hiding deployment or storage faults.
- Duplicate public contracts between MCP, REST, schemas, and storage.
- Stale entries remaining open without a lifecycle/correction workflow.
- Shared deployment recovery depending on missing restart policies or hidden
  host state.

## Things AI Agents Must Not Guess

- Public REST/MCP contract shapes.
- Storage backend behavior from MCP code.
- Project identity from directory name alone.
- Deployment safety for purge/remove/upgrade actions.
- Whether old entries are still current without checking lifecycle and newer
  related records.
