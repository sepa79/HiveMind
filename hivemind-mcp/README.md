# HiveMind MCP Client

Thin stdio MCP server for a shared HiveMind API.

## Run

```bash
HIVEMIND_API_BASE_URL=https://hivemind.example.com npx -y hivemind-mcp
```

Shared local Streamable HTTP transport:

```bash
HIVEMIND_MCP_TRANSPORT=http HIVEMIND_MCP_PORT=4011 HIVEMIND_API_BASE_URL=https://hivemind.example.com npx -y hivemind-mcp
```

## VS Code

Use this server configuration in user-level `mcp.json`:

```json
{
  "servers": {
    "hivemind": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "hivemind-mcp"],
      "env": {
        "HIVEMIND_API_BASE_URL": "https://hivemind.example.com"
      }
    }
  }
}
```

Replace the API URL with your shared HiveMind API endpoint.

Admin tools such as `admin_memory_review`, `admin_project_delete`, and
`admin_project_merge` require authorization. For stdio, set
`HIVEMIND_ADMIN_TOKEN` in the MCP process environment. For Streamable HTTP,
also set a distinct `HIVEMIND_MCP_ADMIN_TOKEN` in the shared MCP process and
send it as `Authorization: Bearer <token>` on admin tool calls. Ordinary HTTP
MCP tools remain available without a token. In multi-backend setups, use
`admin_token_env` in each backend profile to point at the API admin token for
that backend. Docker deployments can use `HIVEMIND_ADMIN_TOKEN_FILE` and
`HIVEMIND_MCP_ADMIN_TOKEN_FILE` instead of direct token values.

For clients that support Streamable HTTP, run one shared local MCP process and point the client at:

```text
http://127.0.0.1:4011/mcp
```

## Tool Names

MCP tools use underscore-separated names such as `project_list`,
`project_resolve`, `project_register`, `health_check`, `session_start`,
`entry_append`, `session_end`, and admin names such as `admin_project_merge`.
This keeps the server
compatible with clients that only accept tool names matching `[a-z0-9_-]`.

## Diagnostics

Use `health_check` first when a client cannot tell whether HiveMind is down or
misconfigured. The tool calls the configured `HIVEMIND_API_BASE_URL` `/health`
endpoint with a short timeout and returns `status: "ok"`, `"unhealthy"`, or
`"unreachable"` with the API URL, latency, and transport/API error details.
