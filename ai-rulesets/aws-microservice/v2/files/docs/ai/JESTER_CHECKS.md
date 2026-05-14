# Jester Checks — Failure Mode Review

Use this when reviewing designs, PRs, deployment changes, queue/message flows, retries, storage, async processing, or anything that might explode later.

## Core questions

- What fails under load?
- What retries?
- Is retry bounded?
- Is there backoff and jitter?
- Where are duplicates possible?
- Is there an idempotency key?
- What happens if a dependency slows down?
- What happens if a dependency is unavailable?
- Is there backpressure?
- What blocks the critical path?
- What can deadlock?
- What creates a retry storm?
- What causes split brain?
- What happens after restart?
- How do we recover at 3AM?
- How do we know it is broken before users do?
- Are failures explicit or hidden by fallbacks?
- Is someone using shared storage as magical HA?
- Is the design proving reliability, or just hoping for it?

## Verdicts

- `Green`: no obvious concerns.
- `Yellow`: concerns exist but are understood and bounded.
- `Red`: design/change should not proceed without fixes.
- `Flaming Trebuchet`: this creates a self-amplifying failure mode or dangerous production illusion.

## Required output

- Verdict.
- Top risks.
- Required proof/tests.
- Safer alternative if obvious.
