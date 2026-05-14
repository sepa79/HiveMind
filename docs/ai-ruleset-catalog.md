# AI Ruleset Catalog

HiveMind 0.2.0 includes a read-only catalog of repository standardization
profiles. The bundled examples live in `ai-rulesets/`:

- `base@v1`
- `aws-microservice@v2`

Each profile has a `manifest.json` and a `files/` tree. The manifest names the
profile, lists files to apply, and stores guidance rules using the same rule
shape as project rulesets.

## Instance Configuration

By default, HiveMind reads the committed `ai-rulesets/` directory. A company
deployment can mount a checked-out internal repository and point HiveMind at it:

```bash
HIVEMIND_RULESET_CATALOG_PATH=/opt/hivemind/ai-rulesets
HIVEMIND_RULESET_CATALOG_SOURCE_URL=https://git.company.example/eng/ai-rulesets
```

HiveMind does not clone remote repositories in 0.2.0. The catalog path must
already exist on the API host/container.

## API And MCP Flow

1. Register or update a project with `standard_profile_ref`, or call
   `project_standard_profile_define`.
2. Call `guidance_check` with the local `.hivemind-standard.json` marker when
   available.
3. Apply missing starter files through the CLI and open a normal repository PR.

Useful REST endpoints:

- `GET /v1/ruleset-catalog/profiles`
- `GET /v1/ruleset-catalog/profiles/:profileId/versions/:version`
- `GET /v1/ruleset-catalog/profiles/:profileId/versions/:version/bundle`
- `PUT /v1/projects/:projectId/standard-profile`
- `POST /v1/guidance/check`

MCP exposes the same flow through:

- `ruleset_catalog_list`
- `ruleset_catalog_get`
- `project_standard_profile_define`
- `guidance_check`

## CLI

Dry-run by default:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v2 --target /repo
```

Write missing files and the marker:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v2 --target /repo --write
```

Existing changed files are skipped unless explicitly overwritten:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v2 --target /repo --write --conflict overwrite
```

The CLI renders only these placeholders:

- `{{PROJECT_NAME}}`
- `{{PROJECT_ID}}`
- `{{PROFILE_REF}}`
- `{{HIVEMIND_API_URL}}`

Unknown placeholders fail explicitly.
