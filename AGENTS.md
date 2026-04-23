# AGENTS.md — HiveMind (Slim, Reference-First)

**Scope & intent**  
This file is the contributor navigation and guardrails page for both human and AI contributors.
It keeps the core rules here and points to the authoritative project docs for detail.

---

## 1) Rules NON-NEGOTIABLE (NO DISCUSSION)

- The rules in this section are hard constraints, not suggestions.
- Agents must not reinterpret, weaken, or silently bypass these rules.
- Any exception requires explicit human approval for that specific task.

- **Use HiveMind during development.**
  - Start or resume a HiveMind session for meaningful work.
  - Record important decisions, progress milestones, and feedback as structured entries.
  - Do not treat chat history as the project memory layer when HiveMind is available.
- **NFF (No Freaking Fallbacks).**
  - Do not add silent fallbacks, auto-recovery chains, or implicit compatibility shims.
  - Prefer explicit failure and explicit configuration.
- **No implicit backward compatibility.**
  - Breaking changes are acceptable unless compatibility is explicitly required.
- **SSOT for contracts.**
  - One canonical schema/contract per REST or MCP shape.
  - Do not duplicate DTOs, validators, or parallel request/response definitions for the same contract.
- **KISS.**
  - Prefer straightforward implementation over framework cleverness.
- **No transcript dumping.**
  - HiveMind stores concise structured memory, not raw conversation archives.
- **Repo-portable references first.**
  - Prefer project-relative references (`repo_file`) over machine-specific absolute paths when a team-safe reference is possible.
- **Idempotency is required on create operations.**
  - Session creation, entry append, and rule-check creation must honor `Idempotency-Key`.
- **Git safety (agents).**
  - No `git push`.
  - No commits unless the user explicitly requests a commit.

---

## 2) Authoritative Sources

- MVP architecture and product contract:
  - `docs/skrybe-mcp-mvp-plan.md`
- Feedback-loop concepts and source lineage:
  - `docs/mcp-feedback-loop-concept.md`
  - `docs/mcp-authoring-feedback-loop-v0.1.md`
- Runtime and local usage:
  - `README.md`

> Precedence: if a referenced doc conflicts with §1 Rules, §1 Rules win.
> On conflict or ambiguity, stop and ask for an explicit human decision.

---

## 3) Architecture Boundaries

- `skrybe-mcp`
  - thin MCP layer only
  - owns MCP tool registration and API client behavior
  - must not know storage details
- `skrybe-api`
  - owns HTTP API, validation, service logic, and response envelopes
- storage adapter
  - owned by `skrybe-api`
  - hides backend-specific persistence details
- `fs-jsonl`
  - current backend implementation detail for v0.1
  - must not leak into MCP contracts

Keep these boundaries intact:

- MCP -> REST client -> API -> service -> storage adapter -> backend
- no direct storage access from MCP
- no duplicate validation layers with divergent behavior

---

## 4) Development Workflow

1. Read `docs/skrybe-mcp-mvp-plan.md` before structural work.
2. Start or resume a HiveMind session for meaningful tasks.
3. Record:
   - `decision` for important design choices
   - `progress` for meaningful milestones
   - `feedback` for friction, bad ideas, or lessons learned
   - `plan_ref` when work is driven by a plan file
4. Implement within the architecture boundaries in §3.
5. Test relevant slices before closing work.
6. Review your own changes before presenting them.

Protected areas that should be changed carefully:

- API envelopes
- idempotency behavior
- storage adapter contract
- core schemas in `skrybe-api/src/domain/`
- MCP tool names and public input shapes

---

## 5) Testing Expectations

- For backend changes:
  - cover API contract behavior and storage behavior
- For MCP changes:
  - cover API-client mapping and MCP-friendly output/error behavior
- Keep tests focused on behavior, not framework internals.
- If a change touches create flows, test idempotency behavior.

---

## 6) HiveMind Usage For Agents

For meaningful sessions, use HiveMind as part of the workflow:

- `project.register`
  - only when the project is not already registered or metadata needs updating
- `session.start`
  - at the beginning of meaningful work
- `entry.append`
  - for decisions, progress, feedback, risks, and plan references
- `entry.search`
  - before redoing prior thinking or when you need project recall

Do not spam HiveMind with micro-steps.
Store only information that will help the next session or next contributor.

---

## 7) When In Doubt

- Do not guess.
- Align code to `docs/skrybe-mcp-mvp-plan.md`.
- If you need new behavior, update the plan/doc first or get an explicit human decision before widening the contract.
