# MCP Backend Routing

## Purpose

HiveMind keeps isolation at deployment level. It does not model tenants inside
one API backend. The MCP layer may be configured with several independent
HiveMind deployments and routes project operations to exactly one backend.

## Configuration

Single-backend mode remains supported:

```sh
HIVEMIND_API_BASE_URL=https://hivemind.example.com
```

Multi-backend mode uses explicit backend profiles:

```sh
HIVEMIND_BACKENDS='[
  {"backend_id":"default","api_base_url":"https://hivemind.example.com"},
  {"backend_id":"skippybot","api_base_url":"https://skippybot-hivemind.example.com"}
]'
```

Backend ids must be unique. Each profile points at a separate HiveMind API
deployment.

## Discovery

- `backend_list` lists configured MCP backend profiles.
- `project_list` lists projects across all configured backends by default.
- `project_resolve` resolves repository/workspace hints across all configured
  backends by default.

Project records returned by MCP discovery include `backend_id` and
`api_base_url` so agents can see where the project lives.

## Routing

Project tools accept optional `backend_id`. When omitted:

- if only one backend is configured, MCP uses it;
- if multiple backends are configured, MCP resolves the target `project_id`
  across configured backends;
- if exactly one backend contains the project, MCP uses it;
- if zero or multiple backends contain the project, MCP fails and requires an
  explicit `backend_id` or configuration cleanup.

`project_resolve` also fails when multiple backends return a matched project
for the same request. MCP must not guess between deployments.

## Non-Goals

- No tenant ids are added to the HiveMind API.
- No cross-backend writes are performed.
- No automatic fallback to another backend after a write/read failure.
