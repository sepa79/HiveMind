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

Default ports:

- HiveMind API/UI: `http://127.0.0.1:4010`
- OpenSearch: `http://127.0.0.1:9200`

Point MCP clients at:

```bash
HIVEMIND_API_BASE_URL=http://127.0.0.1:4010
```

## Configuration

API storage backend is explicit:

```bash
HIVEMIND_STORAGE_BACKEND=opensearch
HIVEMIND_OPENSEARCH_NODE=http://opensearch:9200
HIVEMIND_OPENSEARCH_INDEX_PREFIX=hivemind
```

There is no implicit fallback from OpenSearch to filesystem storage. If OpenSearch is selected and unavailable, startup fails.

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
