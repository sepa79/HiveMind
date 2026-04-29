# Company Swarm Rollout

This runbook describes the intended company deployment shape:

```text
VS Code / MCP clients -> HiveMind API/UI -> OpenSearch
```

Developers and agents do not need a HiveMind checkout to use the shared service.
They only need the MCP client package and the shared API URL.

## 1. Decisions To Make First

Choose these values before deployment:

```text
HIVEMIND_PUBLIC_URL=https://hivemind.company.example
REGISTRY_IMAGE=ghcr.io/<owner>/<repo>/hivemind-api:0.1.3
STACK_NAME=hivemind
INDEX_PREFIX=hivemind
SERVICE_USER=hivemind_api
```

For production, put passwords in the platform secret mechanism. The current
stack keeps required variables explicit and documents where secrets belong; it
does not implement a secret backend.

## 2. Build And Publish The API Image

CI publishes the API image to GHCR only from version tags such as `v0.1.3`.
For a private company registry, mirror or rebuild the tagged image from a
trusted build machine:

```bash
docker build -t registry.company.example/hivemind-api:0.1.3 .
docker push registry.company.example/hivemind-api:0.1.3
```

Swarm does not build images during `docker stack deploy`, so the image must
already be available to every node through the registry.

## 3. Prepare Swarm Environment

On a Swarm manager:

```bash
export OPENSEARCH_INITIAL_ADMIN_PASSWORD='<strong-bootstrap-admin-password>'
export HIVEMIND_OPENSEARCH_USERNAME='hivemind_api'
export HIVEMIND_OPENSEARCH_PASSWORD='<strong-service-user-password>'
export HIVEMIND_OPENSEARCH_INDEX_PREFIX='hivemind'
export HIVEMIND_API_IMAGE='ghcr.io/<owner>/<repo>/hivemind-api:0.1.3'
```

Deploy:

```bash
docker stack deploy -c docker-compose.yml hivemind
```

Expected services:

```bash
docker stack services hivemind
```

```text
hivemind_hivemind-api      1/1
hivemind_opensearch        1/1
hivemind_opensearch-init   0/1
```

`opensearch-init` is a one-shot initializer. `0/1` with a completed task is
expected after it creates the role, user, and role mapping.

## 4. Network Exposure

Expose only HiveMind API/UI to clients:

```text
https://hivemind.company.example
```

Do not publish OpenSearch `9200` to the company network unless there is an
explicit operational need. OpenSearch should stay reachable only from the
HiveMind stack network.

In a normal VM-based Swarm, the default service names should work:

```text
HIVEMIND_OPENSEARCH_NODE=https://opensearch:9200
```

If the company stack runs in LXC or another environment where Swarm VIP routing
does not work, use an explicit task endpoint instead:

```text
HIVEMIND_OPENSEARCH_NODE=https://tasks.opensearch:9200
```

If published ingress ports do not accept traffic in that environment, publish
the API port in Swarm `host` mode and constrain the API service to the node that
owns the public address or reverse proxy target.

## 5. Smoke Test The Server

From an admin workstation:

```bash
curl -fsS https://hivemind.company.example/health
```

Register the shared project if it does not exist yet:

```bash
curl -fsS -X POST https://hivemind.company.example/v1/projects \
  -H 'Content-Type: application/json' \
  --data-binary '{
    "project_id": "hivemind",
    "name": "HiveMind",
    "root_path": "/workspace/hivemind",
    "default_branch": "main",
    "description": "Shared company HiveMind memory."
  }'
```

Run a write smoke test:

