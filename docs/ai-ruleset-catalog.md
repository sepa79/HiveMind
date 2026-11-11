# AI Ruleset Catalog

HiveMind 0.2.0 includes a read-only catalog of repository standardization
profiles. The bundled examples live in `ai-rulesets/`:

- `base@v1` (retained for reproducible existing installations)
- `base@v2` (retained for prior standard bundles)
- `base@v3` (retained; adds canonical stored standard-marker refresh guidance)
- `base@v4` (new source profile; documentation before implementation, available on an instance only after catalog publication)
- `aws-microservice@v2` (retained for prior standard bundles)
- `aws-microservice@v3`

Each profile has a `manifest.json` and a `files/` tree. The manifest names the
profile, lists files to apply, and stores guidance rules using the same rule
shape as project rulesets.

`base@v3` includes `docs/ai/STANDARD_PROFILE_UPGRADE.md` in its downloadable
bundle. Established repositories must follow that migration workflow instead
of copying starter files over existing project authorities.

## base@v4 requirements and publication

The [canonical specification](specs/base-v4-documentation-first.md) defines the
required documentation-before-implementation rule. Read-only investigation may
precede documentation. Before implementation or test edits, contributors update
the canonical docs/specs for planned behavior, architecture, contracts,
configuration, commands, deployment or risk changes, naming responsibility
owners, expected behavior and acceptance criteria. Changed plans require another
documentation update before further edits. Plans are not implementation,
verification, deployment or acceptance evidence.

`base@v4` preserves the v3 NFF, SSOT, meaningful tests, Git safety and stored-marker
rules. It adds required structured guidance, not automatic semantic enforcement
of edit order. Existing profile directories and project assignments stay intact.
AWS profiles do not inherit this change automatically.

Publication and adoption are separate operations:

1. Review and validate the source change. Commit/push/merge/release/deploy require
   separate authorization; local preparation alone publishes nothing.
2. For the bundled catalog, publish a reviewed API image containing
   `ai-rulesets/base/v4/` and explicitly deploy that image through the normal
   release process. For an external catalog, explicitly publish the reviewed
   tree to the configured `HIVEMIND_RULESET_CATALOG_PATH` mount. Do not silently
   switch catalog sources or assign projects as part of publication.
3. Against the intended API instance, call `ruleset_catalog_list` and
   `ruleset_catalog_get` with `profile_id=base`, `version=v4`,
   `include_files=true`. Confirm the manifest, required rule and rendered bundle.
   CLI `catalog list/show` reads the local configured catalog, so it does not
   prove the API instance has been updated.
4. Only after the instance serves v4, explicitly authorize each project's
   migration using the [v4 upgrade guide](../ai-rulesets/base/v4/files/docs/ai/STANDARD_PROFILE_UPGRADE.md).
   Inventory existing authorities and merge missing requirements into customized
   files. `--conflict skip` preserves those files; it does not insert v4 rules.
5. After reviewing those files, explicitly assign `base@v4` via
   `project_standard_profile_define`, refresh the stored marker, run
   `guidance_check` and the project's normal checks. Review the documentation-first
   sequence separately: marker hashes establish file state, not edit order.
6. Activate the structured rule explicitly: read `rules_get` for the adopting
   project, merge `documentation_before_implementation` from the v4 manifest
   by `rule_id` into the complete project rules array, and submit that reviewed
   array with `rules_define`. Preserve unrelated project-specific rules and
   resolve an existing same-ID difference explicitly. Re-read `rules_get` to
   verify the required rule. Profile assignment alone does not import manifest
   rules into the active project ruleset. Do not claim adoption complete before
   the local authorities and active structured rule agree.

Existing projects retain their assigned profile and local extensions until an
explicitly authorized migration after v4 publication. Preparing catalog source
does not update their files or assign a new profile to any project.

## Recommended Profiles

Use these as the normal choice for new work:

- `base@v4` once verified available on the intended instance; existing `base@v3` installations remain unchanged
- `aws-microservice@v3`

Older bundles stay in the catalog only for reproducibility and controlled
upgrades.

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
2. Apply missing starter files through the CLI when needed.
3. Call `project_standard_marker_update`, or
   `npm run hivemind:standard -- marker update --project my-service --target /repo`,
   so HiveMind stores the canonical tracked-file marker for that project.
4. Call `guidance_check`.
   The built-in Human UI does not inspect repository files directly; without the
   stored marker it can show the assigned profile and expected files, but not
   real drift.

Useful REST endpoints:

- `GET /v1/ruleset-catalog/profiles`
- `GET /v1/ruleset-catalog/profiles/:profileId/versions/:version`
- `GET /v1/ruleset-catalog/profiles/:profileId/versions/:version/bundle`
- `PUT /v1/projects/:projectId/standard-profile`
- `PUT /v1/projects/:projectId/standard-marker`
- `POST /v1/guidance/check`

MCP exposes the same flow through:

- `ruleset_catalog_list`
- `ruleset_catalog_get`
- `project_standard_profile_define`
- `project_standard_marker_update`
- `guidance_check`

## CLI

Dry-run by default:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v3 --target /repo
```

Write missing files:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v3 --target /repo --write
```

Store or refresh the canonical tracked-file marker in HiveMind:

```bash
npm run hivemind:standard -- marker update --project my-service --target /repo
```

Starter files are templates for project-specific customization. Existing
customized files are considered present and are skipped unless explicitly
overwritten:

```bash
npm run hivemind:standard -- apply --project my-service --profile aws-microservice@v3 --target /repo --write --conflict overwrite
```

The CLI renders only these placeholders:

- `{{PROJECT_NAME}}`
- `{{PROJECT_ID}}`
- `{{PROFILE_REF}}`
- `{{HIVEMIND_API_URL}}`

Unknown placeholders fail explicitly.

## Upgrade From Earlier Profiles

Typical upgrade targets:

- `base@v3 -> base@v4` (documentation-first workflow; use the v4 guide above)
- `base@v2 -> base@v3` (prior marker-guidance upgrade)
- `aws-microservice@v2 -> aws-microservice@v3`

Recommended upgrade flow:

1. List or inspect the `v3` target profile with `ruleset_catalog_list` or `npm run hivemind:standard -- catalog list`.
2. Read the bundled upgrade guide at [../ai-rulesets/base/v3/files/docs/ai/STANDARD_PROFILE_UPGRADE.md](../ai-rulesets/base/v3/files/docs/ai/STANDARD_PROFILE_UPGRADE.md).
3. Apply the `v3` profile into the repository with `--write`, keeping customized files unless you have explicitly reviewed an overwrite.
4. Assign the project to the new `standard_profile_ref`.
5. Refresh the canonical marker with `project_standard_marker_update` or `npm run hivemind:standard -- marker update --project <project-id> --target <repo>`.
6. Run `guidance_check` and the repository's normal validation commands.

The key behavioral difference from older flows is that drift now comes only
from the marker stored in HiveMind. There is no local `.hivemind-standard.json`
state to sync or review.
