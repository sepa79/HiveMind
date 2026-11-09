# OpenSearch storage

OpenSearch is the system of record for the shared deployment. The local
fs-jsonl backend remains available separately. This document describes the
implemented storage design; deployment commands belong in the
[README](../README.md) and [rollout runbook](company-swarm-rollout.md).

## Service boundary

```text
MCP clients -> hivemind-mcp -> hivemind-api -> OpenSearch
REST/UI clients -----------> hivemind-api -> OpenSearch
```

MCP remains a REST client. The API storage adapter owns database access and
index mappings. Explicitly selecting OpenSearch does not permit a silent
fallback to filesystem storage if it is unavailable.

One index prefix supports one running API writer. The supplied Swarm deployment
uses one API replica and stop-first updates. MCP instances can scale independently.

## Configuration and access

The API selects `HIVEMIND_STORAGE_BACKEND=opensearch` and requires an explicit
node, username and password or the supported secret-file equivalent. The
initializer provisions the service role/user/mapping with administrative
credentials; normal API storage requests use the dedicated service user.
The role is scoped to `${HIVEMIND_OPENSEARCH_INDEX_PREFIX}-*`.

OpenSearch port 9200 is private to the stack network in the supplied definitions.
The local stack uses demo TLS certificates and disabled verification; for a
non-demo deployment configure trusted certificates and
`HIVEMIND_OPENSEARCH_TLS_CA_FILE` with verification enabled. Use the platform
secret mechanism for passwords. An application's administrative token is
distinct from database credentials.

## Persistence

The adapter owns indices for projects, rulesets, contexts, sessions, entries,
learnings, learning feedback, issues, issue events, rule checks and idempotency
records. Narrative fields use full-text mappings; IDs, tags, scopes and states
use exact-match mappings.

Create idempotency uses deterministic records and explicit conflict detection.
Read-after-write behavior uses `refresh=wait_for`. These mechanisms do not
establish general multi-record transactions; each workflow must define and
test its own atomicity or recoverable retry semantics.

## Version changes and recovery

HiveMind 0.6.0 deployment templates pin OpenSearch 3.9.0 for new databases.
Never apply that default directly to existing 2.17.x storage. Follow the
[0.6.0 upgrade guide](security-upgrade-0.6.0.md) for the required 2.19.x stage,
index/plugin compatibility, verified backups and recovery constraints.

Do not downgrade a binary against data modified by a newer major version.
Preserve the correct data volume and deployment placement. A healthy transport
or completed source test does not prove that an existing database migration
preserved application data.

For disposable local integration checks use
[the documented maintenance smoke](ai/COMMANDS.md). It targets an explicitly
selected loopback node and creates/removes only its own isolated index prefix.
