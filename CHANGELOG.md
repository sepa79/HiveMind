# Changelog

All notable HiveMind changes are recorded here.

## 0.5.6 - 2026-09-08

- Filter project/admin review knowledge by current applicability and exclude
  superseded/retired entries; preserve resolved decisions that remain current.
- Add `signals.review_queue` for unclassified knowledge, explicit verification
  requests and incidents without lifecycle. Emit one review recommendation per
  entry with combined reasons; inactivity never implies resolution.
- Apply review limits after classification so archived records cannot hide
  older eligible entries. Explicit history search remains unchanged.
- Update REST/MCP contracts and user guidance, and add the HiveMind memory audit
  with concrete cleanup candidates. Historical records have not been changed.

## 0.5.5 - 2026-09-07

- **Breaking:** replace session startup's `context` / `startup_summary` with
  `{ session, recall }`, and context startup with `{ context, recall }`.
  Project/branch briefs and open threads use the same canonical recall shape.
  Automatic-recall MCP tools emit one compact JSON text block without a second
  `structuredContent` copy. Update API, MCP and consumers together; see the
  [automatic recall contract](docs/specs/api/automatic-recall.md).
- Filter automatic recall by explicit applicability and branch/feature scope.
  Exclude resolved incidents, superseded advice and unclassified legacy
  knowledge; withhold negative-feedback learnings and historical blocked checks
  for review. Applicable decisions remain eligible after implementation is
  resolved. Explicit history reads preserve original records and statuses.
- Apply one 8192-byte UTF-8 response-data budget, including session/context
  metadata, and one eight-item memory limit. Report truncation and omitted
  required rules explicitly, and keep smaller eligible candidates when larger
  ones cannot fit. A missing ruleset fails instead of implying no required rules.
- Add entry/learning `applicability`, optional session `feature`, and current
  session metadata via `GET /v1/sessions/:sessionId` and MCP `session_get`.
  Install the corresponding OpenSearch mappings during initialization.
- Support `--feature` in CLI `start` and `run`, including persisted scope and
  progress tagging. Refresh session metadata on resume and after wrapped
  commands so feature renames are observed. Failed lookups and inactive
  sessions stop the resumed/progress workflow instead of using stale state.
- Isolate project maintenance locks so unrelated projects can continue working.
  Revalidate context/session ownership after locking, reject conflicting URL
  and body selectors, and return validation errors for invalid repository slugs.
- Use checked OpenSearch bulk deletion for project cleanup, with stage logs
  and explicit failures for incomplete deletion or missing indices. Preserve
  project metadata for retry after a collection-cleanup failure.
- Update REST/MCP contracts, user documentation and the memory freshness plan.
  Learning lifecycle operations, concern-owner links, history pagination and
  HiveMap/PocketHive data cleanup remain planned work.

## 0.5.4 - 2026-08-20

- Add the canonical stored standard-marker workflow for repository standards:
  `guidance_check` now reads the persisted marker only, and MCP/CLI can refresh
  it explicitly through `project_standard_marker_update` and
  `npm run hivemind:standard -- marker update`.
- Add `base@v3` and `aws-microservice@v3` ruleset bundles, upgrade guidance,
  and refreshed onboarding/demo documentation for standards rollout.
- Reject invalid stored standard-marker payloads against the assigned ruleset
  bundle SSOT, including duplicate targets, unknown targets, and incomplete
  tracked-file snapshots. Invalidate persisted markers when a project's
  assigned `standard_profile_ref` changes directly or through project merge.
- Show the running HiveMind version in the Human UI top bar, matching the
  lightweight version display pattern already used in HiveForge.

## 0.5.3 - 2026-08-19

- Refresh the resolved Node dependency set after the August 19, 2026 security
  audit, including patched `hono`, `@hono/node-server`, `vitest`, and related
  transitive packages in `package-lock.json`.
- Clear the npm audit report to zero known vulnerabilities without changing the
  public API, MCP tool contracts, or deployment shape.

## 0.5.2 - 2026-07-22

- Canonicalize newly registered project ids from the lowercase Git repository
  name so one deployment has one project record per repository. Reject a
  registration atomically when a different repository already owns the
  resulting id, including concurrent registration attempts. Normalize `.git`
  suffixes consistently even when repository slugs or URLs end with `/`.
- Protect admin memory review and project maintenance endpoints with a durable
  bearer token that can be supplied explicitly or generated in
  `HIVEMIND_DATA_ROOT`; parse the HTTP Bearer authentication scheme
  case-insensitively.
- Add admin project delete and merge operations across both storage backends,
  including conflict detection, project-scoped record migration, and ruleset
  preservation. Project merge also preserves an unambiguous standard profile
  or requires an explicit source, target, or catalog-profile selection when
  assignments differ.
- Route admin credentials through MCP backend profiles and use the canonical
  project id returned by registration in the local init helper.
- Disable automatic MCP retries for destructive project delete and merge
  operations so a lost response cannot turn a successful mutation into a
  misleading retry failure.
