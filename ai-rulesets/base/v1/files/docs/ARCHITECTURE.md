# Architecture — {{PROJECT_NAME}}

This file is the starting SSOT for architecture.

Keep it concise. Link to deeper docs/specs when needed.

## Purpose

TODO: Describe the project purpose after inspecting the repository.

## Architecture principles

- Keep boundaries explicit.
- Keep contracts/specs as SSOT.
- Prefer simple, observable flows.
- Prefer explicit configuration over hidden defaults.
- Avoid hidden synchronous dependencies.
- Avoid fallback chains that hide real failures.
- Design retries with idempotency, backoff, limits, and visibility.
- Make recovery and debugging possible.

## System overview

TODO: Describe the system at a high level.

```text
TODO: Simple text or Mermaid diagram.
```

## Main components

| Component | Responsibility | Notes |
|---|---|---|
| TODO | TODO | TODO |

## Boundaries

TODO: Describe module/service/package boundaries.

## Data model

TODO: Describe important data/state.

## APIs / contracts / specs

Canonical specs live under:

- `docs/specs/`

Do not create duplicate contract definitions without documenting why.

## Runtime / deployment

TODO: Describe local and deployed runtime shape.

## Observability

TODO: Logs, metrics, traces, dashboards, health checks.

## Failure modes

TODO: Known failure modes and recovery expectations.

## Open architecture questions

- TODO
