# HiveMind MCP MVP

Status: historical design; initial foundation delivered. Summarized on
9 November 2026. Current contracts are in [docs/specs](../../specs/README.md),
not in this document. Earlier detailed drafts remain in Git history.

## Original scope delivered

- An HTTP API owning schemas, validation, service behavior and persistence.
- A thin MCP layer that calls the API and does not access storage directly.
- Project registration, work-unit sessions, structured entries, rules and checks.
- Local fs-jsonl storage behind an adapter and a shared OpenSearch backend.
- Search, bounded recall and a human inspection UI.
- Idempotency for create/append operations and explicit configuration failures.

## Durable design decisions

HiveMind stores concise project memory rather than raw conversations. Repository
contracts remain authoritative. Session records carry provenance; entries,
learnings, issues and checks retain their meaning after session closeout.
References should be portable when possible, and client attribution does not
establish authentication or permission.

The service boundary remains MCP -> REST -> API -> storage adapter. The choice
of storage backend must not leak into public MCP contracts. No implicit backend
fallback is part of the design.

## Current navigation

- [Architecture](../../ARCHITECTURE.md)
- [User guide](../../user-guide.md)
- [Automatic recall contract](../../specs/api/automatic-recall.md)
- [OpenSearch storage](../../opensearch-storage.md)
- [Current plans](../README.md)

The original skeleton-building checklist and old session `context` response
examples are retired. Future Mongo/Elasticsearch alternatives and optional
analytics from the initial draft are not an approved implementation commitment.
