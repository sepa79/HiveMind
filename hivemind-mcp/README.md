# HiveMind MCP Client

Thin stdio MCP server for a shared HiveMind API.

## Run

```bash
HIVEMIND_API_BASE_URL=https://hivemind.example.com npx -y hivemind-mcp
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

## Tool Names

MCP tools use underscore-separated names such as `project_register`,
`session_start`, `entry_append`, and `session_end`. This keeps the server
compatible with clients that only accept tool names matching `[a-z0-9_-]`.
