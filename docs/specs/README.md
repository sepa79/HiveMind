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
- Implementation follows the spec, not the other way around.
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

## Schema / shape

TODO

## Compatibility notes

TODO

## Examples

TODO

## Validation rules

TODO
```
