# Product plans

Plans describe remaining product work. Current behavior belongs in the
[user guide](../user-guide.md), [architecture](../ARCHITECTURE.md) and
[canonical contracts](../specs/README.md). Status below reflects source at
HiveMind 0.6.0 and was reconciled on 9 November 2026; it does not establish
deployment status or authorize implementation.

## Current and proposed work

| Plan | Status | Remaining scope |
| --- | --- | --- |
| [Memory freshness and lifecycle](memory-freshness-lifecycle.md) | Partially delivered | Learning supersession, explicit concern ownership, stable history pagination and evidence-based review |
| [Enterprise governance](enterprise-governance-slice.md) | Proposed, not implemented | Organization guidance, inherited rules and version deltas; requires contract and access decisions |

## Completed scope and historical design

These summaries preserve completed scope and useful design decisions. They
are not current API contracts or pending implementation instructions.

| Historical plan | Disposition |
| --- | --- |
| [MCP MVP](archive/hivemind-mcp-mvp-plan.md) | Initial API/MCP/storage foundation delivered; obsolete contract examples retired |
| [Session semantics](archive/session-semantics-slice.md) | Work-unit start/end, closeouts and activity UI delivered |
| [Local team onboarding](archive/local-team-onboarding-readiness.md) | Original onboarding checklist completed |
| [Contexts, learnings and issues](archive/context-learning-issue-slice.md) | Core slice and managed features delivered; remaining lifecycle work belongs to the active memory plan |

## Operating documentation

The former OpenSearch stack plan is now [OpenSearch storage](../opensearch-storage.md).
Use [the release upgrade guide](../security-upgrade-0.6.0.md) before changing an
existing database, and [the rollout runbook](../company-swarm-rollout.md) for
deployment planning.

## Maintenance

- Give each plan an explicit status, remaining work and completion criteria.
- Move completed scope to a short historical summary; link canonical contracts
  instead of preserving obsolete executable examples.
- Keep proposed endpoints clearly separate from supported APIs.
- Keep deployment observations, company data and audit/review reports outside
  this public repository. Do not recreate `docs/reviews/`.
- Update this index and references when moving or completing a plan.
