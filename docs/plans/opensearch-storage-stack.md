# OpenSearch Storage Stack Plan

## Goal

Run HiveMind as one shared API backed by one shared OpenSearch node, so many MCP/API clients can read and write the same project memory.

Primary optimization: search and recall reads. HiveMind data is mostly document-shaped memory: entries, learnings, issues, rule checks, tags, summaries, details, branch context, feature context, and status. OpenSearch is the system of record for this deployment shape.

## Deployment Shape

```text
MCP clients -> hivemind-api -> OpenSearch
```

The MCP server remains thin and still talks to `hivemind-api` over REST. Storage details stay inside `hivemind-api`.

## Runtime

Use the Docker stack from the repo root:

```bash
docker compose up --build
```

For Docker Swarm, build and publish the API image first, then deploy the stack:

```bash
docker build -t registry.example.com/hivemind-api:0.1.0 .
docker push registry.example.com/hivemind-api:0.1.0
HIVEMIND_API_IMAGE=registry.example.com/hivemind-api:0.1.0 docker stack deploy -c docker-compose.yml hivemind
```

`docker stack deploy` does not build images from `build:`. `HIVEMIND_API_IMAGE` is therefore required for Swarm deployments.

Default ports:

- HiveMind API/UI: `http://127.0.0.1:4010`

OpenSearch is intentionally not published on the host. It is reachable only inside the Docker network as `https://opensearch:9200`.

Point MCP clients at:

```bash
HIVEMIND_API_BASE_URL=http://127.0.0.1:4010
```

## Configuration

API storage backend is explicit:

```bash
HIVEMIND_STORAGE_BACKEND=opensearch
HIVEMIND_OPENSEARCH_NODE=https://opensearch:9200
HIVEMIND_OPENSEARCH_INDEX_PREFIX=hivemind
HIVEMIND_OPENSEARCH_USERNAME=hivemind_api
HIVEMIND_OPENSEARCH_PASSWORD=<service-user-password>
```

There is no implicit fallback from OpenSearch to filesystem storage. If OpenSearch is selected and unavailable, startup fails.

## OpenSearch Auth

The Docker stack keeps the OpenSearch Security plugin enabled. It requires:

```bash
OPENSEARCH_INITIAL_ADMIN_PASSWORD=<strong-bootstrap-admin-password>
HIVEMIND_OPENSEARCH_USERNAME=hivemind_api
HIVEMIND_OPENSEARCH_PASSWORD=<strong-service-user-password>
HIVEMIND_API_IMAGE=hivemind-api:latest
```

`admin` is used only by the one-shot `opensearch-init` service to create the dedicated API role, service user, and role mapping. `hivemind-api` authenticates as the service user.

`opensearch-init` is idempotent. It waits for OpenSearch health, then writes the role, internal user, and role mapping through the Security plugin API. It serializes request bodies with `JSON.stringify`, so passwords and usernames are not hand-embedded into JSON strings.

The API service does not rely on Compose-only `depends_on` readiness semantics. In Swarm, `opensearch-init` and `hivemind-api` may start concurrently; if the API starts before the service user exists, it exits and Swarm restarts it through the explicit `on-failure` restart policy.

The service role is scoped to indices matching:

```text
${HIVEMIND_OPENSEARCH_INDEX_PREFIX}-*
```

Within that index prefix, the role allows index administration and data operations required by the storage adapter. It does not grant global admin privileges or access to other index prefixes.

The local Docker stack uses OpenSearch demo TLS certificates and therefore sets:

```bash
HIVEMIND_OPENSEARCH_TLS_REJECT_UNAUTHORIZED=false
```

For non-demo deployments, provide a trusted CA file instead:

```bash
HIVEMIND_OPENSEARCH_TLS_CA_FILE=/run/secrets/opensearch-ca.pem
HIVEMIND_OPENSEARCH_TLS_REJECT_UNAUTHORIZED=true
```

Do not publish OpenSearch `9200` from the stack unless there is an explicit operational need. If temporary host access is required for debugging, bind it to loopback rather than all interfaces.

For production environments, pass admin and service-user passwords through the platform secret mechanism instead of plain environment variables. This stack keeps the required variables explicit and does not implement a secret backend.

## Index Model

The OpenSearch adapter owns these indices by prefix:

- `hivemind-projects`
- `hivemind-rulesets`
- `hivemind-contexts`
- `hivemind-sessions`
- `hivemind-entries`
- `hivemind-learnings`
- `hivemind-learning-feedback`
- `hivemind-issues`
- `hivemind-issue-events`
- `hivemind-rule-checks`
- `hivemind-idempotency`

Exact filters use `keyword` fields for tags, branch, feature, status, ids, and types. Narrative fields such as summaries and details use `text`.

## Idempotency

Create operations keep `Idempotency-Key` semantics through a deterministic idempotency document:

```text
sha256(project_id + operation + key)
```

The adapter creates the idempotency document with OpenSearch `op_type=create`. Reusing a key with a different payload returns the existing explicit conflict behavior.

## Tradeoffs

OpenSearch is intentionally the only persistent backend in this stack. This avoids the operational cost of running both SQL and search.

Accepted tradeoffs:

- read-after-write depends on `refresh=wait_for`
- closeout/startup views are composed from search queries and denormalized documents
- relational constraints are enforced by `hivemind-api`, not by the backend

Future optimization can move more filtering/faceting from adapter-side logic into OpenSearch query DSL without changing MCP contracts.
