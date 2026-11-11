# HiveMind Rules — {{PROJECT_NAME}}

HiveMind is the preferred durable memory for AI-assisted work.

Use `docs/ai/LESSONS_LEARNED.md` only as fallback or portable repo memory.

## Store in HiveMind

- Important decisions.
- Lessons learned.
- Repeated failure patterns.
- Architecture risks.
- Review findings worth remembering.
- Project rules that agents often forget.
- Work-unit summaries.

## Do not store

- Raw transcripts.
- Secrets.
- Credentials.
- Sensitive personal data.
- Noisy micro-steps.

## Rule reminder examples

Store reminders like this:

```text
Rule: No silent fallbacks.
Trigger: Agent proposes retry/fallback/compatibility behavior.
Reminder: Prefer explicit failure and explicit configuration. Document any fallback.
```

```text
Rule: Documentation before implementation.
Trigger: Changes to behavior, architecture, contracts, configuration, commands, deployment or risk.
Reminder: Read-only investigation may precede documentation. Before implementation or test edits, update canonical docs/specs with responsibility owners, expected behavior and acceptance criteria. If the plan changes, revise those documents before further implementation or test edits. A plan is not evidence of implementation, verification, deployment or acceptance.
```

```text
Rule: Idempotency for create/append/publish.
Trigger: New create endpoint, message producer, queue publisher, or append-only storage.
Reminder: Add stable idempotency key or document why not applicable.
```

## Session workflow

- During profile adoption, read `rules_get` and explicitly merge the manifest's `documentation_before_implementation` into the complete project rules array using `rules_define`. Preserve unrelated project rules; review any same-ID difference. Re-read to verify activation. Profile assignment alone does not activate manifest rules.
- Start session for meaningful task.
- Search previous lessons/rules when the task touches known risk areas.
- Record canonical documentation references and documentation-first ordering before implementation or test edits, including revised plans.
- Append concise decision/progress/risk/evidence entries.
- Verify `documentation_before_implementation` in review/rule-check evidence against the actual work sequence; a file hash alone does not prove edit order.
- End session with closeout summary.

---

If you change this tracked standard file, refresh the canonical HiveMind marker for the project with `project_standard_marker_update` or `npm run hivemind:standard -- marker update --project <project-id> --target <repo>`.
