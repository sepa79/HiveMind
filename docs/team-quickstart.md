# HiveMind Team Quickstart

Goal: get a teammate from a fresh clone to a working local HiveMind API, UI, and MCP connection in about 10 minutes.

## 1. Install and Seed

```bash
./bootstrap.sh
```

The bootstrap installs dependencies, seeds the base HiveMind project, and restores the committed demo snapshot when `bootstrap/demo-hivemind-state.tar.gz` exists.

It creates local runtime state under:

```text
.hivemind/projects/hivemind/
```

That directory is local runtime data. Do not commit it directly.

The committed demo snapshot is only for onboarding and demos. Refresh it intentionally with:

```bash
npm run hivemind:save-demo
```

## 2. Start the API and UI

```bash
npm run start:api
```

Open:

```text
http://127.0.0.1:4010/
```

Run the local smoke check from another terminal:

```bash
npm run doctor
```

The doctor checks the API health endpoint, project listing, and served UI.

## 3. Start the MCP Server

In another terminal:

```bash
npm run start:mcp
```

Point your MCP client at that command. Example client configs live in:

- `docs/examples/codex-mcp.json`
- `docs/examples/claude-desktop-mcp.json`

Replace the example `cwd` value with your local repo path when your MCP client requires it.

## 4. Use HiveMind During Work

For a meaningful task:

```bash
npm run hivemind:work -- start --goal "Short task summary"
```

Check the active work unit:

```bash
npm run hivemind:work -- status
```

Close it when the task is done:

```bash
npm run hivemind:work -- end
```

For command-shaped work, wrap the command:

```bash
npm run hivemind:work -- run --goal "Run HiveMind tests" -- npm run test:hivemind
```

## 5. Register Another Local Project

Start the API from this repo, then register another repo:

```bash
npm run hivemind:init -- \
  --project my-project \
  --name "My Project" \
  --root /absolute/path/to/my-project \
  --default-branch main \
  --feature UI \
  --feature Backend
```

Use features for useful grouping only: feature area, user story, milestone, or plan name. Avoid turning HiveMind into a detailed task tracker.

## 6. Isolate or Reset Local Data

Use a separate data root when testing:

```bash
HIVEMIND_DATA_ROOT=/tmp/hivemind-demo npm run start:api
```

Reset local runtime data by stopping the API and removing the data root:

```bash
rm -rf .hivemind
./bootstrap.sh
```

This removes local sessions and entries stored in that data root. It does not affect committed seed files under `bootstrap/`.

## 7. Expected Checks

Before handing the repo to someone else, run:

```bash
npm run doctor
npm run test:hivemind
```
