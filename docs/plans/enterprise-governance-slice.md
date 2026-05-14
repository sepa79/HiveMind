# Enterprise Governance Slice

## Goal

Extend HiveMind from project memory plus rule checks into a lightweight
enterprise engineering guidance layer.

This slice keeps the current deployment assumption:

- one HiveMind API instance represents one organization,
- global configuration is shared across that organization,
- projects are registered within that organization,
- clients connect through MCP or direct REST,
- HiveMind guides, records, and reports; it does not become the source of truth
  for code, tickets, CI, deployments, or hard execution blocking.

## Product Shape

HiveMind should help a developer or agent answer these questions at startup:

- What organization-wide rules apply here?
- What project-specific rules and conventions apply here?
- Which tools, MCP servers, agents, templates, and docs should be used?
- Has anything important changed since this client or project was last seen?
- What actions are required or recommended before work starts?

The startup path should become a small governance handshake:

```text
client -> HiveMind -> global guidance + project guidance + version delta
```

This should complement `session_start`, not replace it. `session_start` remains
the work-unit boundary and provenance envelope.

## Non-Goals

This slice should not:

- add multi-tenancy,
- become a full project-management system,
- own canonical issue/task status,
- replace repository docs,
- silently auto-install tools,
- silently migrate client configuration,
- enforce rules by blocking local agent execution,
- duplicate project contracts already owned by existing rulesets.

## Main Concepts

### Organization Profile

The organization profile is instance-wide configuration.

Suggested fields:

- `organization_id`
- `display_name`
- `default_ruleset_ref`
- `repository_standards[]`
- `architecture_conventions[]`
- `recommended_tools[]`
- `required_tools[]`
- `onboarding_links[]`
- `template_links[]`
- `created_at`
- `updated_at`

There is only one active organization profile per HiveMind instance for now.

### Global Ruleset

Global rules are organization-wide rules that every project inherits unless a
future explicit exception mechanism exists.

Suggested behavior:

- reuse the existing `Rule` shape where possible,
- assign a monotonically increasing `global_ruleset_version`,
- include global rules in startup guidance,
- include global required rules in missing-rule reminders where applicable,
- keep project rules as project-level rules, not copies of global rules.

The storage model should avoid duplicating the same rule into every project.

### Project Profile

A project profile extends project registration with setup and governance
metadata.

Suggested fields:

- `project_id`
- `ruleset_version`
- `global_ruleset_version_seen`
- `repository_standards[]`
- `architecture_conventions[]`
- `recommended_tools[]`
- `required_tools[]`
- `onboarding_links[]`
- `template_links[]`
- `mcp_integrations[]`
- `agent_profiles[]`
- `created_at`
- `updated_at`

This should not replace the existing project metadata. Treat it as an extension
owned by `hivemind-api`, surfaced through MCP.

### Guidance Version

Clients need one compact version marker for cache checks.

Suggested shape:

```json
{
  "organization_profile_version": 4,
  "global_ruleset_version": 7,
  "project_profile_version": 3,
  "project_ruleset_version": 12
}
```

The marker should be returned by startup guidance and `session_start`.

### Guidance Changelog

HiveMind should store human-readable change summaries when rules or setup
guidance changes.

Suggested fields:

- `change_id`
- `scope`: `organization` or `project`
- `project_id?`
- `version_from`
- `version_to`
- `summary`
- `migration_notes[]`
- `warnings[]`
- `recommended_actions[]`
- `links[]`
- `created_at`
- `author_id`
- `source`

Changelog entries are not free-form transcripts. They are concise operational
notes intended for startup deltas and audits.

## Startup Flow

### First Connection

When a client or project has no recorded version marker, HiveMind should return:

- current organization profile,
- current global rules,
- current project profile when a project is known,
- current project rules,
- onboarding links,
- required and recommended tools,
- setup templates,
- the current guidance version marker.

Unknown projects should get organization guidance plus an explicit response that
the project is unregistered.

