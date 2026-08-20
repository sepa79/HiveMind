# Upgrading To `base@v3`

`base@v3` expands SSOT from schemas and DTOs to every material authority:

- public contracts and their validation/parsing;
- domain facts, state transitions, and state-machine writers;
- configuration, filesystem paths, defaults, and environment resolution;
- normalizers, mappers, factories, and response construction;
- operation-success postconditions and outcome calculation.

This profile is also a repository starter. Applying it to an established repository is a migration, not a file-copy operation.

## New Repository

Inspect the dry-run, then create the starter files:

```bash
npm run hivemind:standard -- apply \
  --project <project-id> \
  --profile base@v3 \
  --target <repository>

npm run hivemind:standard -- apply \
  --project <project-id> \
  --profile base@v3 \
  --target <repository> \
  --write
```

Review and customize the generated files before treating the repository as ready.

## Existing Repository

Do not start with `--write` or `--conflict overwrite`.

1. Ensure `base@v3` is available in the deployed HiveMind catalog.
2. Run the dry-run command and retain its file-status output as migration evidence.
3. For every profile target, search the whole repository for an existing source with the same responsibility, including differently named files.
4. Classify each target:
   - `template_unmodified`: safe to replace with the v2 template;
   - `customized`: keep the project content and merge only missing v2 rules;
   - `missing, no equivalent authority`: create the v2 target;
   - `missing, equivalent authority exists elsewhere`: choose one canonical path before continuing.
5. When an equivalent authority uses another path, migrate or rename it and update every reference, then remove the old authority. Do not leave two living documents, parallel validators, forwarding copies, or compatibility aliases.
6. Apply with `--write --conflict skip` only after the authority review is complete. `skip` preserves reviewed project-specific files; `overwrite` is not an upgrade strategy.
7. Assign `base@v3` to the project, then call `project_standard_marker_update` or run `npm run hivemind:standard -- marker update --project <project-id> --target <repo>`.
8. Run `guidance_check`. Required targets must be present, while project-specific files may correctly appear as `customized`.
9. Run the repository's normal tests and documentation/link checks.

## Required SSOT Evidence

The upgrade review must record, for each affected responsibility:

- the canonical owner after migration;
- the previous competing owner, if any, and how it was removed;
- the repository-wide search used to exclude another active authority;
- the single writer for each affected domain fact;
- the canonical configuration/path resolver;
- the canonical success postconditions and where they are verified.

Two active authorities are a **CRITICAL** finding and block completion of the upgrade.

## Rollback

Keep the migration in one reviewable change. Roll back that change and restore the previous standard-profile assignment together; do not retain a `base@v3` marker after reverting its required rules or files.
