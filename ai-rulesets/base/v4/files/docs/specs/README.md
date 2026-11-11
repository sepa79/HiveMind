# Specs / Contracts

This directory is the canonical home for project specs and contracts.

Use it for:
- REST/OpenAPI contracts,
- message/event contracts,
- queue/topic/routing definitions,
- config schemas,
- file formats,
- CLI contracts,
- MCP/tool contracts,
- integration contracts.

## Rules

- One canonical spec per contract.
- Documentation before implementation: read-only investigation may precede documentation; before implementation or test edits, update canonical docs/specs for changes to behavior, architecture, contracts, configuration, commands, deployment or risk.
- Include responsibility owners, expected behavior and acceptance criteria.
- If the plan changes, revise those documents before further implementation or test edits.
- A plan is not evidence of implementation, verification, deployment or acceptance.
- Contract changes must be reviewed.
- Breaking changes must be explicit.
- If generated code is used, document source spec and generation command.
- Do not keep duplicate schemas/DTOs/parsers for the same contract without documenting why.

## Suggested structure

```text
docs/specs/
  README.md
  api/
  events/
  config/
  integrations/
  mcp/
```

## Contract template

```markdown
# Contract name

## Purpose

TODO

## Owner / consumers

TODO

## Expected behavior

TODO

## Acceptance criteria

TODO

## Schema / shape

TODO

## Compatibility notes

TODO

## Examples

TODO

## Validation rules

TODO
```

---

If you change this tracked standard file, refresh the canonical HiveMind marker for the project with `project_standard_marker_update` or `npm run hivemind:standard -- marker update --project <project-id> --target <repo>`.
