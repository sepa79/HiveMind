# MCP Client Distribution

HiveMind can run as a central API/storage stack while developers install only the thin MCP client.

## Central Stack

Run the shared service on a server, VM, or Docker host:

```bash
docker compose up
```

Set `HIVEMIND_API_IMAGE` to the published API image first. GitHub Actions
publishes the default API image to GHCR:

```bash
HIVEMIND_API_IMAGE=ghcr.io/<owner>/<repo>/hivemind-api:0.1.0
```

Expose only the HiveMind API endpoint to clients, for example:

```text
https://hivemind.example.com
```

Clients do not need a HiveMind checkout. They only need Node.js, VS Code, and access to the API URL.

## Package The MCP Client

Build a local npm tarball from the repo root:

```bash
npm run pack:mcp
```

This creates:

```text
dist/hivemind-mcp-0.1.0.tgz
```

For a company registry, publish `hivemind-mcp/` as the package instead of distributing the tarball.
CI also uploads the packed MCP tarball as a workflow artifact, and attaches it
to GitHub Releases created from `v*.*.*` tags.

## Install In VS Code

From a published package:

```bash
code --add-mcp '{"name":"hivemind","type":"stdio","command":"npx","args":["-y","hivemind-mcp"],"env":{"HIVEMIND_API_BASE_URL":"https://hivemind.example.com"}}'
```

From a tarball:

```bash
code --add-mcp '{"name":"hivemind","type":"stdio","command":"npx","args":["-y","/path/to/hivemind-mcp-0.1.0.tgz"],"env":{"HIVEMIND_API_BASE_URL":"https://hivemind.example.com"}}'
```

Or use the installer helper:

```bash
scripts/install-vscode-hivemind-mcp.sh https://hivemind.example.com hivemind-mcp
scripts/install-vscode-hivemind-mcp.sh https://hivemind.example.com /path/to/hivemind-mcp-0.1.0.tgz
```

The installer writes a user-level VS Code MCP server. It is not tied to any workspace checkout.

## User Configuration Shape

VS Code user-level `mcp.json` should look like this:

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

## Notes

- Keep the API URL stable; MCP clients read it from `HIVEMIND_API_BASE_URL`.
- Put auth, VPN, or reverse-proxy controls in front of the shared API before broad team use.
- The MCP package is intentionally thin and does not include API or storage code.