### Known Project Reconnect

When a client provides its last seen guidance marker, HiveMind should return:

- current guidance marker,
- whether the client is current,
- concise changes since the provided marker,
- migration notes,
- warnings,
- required actions,
- recommended actions.

The client remains responsible for deciding how to display or act on the
response. HiveMind should not silently mutate local client state.

### Session Start

`session_start` should continue returning bounded work-unit context.

Longer term, it should also include:

- active guidance marker,
- global rules summary,
- project rules summary,
- recent guidance changes relevant to the project,
- required actions that affect the current work unit.

Keep the returned context bounded. Large onboarding docs should be links, not
inlined content.

## Registration Modes

### Self-Registration

Teams can create a project directly with `project_register`, then optionally
define project profile fields and project rules.

Expected response:

- registered project metadata,
- inherited organization guidance,
- current global rules,
- next setup actions.

### Central Registration

An admin or automation can pre-register projects and their profiles before teams
connect.

Expected behavior:

- teams joining later receive the configured project guidance automatically,
- project rules and setup templates are available before the first session,
- changes are tracked through profile and ruleset versions.

## API Surface Sketch

Keep MCP thin. Public REST contracts should live in `hivemind-api`; MCP tools
should map to them without extra validation behavior.

Possible REST endpoints:

- `GET /v1/organization/profile`
- `PUT /v1/organization/profile`
- `GET /v1/organization/ruleset`
- `PUT /v1/organization/ruleset`
- `GET /v1/projects/:projectId/profile`
- `PUT /v1/projects/:projectId/profile`
- `POST /v1/guidance/check`
- `GET /v1/guidance/changes`

Possible MCP tools:

- `organization_profile_get`
- `organization_profile_define`
- `organization_rules_get`
- `organization_rules_define`
- `project_profile_get`
- `project_profile_define`
- `guidance_check`

Create/update operations must honor `Idempotency-Key` where applicable.

## Storage Notes

The storage adapter should own persistence for:

- organization profile,
- organization ruleset,
- project profile,
- guidance changelog.

Backends should expose the same adapter contract. The `fs-jsonl` layout and any
OpenSearch index names are backend details and must not leak into MCP contracts.

## Suggested Implementation Phases

### Phase 1: Read-Only Guidance

- Add organization profile and project profile schemas.
- Add storage adapter methods.
- Add REST get/put endpoints.
- Add MCP get/define wrappers.
- Return explicit guidance from `guidance_check`.
- Document the client startup flow.

### Phase 2: Version Deltas

- Add version markers across organization profile, global rules, project profile,
  and project rules.
- Store changelog entries on define/update operations.
- Let `guidance_check` compare a client-provided marker against current state.
- Surface summaries and required actions.

### Phase 3: Session Integration

- Include compact guidance markers and relevant deltas in `session_start`.
- Include global required rules in rule-check reminder logic.
- Add closeout visibility for missing global and project required rules.

### Phase 4: Admin UI

- Add dashboard views for organization profile, project profiles, rules, and
  guidance changes.
- Keep edits explicit and auditable.

## Open Questions

- Should organization rules share the exact existing project `Rule` schema, or
  should they add organization-only fields such as owner/team?
- Should project rules be allowed to override global advisory rules, or only add
  project-specific rules?
- What is the minimum authentication/audit model needed before centralized
  registration is safe?
- Should `guidance_check` be project-scoped only, or also support a pure
  organization-level client bootstrap with no project?
- How should required tools be represented so clients can compare versions
  without HiveMind becoming a package manager?

## Acceptance Criteria

- A new client can request organization guidance without starting a work session.
- A known project can receive project-specific guidance and inherited global
  guidance.
- A client can submit its last seen guidance marker and receive a concise delta.
- Project registration supports both self-registration and central pre-registration
  without duplicating global rules into project state.
- `session_start` can expose the current guidance marker without bloating startup
  context.
- Create/update flows remain idempotent where required.
