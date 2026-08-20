# MCP Client Distribution

HiveMind can run as a central API/storage stack while developers install only the thin MCP client.

## Central Stack

Run the shared service on a server, VM, or Docker host:

```bash
docker compose up
```

Set `HIVEMIND_API_IMAGE` to the published API image first. GitHub Actions
publishes versioned API images to GHCR from `v*.*.*` tags:

```bash
HIVEMIND_API_IMAGE=ghcr.io/<owner>/hivemind-api:<release-tag>
```

The shared Compose stack now runs both:

- `hivemind-api` on `4010`
- `hivemind-mcp` on `4011`

Expose the HiveMind API endpoint to stdio MCP clients, for example:

```text
https://hivemind.example.com
```

Clients that support Streamable HTTP can instead connect to the central
`hivemind-mcp` endpoint, for example `https://hivemind-mcp.example.com/mcp`.

Clients do not need a HiveMind checkout. They only need Node.js, VS Code, and access to the API URL.
Ordinary Streamable HTTP tools do not require authentication. Admin tools
require the client to send `Authorization: Bearer <HIVEMIND_MCP_ADMIN_TOKEN>`.
The shared MCP service separately uses `HIVEMIND_ADMIN_TOKEN` when calling API
admin endpoints. Do not reuse one secret for both hops.

## Package The MCP Client

Build a local npm tarball from the repo root:

```bash
npm run pack:mcp
```

This creates:

```text
dist/hivemind-mcp-<version>.tgz
```

For a company registry, publish `hivemind-mcp/` as the package instead of distributing the tarball.
CI also uploads the packed MCP tarball as a workflow artifact, and attaches it
to GitHub Releases created from `v*.*.*` tags.

Because the public npm package name `hivemind-mcp` is not a safe onboarding
assumption, prefer the tarball or a private registry package you control.

## Install In VS Code

From a private registry package you control:

```bash
code --add-mcp '{"name":"hivemind","type":"stdio","command":"npx","args":["-y","<private-package-spec>"],"env":{"HIVEMIND_API_BASE_URL":"https://hivemind.example.com"}}'
```

From a tarball:

```bash
code --add-mcp '{"name":"hivemind","type":"stdio","command":"npx","args":["-y","/path/to/hivemind-mcp-<version>.tgz"],"env":{"HIVEMIND_API_BASE_URL":"https://hivemind.example.com"}}'
```

Or use the installer helper:

```bash
scripts/install-vscode-hivemind-mcp.sh https://hivemind.example.com <private-package-spec>
scripts/install-vscode-hivemind-mcp.sh https://hivemind.example.com /path/to/hivemind-mcp-<version>.tgz
```

The installer writes a user-level VS Code MCP server. It is not tied to any workspace checkout.

For multiple separate HiveMind deployments, configure explicit backend
profiles instead of mixing tenants into one API:

```bash
code --add-mcp '{"name":"hivemind","type":"stdio","command":"npx","args":["-y","/path/to/hivemind-mcp-<version>.tgz"],"env":{"HIVEMIND_BACKENDS":"[{\"backend_id\":\"default\",\"api_base_url\":\"https://hivemind.example.com\"},{\"backend_id\":\"skippybot\",\"api_base_url\":\"https://skippybot-hivemind.example.com\"}]"}}'
```

## User Configuration Shape

VS Code user-level `mcp.json` should look like this:

```json
{
  "servers": {
    "hivemind": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "/path/to/hivemind-mcp-<version>.tgz"],
      "env": {
        "HIVEMIND_API_BASE_URL": "https://hivemind.example.com"
      }
    }
  }
}
```

Multi-backend user-level config:

```json
{
  "servers": {
    "hivemind": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "/path/to/hivemind-mcp-<version>.tgz"],
      "env": {
        "HIVEMIND_BACKENDS": "[{\"backend_id\":\"default\",\"api_base_url\":\"https://hivemind.example.com\"},{\"backend_id\":\"skippybot\",\"api_base_url\":\"https://skippybot-hivemind.example.com\"}]"
      }
    }
  }
}
```

## Shared Local HTTP MCP

Clients that support Streamable HTTP can share one local MCP process instead of
starting one stdio process per VS Code window:

```bash
HIVEMIND_MCP_TRANSPORT=http HIVEMIND_MCP_PORT=4011 HIVEMIND_API_BASE_URL=https://hivemind.example.com npx -y /path/to/hivemind-mcp-<version>.tgz
```

Then configure the client to use:

```text
http://127.0.0.1:4011/mcp
```

## Notes

- Keep API URLs stable; MCP clients read either `HIVEMIND_API_BASE_URL` for
  single-backend mode or `HIVEMIND_BACKENDS` for explicit multi-backend mode.
- Duplicate project ids across configured backends are treated as MCP
  configuration errors. The client fails instead of guessing a backend.
- Put auth, VPN, or reverse-proxy controls in front of the shared API before broad team use.
- The MCP package is intentionally thin and does not include API or storage code.
