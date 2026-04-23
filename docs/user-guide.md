# Skrybe User Guide

## 1. What Skrybe Is

`Skrybe` is a small project-memory service for coding sessions.

It gives you:

- durable project metadata
- durable rulesets
- durable contexts, sessions, entries, and rule checks
- durable learnings and tracked issues
- bounded recall context for the next session
- a short startup digest when a context or session begins

For the current MVP, persistence is filesystem-backed.
By default, data lives in `.skrybe/` under the current working directory.

## 2. Fresh Clone Setup

Install dependencies:

```bash
npm install
```

Seed the local repo with the built-in `skrybe` project bootstrap:

```bash
npm run bootstrap:skrybe
```

This creates repo-local persistent files under:

```text
.skrybe/projects/skrybe/
```

The bootstrap uses the seed files in:

- `bootstrap/skrybe-project.json`
- `bootstrap/skrybe-ruleset.json`

The bootstrap is intentionally small:

- it registers the local `skrybe` project
- it sets `root_path` to the current repo root
- it writes the bundled ruleset into persistent storage

Running it again is safe.
If the bundled ruleset has not changed, the ruleset version stays the same.

## 3. Running Skrybe Locally

Start the API:

```bash
npm run start:api
```

In another terminal, start the MCP server:

```bash
npm run start:mcp
```

Default local endpoints:

- API: `http://127.0.0.1:4010`
- data root: `<repo>/.skrybe`

Environment variables:

- `SKRYBE_DATA_ROOT`
  use a different persistence directory
- `SKRYBE_API_PORT`
  change the API port
- `SKRYBE_API_BASE_URL`
  point the MCP server at a different API instance

## 4. Persistence Model

Persistence is per `skrybe-api` instance and per `SKRYBE_DATA_ROOT`.

That means:

- if you restart the API, data stays
- if you keep the same `.skrybe/` directory, projects and rulesets stay
- if you point the API at a different data root, you get a different storage universe

For a registered project, these files are persisted automatically:

- `project.json`
- `ruleset.json`
- `sessions/*.json`
- `entries.jsonl`
- `rule-checks.jsonl`
- `idempotency.jsonl`

For new projects, persistence is automatic once they are created through Skrybe:

1. register the project
2. define the ruleset
3. start sessions and append entries as needed

Nothing else is required to make those records durable in the current data root.

## 5. Recommended Workflow

For meaningful work:

1. open a context or start a session early
2. read the returned `startup_summary`
3. drill down only if needed with `context.get_project_brief`, `context.get_open_threads`, `learning.get_recent`, or `issue.list`
4. record important decisions, progress, learnings, and feedback
5. run relevant tests
6. submit relevant rule checks before closing out

The startup digest is intentionally short.
It is the “menu” for the project state:

- active learning count
- active issue count
- open thread count
- a few top learnings
- a few top issues
- a few top open threads

The goal is to help the next agent orient quickly without forcing a full brief on every start.

For the `skrybe` repo itself, the bundled ruleset already reflects the hard constraints in `AGENTS.md`.

## 6. Bootstrap vs Runtime State

Keep a clean separation between:

- seed assets committed to the repo
- live runtime state created in `.skrybe/`

Committed seed assets belong in `bootstrap/`.
Runtime state should stay local and disposable.

This is why the bootstrap does not rely on committed live session files.
It seeds only the stable starting state that a fresh clone should have.

## 7. Verifying the Setup

Run the targeted test slice:

```bash
npm run test:skrybe
```

You can also inspect the resulting files directly, for example:

```bash
cat .skrybe/projects/skrybe/project.json
cat .skrybe/projects/skrybe/ruleset.json
```

## 8. Extending the Pattern for Other Projects

The built-in bootstrap is specific to this repo.

For another repo, the same model applies:

- define project metadata
- define a durable ruleset
- store both in the target API data root

You can do that through:

- the REST API
- the MCP tools
- a repo-local bootstrap script similar to `scripts/bootstrap-skrybe.mjs`

If you want team-safe repeatability for another project, create a repo-committed seed file and a small bootstrap command for that repo too.
