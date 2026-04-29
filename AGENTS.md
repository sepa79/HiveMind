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
  - Start a dedicated HiveMind session at the beginning of each meaningful task or work unit.
  - Resume an existing HiveMind session only when continuing the same unfinished work unit.
  - Do not attach new work to an already ended session.
  - Record important decisions, progress milestones, and feedback as structured entries.
  - Call `session_end` when the work unit is done or abandoned, so HiveMind can produce a closeout report.
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

- Runtime and local usage:
  - `README.md`
- Current product/user behavior:
  - `docs/user-guide.md`

> Precedence: if a referenced doc conflicts with §1 Rules, §1 Rules win.
> On conflict or ambiguity, stop and ask for an explicit human decision.

---

## 3) Architecture Boundaries

- `hivemind-mcp`
  - thin MCP layer only
  - owns MCP tool registration and API client behavior
  - must not know storage details
- `hivemind-api`
  - owns HTTP API, validation, service logic, and response envelopes
- storage adapter
  - owned by `hivemind-api`
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

1. Start a HiveMind session for the current task/work unit.
2. Read the specific docs or code relevant to the change.
3. For broad architecture or public contract changes, align with the current docs or update them in the same change.
4. Record:
   - `decision` for important design choices
   - `progress` for meaningful milestones
   - `feedback` for friction, bad ideas, or lessons learned
   - `plan_ref` only when work is explicitly driven by a plan file
5. Implement within the architecture boundaries in §3.
6. Test relevant slices before closing work.
7. Review your own changes.
8. Call `session_end` and inspect the closeout before presenting the work.

Protected areas that should be changed carefully:

- API envelopes
- idempotency behavior
- storage adapter contract
- core schemas in `hivemind-api/src/domain/`
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

For meaningful tasks, use HiveMind as part of the workflow:

- `project_register`
  - only when the project is not already registered or metadata needs updating
- `session_start`
  - at the beginning of each meaningful task/work unit
  - provide a useful `goal`; if there is no plan file, the goal is the ad-hoc task summary
- `session_end`
  - when the task is completed or abandoned
  - inspect the returned closeout report before final response
- `entry_append`
  - for decisions, progress, feedback, risks, and plan references
- `entry_search`
  - before redoing prior thinking or when you need project recall

Do not spam HiveMind with micro-steps.
Store only information that will help the next session or next contributor.
Do not reuse ended sessions as a generic project log.

---

## 7) When In Doubt

- Do not guess.
- Check the current code and `docs/user-guide.md`.
- If you need new behavior or widen a public contract, update the relevant docs in the same change or get an explicit human decision first.
