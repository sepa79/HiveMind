# AGENTS.md — {{PROJECT_NAME}}

This file defines how AI contributors should work in this repository.

It is intentionally short and reference-first. Detailed project guidance lives in `docs/`.

---

## 1. Non-negotiable rules

These rules are hard constraints, not suggestions.

- **Read before changing.**
  - Inspect the relevant code, docs, tests, and contracts before editing.
  - Do not invent architecture, APIs, conventions, or commands.

- **NFF — No Fraking Fallbacks.**
  - Do not add silent fallbacks, cascading defaults, heuristic recovery chains, or hidden compatibility shims.
  - Prefer explicit failure and explicit configuration.
  - If fallback behavior is genuinely required, document it and make it visible.

- **KISS.**
  - Prefer simple, boring, maintainable solutions.
  - Avoid clever abstractions unless they clearly reduce real complexity.

- **SSOT for contracts and specs.**
  - One canonical contract/spec/schema per public API, message, config shape, file format, or integration boundary.
  - Do not duplicate DTOs, schemas, validators, or parsers for the same contract unless explicitly justified.

- **No implicit backward compatibility.**
  - Do not preserve old behavior by accident.
  - Compatibility work must be explicit, documented, and tested.

- **No magic strings for core behavior.**
  - Use constants, enums, typed contracts, or documented configuration for core behavior.
  - Parse strings at boundaries, normalize once, then use typed/internal forms.

- **Test meaningful behavior.**
  - Tests should prove behavior, contracts, and failure handling.
  - Do not add decorative tests that only prove mocks.

- **Document important changes.**
  - If behavior, architecture, contracts, commands, deployment, or risk changes, update the relevant docs in the same change.

- **Git safety.**
  - Do not run `git push`.
  - Do not commit unless the human explicitly asks for a commit.
  - Do not rewrite history.

---

## 2. Source of truth order

Read in this order:

1. `README.md`
2. `docs/ai/PROJECT_CONTEXT.md`
3. `docs/ARCHITECTURE.md`
4. `docs/specs/README.md`
5. `docs/ai/COMMANDS.md`
6. `docs/ai/AI_HATS.md`
7. `docs/ai/REVIEW_CHECKS.md`
8. `docs/ai/JESTER_CHECKS.md`
9. `docs/ai/HIVEMIND_RULES.md`

If sources conflict:
- hard rules in this file win,
- then project-specific architecture/specs win,
- then implementation evidence wins,
- otherwise stop and ask or write a clear `TODO:`.

---

## 3. Working style

Before implementation:
1. Identify scope.
2. Read relevant docs/specs/code.
3. Identify affected contracts.
4. Identify tests to run or add.
5. Apply relevant AI hats from `docs/ai/AI_HATS.md`.

During implementation:
- keep changes small,
- stay inside existing boundaries,
- avoid unrelated refactors,
- update docs when behavior changes.

Before final response or PR:
- apply Reviewer hat,
- apply Jester hat,
- run relevant checks from `docs/ai/COMMANDS.md`,
- complete `docs/ai/EVIDENCE_TEMPLATE.md` if requested,
- record durable lessons in HiveMind when available.

---

## 4. Required AI hats

For any non-trivial change, use:

- **Reviewer Hat** — quality, scope, tests, side effects.
- **Jester Hat** — failure modes, retries, idempotency, recovery, production pain.

For architecture, contracts, deployment, or cross-module work, also use:

- **Architect Hat**
- **Tester Hat**
- **Debugger Hat** when fixing incidents or flaky behavior.

---

## 5. HiveMind

If HiveMind is available:
- start a session for meaningful work,
- search prior lessons/rules before repeating investigation,
- store decisions, progress, risks, and lessons as concise structured entries,
- do not dump transcripts,
- end the session when work is complete or abandoned.

If HiveMind is not available:
- use `docs/ai/LESSONS_LEARNED.md` as a fallback only.
