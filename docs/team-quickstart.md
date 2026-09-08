# HiveMind Team Quickstart

This quickstart is for contributors who are developing this repository locally.
If you only need to connect a client such as Codex, VS Code, or Claude Desktop
to an existing shared HiveMind service, skip this document and use the packaged
MCP client flow in [README.md](../README.md#mcp-client-install-for-users) and
[mcp-client-distribution.md](mcp-client-distribution.md).

Goal: get a teammate from a fresh clone to a working local HiveMind API, UI, and MCP connection in about 10 minutes.

Requirements:

- Node.js `22+`
- npm

## 1. Install and Seed

```bash
./bootstrap.sh
```

The bootstrap installs dependencies, seeds the base HiveMind project, and restores the committed demo snapshot when `bootstrap/demo-hivemind-state.tar.gz` exists.

The current committed snapshot restores four sanitized projects for onboarding:

- `hivemind`
- `hivemap`
- `hiveforge`
- `bootstrap`

It creates local runtime state under:

```text
.hivemind/projects/hivemind/
```

That directory is local runtime data. Do not commit it directly.

The committed demo snapshot is only for onboarding and demos. Refresh it intentionally with the sanitized export workflow:

```bash
npm run hivemind:refresh-demo
```

`npm run hivemind:save-demo` only packs the current local data root as-is.

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

- `docs/examples/codex-local-repo-config.toml`
- `docs/examples/claude-desktop-local-repo-mcp.json`

Replace the example `cwd` value with your local repo path when your MCP client requires it.

## 4. Use HiveMind During Work

For a meaningful task:

```bash
npm run hivemind:work -- start --goal "Short task summary"
```

For feature work, pass one feature name to `start` or `run`:

```bash
npm run hivemind:work -- start --goal "Payment validation" --feature PAYMENTS
```

This scopes automatic recall and stores the feature for subsequent progress.
`--resume` refreshes the scope from the API, including feature renames; an explicit
feature must match that current scope. `run` refreshes again after the command
before logging progress. An unavailable API or inactive session stops this flow.


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
  --project MyProject \
  --name "My Project" \
  --repository-url https://github.com/org/MyProject.git \
  --root /absolute/path/to/MyProject \
  --default-branch main \
  --feature UI \
  --feature Backend
```

HiveMind stores the canonical `project_id` as the Git repository name in
lowercase. In the example above, the stored project id is `myproject`; `name`
remains the human-facing label.

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
./bootstrap.sh
npm run doctor
npm run test:hivemind
```

## 8. Standard Profiles

List available starter profiles:

```bash
npm run hivemind:standard -- catalog list
```

Apply a profile to a repository, then store the canonical marker in HiveMind:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v3 --target /absolute/path/to/MyProject --write
curl -X PUT http://127.0.0.1:4010/v1/projects/my-service/standard-profile -H 'content-type: application/json' -d '{"standard_profile_ref":"aws-microservice@v3"}'
npm run hivemind:standard -- marker update --project my-service --target /absolute/path/to/MyProject
npm run hivemind:standard -- guidance check --project my-service
```

`marker update` only succeeds after the same profile is assigned to the
HiveMind project.

For upgrades from older profiles such as `base@v2` or `aws-microservice@v2`,
use [ai-ruleset-catalog.md](ai-ruleset-catalog.md) and the upgrade
guide bundled in [ai-rulesets/base/v3/files/docs/ai/STANDARD_PROFILE_UPGRADE.md](../ai-rulesets/base/v3/files/docs/ai/STANDARD_PROFILE_UPGRADE.md).
