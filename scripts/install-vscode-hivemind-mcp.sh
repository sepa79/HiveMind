#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${1:-${HIVEMIND_API_BASE_URL:-}}"
PACKAGE_SPEC="${2:-${HIVEMIND_MCP_PACKAGE:-hivemind-mcp}}"

if [[ -z "$API_BASE_URL" ]]; then
  echo "Usage: $0 <HIVEMIND_API_BASE_URL> [npm-package-or-tarball]" >&2
  echo "Example: $0 https://hivemind.example.com hivemind-mcp" >&2
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