- Serialize destructive project delete and merge operations against in-flight
  API requests so concurrent writes cannot recreate orphaned project data.
  Refuse unsafe filesystem deletion or merge of legacy parent project ids that
  still contain nested projects.
- Declare the API as a single-writer service, pin Swarm deployments to one API
  replica with `stop-first` updates, and make merge phases monotonic and
  resumable after an interrupted storage write.
- Require a separate incoming Bearer token for `admin_*` calls over Streamable
  HTTP MCP while keeping ordinary MCP tools unauthenticated and stdio behavior
  unchanged.
- Wire API and MCP admin credentials into HiveForge deployments, using direct
  values for `docker-single` and external Docker secrets for `swarm`.
- Prevent OpenSearch startup failures from serializing request metadata and
  authorization headers into container logs. API and provisioning failures now
  emit a bounded error summary with credentials redacted.

## 0.5.1 - 2026-06-12

- Render the HiveForge-managed Compose file at `/hf/stacks/compose.yml` so the
  project Ansible playbooks match the HiveForge 0.5.2 action-root contract.

## 0.5.0 - 2026-06-11

- Update the HiveForge deployment contract to `0.5`: project Ansible now renders
  only the Compose file declared by `HIVEFORGE_RENDERED_COMPOSE_FILE`, while
  HiveForge owns Docker Compose/Swarm execution and stable deployment naming.
- Remove `HIVEMIND_DEPLOYMENT_NAME` from required HiveForge inputs. Data
  retention is tied to the HiveForge deployment slot instead of a manually
  configured Docker project or stack name.
- Use Swarm service aliases such as `opensearch` and `hivemind-api` instead of
  `tasks.*` names so deployments work with HiveForge-generated stack names.
- For Swarm OpenSearch, read the admin password from the configured Docker
  secret in the OpenSearch container entrypoint because OpenSearch 2.17.1
  requires `OPENSEARCH_INITIAL_ADMIN_PASSWORD` and does not consume a `_FILE`
  variant.

## 0.4.9 - 2026-06-09

- Simplify HiveForge Swarm Docker secrets rendering to the standard Compose
  secrets pattern, without custom OpenSearch images, shell wrappers, or
  `source`/`target` aliases.
- Derive `/run/secrets/<secret_name>` paths from the configured Docker secret
  names so Swarm secrets mount under the names Compose grants to each service.

## 0.4.8 - 2026-06-08

- Move the HiveMind release line forward after the Swarm secrets deployment
  fix, avoiding a version lower than the surrounding deployment tool releases.

## 0.4.6 - 2026-06-08

- Align the packaged MCP server version with the HiveMind release version so
  `/health` reports the deployed release consistently.

## 0.4.5 - 2026-06-08

- Let Swarm deployments consume existing Docker secrets directly for the
  OpenSearch admin and HiveMind application passwords.
- Add `_FILE` credential support for the API and OpenSearch initialization so
  Swarm secrets are not copied into HiveForge runtime environment variables.
- Remove the Swarm placement-node and external-network deployment requirements,
  and default OpenSearch endpoints per deployment profile.

## 0.4.4 - 2026-06-08

- Align HiveMind GHCR publishing and HiveForge release deployment metadata with
  the flat package path `ghcr.io/sepa79/hivemind-api`.

## 0.4.3 - 2026-06-08

- Remove the `HIVEMIND_SWARM_NETWORK` deployment input and external overlay
  network handling from HiveForge Swarm playbooks.
- Let `docker stack deploy` create and use the HiveMind stack default network
  for Swarm deployments.
- Update HiveForge deployment docs so Swarm only requires the placement node and
  task-DNS OpenSearch endpoint in addition to the shared project inputs.

## 0.4.2 - 2026-06-08

- Publish HiveMind Swarm API and MCP ports through the default Swarm ingress
  mode instead of host mode.

## 0.4.1 - 2026-06-08

- Update HiveForge deployment profiles so both `docker-single` and `swarm`
  explicitly require a shared HiveForge managed root, while Swarm still
  requires placement capability.
- Treat `HIVEFORGE_PROFILE` as a HiveForge action parameter instead of a
  project environment requirement in docs and component metadata.
- Add repo-local Ansible inventory so HiveForge playbook validation does not
  emit the default no-inventory warning.
- Make HiveForge Docker/Swarm lifecycle actions safe in Ansible check mode by
  skipping mutating Docker commands and keeping Swarm network inspection
  read-only.
- Update local AI command examples to use the canonical `/home/sepa/HiveMind`
  checkout path.

## 0.4.0 - 2026-05-22

- Add MCP backend routing for multi-deployment setups that keep HiveMind tenant-free, list projects across configured backends, and fail fast on duplicate project ids.
- Add entry lifecycle, correction, project review, HiveMind feedback, and admin memory review REST/MCP tools for explicit memory cleanup and support triage.
- Add MCP `health_check` diagnostics for fast backend reachability checks from MCP clients, including API URL, latency, and transport/API error details.
- Add an OpenSearch restart policy to the local Compose stack and HiveForge-rendered Compose template so the shared backend recovers after host restarts.
- Apply the bundled `base@v1` AI ruleset standard to the HiveMind repository itself, preserving the customized project `AGENTS.md` and adding the standard marker/docs.

