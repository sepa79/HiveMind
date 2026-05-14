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
Rule: Specs are SSOT.
Trigger: API/message/config contract changes.
Reminder: Update docs/specs before or with implementation.
```

```text
Rule: Idempotency for create/append/publish.
Trigger: New create endpoint, message producer, queue publisher, or append-only storage.
Reminder: Add stable idempotency key or document why not applicable.
```

## Session workflow

- Start session for meaningful task.
- Search previous lessons/rules when the task touches known risk areas.
- Append concise decision/progress/risk/evidence entries.
- End session with closeout summary.
