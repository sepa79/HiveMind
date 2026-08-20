# PR Preparation

Before preparing a PR or final change summary:

## Required hats

- Reviewer Hat
- Jester Hat

## Add when relevant

- Architect Hat for architecture/contracts/boundaries/deployment.
- Tester Hat for test strategy or bug fixes.
- Debugger Hat for incidents/flaky behavior.
- Refactor Hat for structure-only changes.

## Checklist

- Scope stayed inside the task.
- Relevant docs were read.
- Relevant specs/contracts were updated.
- The canonical owners for affected contracts, state, configuration, transformations, and success postconditions are named.
- A repository-wide search found no competing active authority, or the change removes it.
- Relevant tests were added or updated.
- Commands were run from `docs/ai/COMMANDS.md`.
- Evidence was captured.
- Risks and TODOs are explicit.
- No secrets were added.
- No forbidden git actions were performed.
- HiveMind was updated if available.

## Summary format

```text
Summary:
- ...

Tests:
- ...

Risks/TODOs:
- ...

Hats applied:
- Reviewer
- Jester
```
