# Changelog

All notable HiveMind changes are recorded here.

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