```bash
SESSION_ID="$(
  curl -fsS -X POST https://hivemind.company.example/v1/sessions \
    -H 'Content-Type: application/json' \
    -H 'Idempotency-Key: company-smoke-session' \
    --data-binary '{
      "project_id": "hivemind",
      "branch": "main",
      "workspace_path": "/workspace/hivemind",
      "author_id": "company-admin",
      "author_type": "human",
      "source": "cli",
      "goal": "Smoke test company HiveMind deployment"
    }' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>console.log(JSON.parse(s).data.session.session_id))'
)"

curl -fsS -X POST https://hivemind.company.example/v1/entries \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: company-smoke-entry' \
  --data-binary "{
    \"project_id\": \"hivemind\",
    \"session_id\": \"$SESSION_ID\",
    \"branch\": \"main\",
    \"author_id\": \"company-admin\",
    \"author_type\": \"human\",
    \"source\": \"cli\",
    \"entry_type\": \"progress\",
    \"summary\": \"Company HiveMind smoke entry.\"
  }"

curl -fsS -X POST "https://hivemind.company.example/v1/sessions/$SESSION_ID/end" \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: company-smoke-end' \
  --data-binary '{"status":"completed"}'
```

## 6. Package The MCP Client

Option A: publish `hivemind-mcp/` to the company npm registry.

```bash
cd hivemind-mcp
npm publish --registry https://registry.company.example/npm/
```

Option B: distribute a tarball:

```bash
npm run pack:mcp
```

This creates:

```text
dist/hivemind-mcp-0.1.3.tgz
```

The MCP package is thin. It does not include the API or OpenSearch.

## 7. Install In VS Code

Users need:

- VS Code with MCP support
- Node.js available in `PATH`
- network access to `https://hivemind.company.example`

Published package:

```bash
code --add-mcp '{"name":"hivemind","type":"stdio","command":"npx","args":["-y","hivemind-mcp"],"env":{"HIVEMIND_API_BASE_URL":"https://hivemind.company.example"}}'
```

Company npm registry:

```bash
code --add-mcp '{"name":"hivemind","type":"stdio","command":"npx","args":["-y","--registry","https://registry.company.example/npm/","hivemind-mcp"],"env":{"HIVEMIND_API_BASE_URL":"https://hivemind.company.example"}}'
```

Tarball:

```bash
code --add-mcp '{"name":"hivemind","type":"stdio","command":"npx","args":["-y","/path/to/hivemind-mcp-0.1.3.tgz"],"env":{"HIVEMIND_API_BASE_URL":"https://hivemind.company.example"}}'
```

After changing MCP config, reload VS Code or restart the `hivemind` MCP server.

Expected user-level config shape:

```json
{
  "servers": {
    "hivemind": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "hivemind-mcp"],
      "env": {
        "HIVEMIND_API_BASE_URL": "https://hivemind.company.example"
      }
    }
  }
}
```

## 8. Agent Instructions

Agents using the company HiveMind must:

- use the global VS Code MCP server named `hivemind`
- start a HiveMind session at the beginning of each meaningful work unit
- use `project.register` only when a project is missing or metadata changes
- store concise structured memory with `entry.append`
- record durable decisions as `decision`
- record meaningful milestones as `progress`
- record risks or unresolved concerns as `risk` or `feedback`
- call `session.end` when the work unit is done or abandoned
- avoid dumping raw transcripts into HiveMind
- prefer repo-portable file references over machine-specific absolute paths

Agents do not need to checkout HiveMind to use the MCP client. A project
checkout is only needed for the project they are working on.

## 9. Human Instructions

Humans can use the UI at:

```text
https://hivemind.company.example
```

Use the UI to inspect sessions, closeouts, decisions, feedback, and recent
project memory. Use VS Code MCP for agent workflows. Do not treat chat history
as the source of truth for project memory.

## 10. Operational Checks

Server:

```bash
docker stack services hivemind
docker service logs --tail 100 hivemind_hivemind-api
docker service logs --tail 100 hivemind_opensearch
curl -fsS https://hivemind.company.example/health
```

Client:

```bash
node --version
code --version
npm view hivemind-mcp version
```

For tarball installs, verify that the tarball path used in VS Code exists
instead. If `npm view` cannot reach the package, fix npm registry access or
distribute the tarball. If the MCP server starts but tools fail, verify
`HIVEMIND_API_BASE_URL` and network access to the shared API.
