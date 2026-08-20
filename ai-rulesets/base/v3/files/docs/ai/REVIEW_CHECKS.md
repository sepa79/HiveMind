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

## Authority and SSOT checks

- Name the single authoritative owner for every affected contract, domain fact, state transition, configuration value, parser/mapper/factory, and operation-success postcondition.
- Search the whole repository for competing definitions and implementations; reviewing only the current diff is insufficient evidence.
- Confirm each domain fact has one writer/state machine. Secondary views are explicitly named read-only projections derived from it.
- Confirm shared configuration, filesystem paths, defaults, and environment settings use one contract/resolver rather than repeated constants or local reconstruction.
- Confirm validators, parsers, normalizers, mappers, factories, response builders, and outcome calculators are not parallel authorities for the same responsibility.
- Confirm success is based on the canonical postconditions, including verified effects where required, rather than attempted actions or optimistic local state.
- Treat two active authorities as a **CRITICAL** finding that blocks approval unless architecture explicitly documents distinct, non-overlapping ownership.

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
- Canonical ownership and the repository-wide duplicate search are included in review evidence.

## Evidence expected

- Commands run.
- Tests passed/failed.
- Manual checks performed.
- Risks/TODOs left behind.

---

If you change this tracked standard file, refresh the canonical HiveMind marker for the project with `project_standard_marker_update` or `npm run hivemind:standard -- marker update --project <project-id> --target <repo>`.
