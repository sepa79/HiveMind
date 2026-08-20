#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${1:-${HIVEMIND_API_BASE_URL:-}}"
PACKAGE_SPEC="${2:-${HIVEMIND_MCP_PACKAGE:-}}"

if [[ -z "$API_BASE_URL" ]]; then
  echo "Usage: $0 <HIVEMIND_API_BASE_URL> <npm-package-or-tarball>" >&2
  echo "Example: $0 https://hivemind.example.com /path/to/hivemind-mcp-<version>.tgz" >&2
  echo "Example: $0 https://hivemind.example.com @company/hivemind-mcp" >&2
  exit 1
fi

if [[ -z "$PACKAGE_SPEC" ]]; then
  echo "Missing MCP package spec." >&2
  echo "Pass a tarball path or a package name from a registry you control." >&2
  exit 1
fi

if ! command -v code >/dev/null 2>&1; then
  echo "VS Code CLI 'code' was not found in PATH." >&2
  exit 1
fi

CONFIG="$(
  node - "$API_BASE_URL" "$PACKAGE_SPEC" <<'NODE'
const [apiBaseUrl, packageSpec] = process.argv.slice(2);
process.stdout.write(
  JSON.stringify({
    name: "hivemind",
    type: "stdio",
    command: "npx",
    args: ["-y", packageSpec],
    env: {
      HIVEMIND_API_BASE_URL: apiBaseUrl
    }
  })
);
NODE
)"

code --add-mcp "$CONFIG"
