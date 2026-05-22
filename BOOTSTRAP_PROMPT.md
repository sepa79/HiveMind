# Bootstrap Prompt — Adapt AI Project Starter To This Repository

You are adapting the AI Project Starter files that were copied into this repository.

## Your job

Inspect the repository and update the starter files so they describe this specific project.

## Rules

- Do not blindly fill placeholders.
- Read the repository first.
- Infer facts from real files: README, build files, package manifests, Docker files, CI files, tests, docs, source layout.
- Do not invent architecture.
- If uncertain, write `TODO:` or `ASSUMPTION:` clearly.
- Do not modify application code unless explicitly asked.
- Prefer updating these AI/docs files over changing existing project behavior.
- Keep wording concise and practical.
- Preserve hard rules such as NFF, KISS, SSOT, explicit configuration, and git safety unless the human explicitly asks to change them.

## Files to update

- `AGENTS.md`
- `docs/ai/PROJECT_CONTEXT.md`
- `docs/ai/COMMANDS.md`
- `docs/ai/REVIEW_CHECKS.md`
- `docs/ARCHITECTURE.md`
- `docs/specs/README.md`

## Steps

1. List the important repository files you inspected.
2. Identify language, frameworks, build tools, test tools, runtime/deployment model.
3. Fill `docs/ai/PROJECT_CONTEXT.md`.
4. Fill `docs/ai/COMMANDS.md` with canonical commands.
5. Update `docs/ai/REVIEW_CHECKS.md` with tech-stack-specific checks and best practices.
6. Update `docs/ARCHITECTURE.md` with the current known architecture or TODOs.
7. Update `docs/specs/README.md` with where contracts/specs should live.
8. Stop and summarize what you changed and what remains unknown.

## Output expected

- Updated Markdown files.
- Summary of detected stack.
- TODO list for missing project knowledge.
- No application code changes.
