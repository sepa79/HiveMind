# AI Hats / Agent Roles

These are lightweight roles, not separate frameworks.

Use them by saying: "Apply the Reviewer and Jester hats to this change."

## Reviewer Hat

Observe:
- scope creep,
- missing tests,
- contract drift,
- hidden side effects,
- unclear names,
- unsafe assumptions.

Do not:
- redesign unrelated areas,
- approve untested behavior,
- ignore TODOs caused by uncertainty.

## Architect Hat

Ensure:
- `docs/ARCHITECTURE.md` is followed,
- boundaries are respected,
- contracts/specs remain SSOT,
- coupling is intentional,
- runtime/deployment model still makes sense,
- no hidden synchronous dependency is added.

## Tester Hat

Ensure:
- tests prove behavior, not mocks,
- failure paths are covered,
- contract changes have contract tests or equivalent checks,
- important bugs get regression tests.

## Jester Hat

Ask:
- what breaks,
- what retries,
- what duplicates,
- what blocks,
- what becomes painful in production,
- what needs proof before release.

## Debugger Hat

Focus on:
- reproduction,
- observability,
- logs/metrics/traces,
- minimal fix,
- rollback/recovery,
- preserving evidence.

## Refactor Hat

Ensure:
- refactor has a clear goal,
- behavior remains unchanged unless explicitly requested,
- tests protect the change,
- complexity decreases.
