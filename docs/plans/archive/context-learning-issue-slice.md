# Contexts, learnings and issues

Status: core slice delivered; historical design summary. Reconciled on
9 November 2026. Remaining lifecycle work is tracked in the
[memory freshness plan](../memory-freshness-lifecycle.md).

## Delivered scope

| Area | Existing surface |
| --- | --- |
| Reusable request context | `context_open`, `context_get`, `context_update`, `context_close` |
| Actionable memory | `learning_capture`, `learning_get_recent`, `learning_search`, `learning_feedback` |
| Work-unit closeout | `session_end` and stored closeout reads |
| Bounded read models | Project/branch briefs and open threads |
| Tracked problems | `issue_report`, `issue_get`, `issue_list`, `issue_add_event` |
| Managed feature vocabulary | `feature_list`, `feature_add`, `feature_remove`, `feature_rename` |
| Explicit learning resolution | `learning_resolve`, delivered in 0.5.7 |

Contexts bind repeated provenance and scope; durable memory does not rely on
hidden conversational state. A learning records actionable advice; an issue
owns a formal problem timeline. Feedback preserves the original learning.
Context records remain durable until explicit close rather than expiring on
an implicit timer.

## Contract ownership

Context open returns `{ context, recall }`; session start returns
`{ session, recall }`. The old proposed `resolved_context` output and separate
startup memory sections are retired. See the
[automatic recall contract](../../specs/api/automatic-recall.md),
[learning lifecycle](../../specs/api/learning-lifecycle.md) and
[user guide](../../user-guide.md).

## Remaining work transferred

A dedicated learning-supersession workflow, stable complete-history cursors and
explicit concern ownership are still planned. The existence of a `superseded`
status does not prove atomic predecessor/successor handling. Follow the active
memory plan rather than restarting the original context/issue implementation
sequence or duplicating feature management.