## 0.3.3 - 2026-05-19

- Fix the HiveForge service component manifest to match the current component deployment contract.
- Keep Compose-scoped OpenSearch volume handling inside the lifecycle playbooks instead of declaring an unscoped Docker volume precheck.

## 0.3.2 - 2026-05-19

- Add HiveForge project and service manifests for the shared OpenSearch stack.
- Add HiveForge lifecycle playbooks for deploy, remove, purge, update, and upgrade.
- Add explicit `docker-single` and `swarm` deployment profiles.
- Keep normal remove, update, and upgrade flows data-preserving; only purge deletes OpenSearch volumes and requires explicit approval.
- Add Swarm deployment support with explicit placement node, explicit overlay network, host-mode API/MCP ports, and explicit OpenSearch task endpoint configuration.
- Document HiveForge deployment inputs and safe redeploy guidance.

## 0.3.1 - 2026-05-18

- Document the shared stack as separate `hivemind-api` and `hivemind-mcp` services, both using the same release image.
- Update rollout and MCP client distribution docs for the `4011` Streamable HTTP MCP endpoint.
- Record the operational consolidation of the legacy `skrybe` project records into the canonical `hivemind` project.

## 0.3.0 - 2026-05-18

- Require `repository_url` and `repository_slug` in project metadata so clients can resolve projects by repository identity instead of guessing from local directory names.
- Add project discovery through REST `POST /v1/projects/resolve` and MCP tools `project_list` and `project_resolve`, including ambiguous results when multiple project records intentionally point at the same repository.
- Add one bounded MCP API retry for transient transport failures and HTTP `502`, `503`, and `504` responses.
- Treat ruleset catalog files as customizable starter templates: guidance now reports `missing`, `template_unmodified`, or `customized` instead of failing personalized files as drift.
- Remove `use_hivemind` from checkable required rules; session entries are the evidence that HiveMind was used.
- Package `hivemind-mcp` in the release image and expose a Compose `hivemind-mcp` service on port `4011`.
- Update bootstrap, CLI init, rollout docs, and tests for repository metadata and the new guidance semantics.

## 0.2.1 - 2026-05-14

- Upgrade the built-in web console to the HiveWatch/PocketHive v2 shell with top bar, left navigation, dark glass panels, and responsive layout.
- Add a Home page with the existing HiveMind logo, product positioning, rollout cost notes, and concise value cards.
- Add a Standards console for catalog profiles, guidance checks, required files, drift, and project standard profile assignment.
- Add clickable full entry detail dialogs for Work Unit closeouts and Project Memory results.
- Keep the original HiveMind logo assets and remove the unused experimental v2 mark.

## 0.2.0 - 2026-05-14

- Add a bundled `ai-rulesets/` catalog with `base@v1` and `aws-microservice@v2` starter profiles.
- Add ruleset catalog REST endpoints, MCP tools, and project standard profile assignment.
- Add `guidance_check` to report standardization status from `.hivemind-standard.json` markers.
- Add `scripts/hivemind-standard.mjs` for safe dry-run/apply of standard starter files.
- Allow deployments to override the catalog path with `HIVEMIND_RULESET_CATALOG_PATH`.
- Emit structured API access logs with request id, method, path, status, duration, client IP, user agent, and error code.

## 0.1.5 - 2026-05-13

- Add explicit OpenSearch `indices:data/read/scroll/clear` permission for the `hivemind_api` role.
- Include structured `error.cause` details for MCP fetch transport failures.
- Report the API package version from `/health` instead of the stale hard-coded `0.1.0`.

## 0.1.4 - 2026-04-29

- Report the MCP server version from `hivemind-mcp/package.json` instead of a stale hard-coded value.
- Update remaining documentation references to underscore-separated MCP tool names.

## 0.1.3 - 2026-04-29

- Rename MCP tool registrations from dotted names to underscore-separated names for VS Code compatibility.
- Add regression coverage that enforces MCP tool names matching `[a-z0-9_-]`.
- Document the underscore-separated MCP tool names for client users and agents.

## 0.1.2 - 2026-04-28

- Move OpenSearch security provisioning from inline Compose script to `scripts/opensearch-init.mjs`.
- Run OpenSearch provisioning from the same HiveMind API image with a different command.
- Keep OpenSearch admin bootstrap credentials out of the long-running API service.

## 0.1.1 - 2026-04-27

- Publish API container images only for version tags.
- Publish release images with the version tag and `latest`.
- Keep `main` pushes limited to tests and MCP package artifacts.
- Update Docker and rollout docs for versioned image consumption.

## 0.1.0 - 2026-04-27

- Added shared Docker/OpenSearch deployment shape for HiveMind API.
- Added OpenSearch-backed storage with explicit authentication.
- Added thin MCP client packaging for team-wide VS Code use.
- Added company Swarm rollout documentation.
- Added GitHub release workflow for API container images and MCP tarballs.
