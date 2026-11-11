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
- Documentation before implementation: canonical docs/specs were updated before implementation or test edits, with responsibility owners, expected behavior and acceptance criteria.
- If the plan changed, documentation was revised before further implementation or test edits.
- Planned, implemented, verified and deployed states have separate evidence; a plan does not establish acceptance.
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

---

If you change this tracked standard file, refresh the canonical HiveMind marker for the project with `project_standard_marker_update` or `npm run hivemind:standard -- marker update --project <project-id> --target <repo>`.
