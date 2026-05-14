# Review Checks — {{PROJECT_NAME}}

Use this before preparing or reviewing a PR/change.

## General checks

- Scope is clear and not wider than requested.
- No unrelated refactors.
- Naming is understandable.
- Code follows project style.
- Behavior changes are documented.
- Tests cover meaningful behavior.
- Failure paths are considered.
- Logs/metrics/errors are useful.
- No secrets or personal data are added.
- No hidden fallback or compatibility shim is introduced.
- Contracts/specs are updated before or with implementation changes.

## Tech-stack-specific checks

The bootstrap agent must fill this section after inspecting the repository.

TODO: Add checks for the detected tech stack.

Examples:
- Java/Spring: dependency injection boundaries, DTO/contracts, transaction boundaries, Testcontainers where useful.
- Node/TypeScript: strict types, package scripts, validation, ESM/CJS consistency.
- Python: virtualenv, typing, linting, packaging, test isolation.
- React/UI: component boundaries, accessibility, loading/error states.
- Docker/Compose: healthchecks, volumes, ports, environment variables.
- Game projects: deterministic simulation rules, save compatibility, performance, input handling.

## Contract/spec checks

- Public API or message changes have a matching spec update.
- Config/env changes are documented.
- Breaking changes are explicit.
- Idempotency is considered for create/append/publish operations.

## Evidence expected

- Commands run.
- Tests passed/failed.
- Manual checks performed.
- Risks/TODOs left behind.
