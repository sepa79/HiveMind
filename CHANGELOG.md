# Changelog

All notable HiveMind changes are recorded here.

## Unreleased

- Add MCP `health_check` diagnostics for fast backend reachability checks from MCP clients, including API URL, latency, and transport/API error details.
- Add an OpenSearch restart policy to the local Compose stack and HiveForge-rendered Compose template so the shared backend recovers after host restarts.

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
