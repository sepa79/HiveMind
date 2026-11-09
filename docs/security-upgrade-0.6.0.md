# Upgrading to HiveMind 0.6.0

This release hardens resource handling and browser responses. It does not add
per-user authentication or reader/writer authorization for ordinary memory
operations. Restrict network access to trusted clients. Administrative token
requirements remain unchanged. No task-board module is included.

## Application and client update

Update the API image and MCP clients together and retain the explicit SDK tool
input guard. Requests over 1 MiB are rejected; tool arguments over 10,000 object
members and array elements are rejected before execution. Clients sending large
records must reduce their request size explicitly.

The image now runs as the Node user, UID/GID 1000. Before replacing a container,
back up its data and grant that user write access only to the deployment's
application data directory, including its administrative-token file. Existing
named volumes may retain root ownership; the image cannot repair mounted
permissions. Do not recursively change unrelated host paths. npm, npx, Corepack
and Yarn are unavailable in the runtime image; install dependencies at build
time. For fs-jsonl storage, configure a writable `HIVEMIND_DATA_ROOT` such as
`/data` rather than writing under the image's `/app` directory.

For a prefixed reverse proxy, strip the prefix upstream, preserve a trailing
slash on the public UI URL and forward security headers unchanged. Remove HTML
substitution rules and caching of nonce-bearing HTML. Verify UI navigation,
assets and requests under the chosen prefix after updating. Align any proxy
body limit with the application's 1 MiB limit.

## OpenSearch is a separate, explicit data migration

Both supplied deployment templates now pin OpenSearch 3.9.0 for new databases.
**Do not run `docker compose up`, or HiveForge update/upgrade with these
templates, against existing 2.17.x storage.** Approving a HiveForge action is
not a database compatibility check. The playbooks do not migrate data.

The upstream [upgrade procedure](https://docs.opensearch.org/latest/migrate-or-upgrade/rolling-upgrade/)
requires reaching at least 2.19.0 before 3.x and prohibits binary downgrades.
Follow the documentation for the chosen exact versions and plugins. For this
single-node stack, plan downtime and use a separately reviewed deployment
definition for each stage; do not overwrite your currently deployed definition
with the new template as an intermediate step.

1. Inventory the actual server version, index creation versions, plugins,
   certificates, storage locations, index counts and shard health. Check all
   3.x breaking changes and index compatibility. An old index may require
   reindexing even when the cluster version meets the minimum.
2. Stop HiveMind API writers and initializer jobs. Back up configuration,
   secrets through the approved secret store, and application data. Take a
   successful OpenSearch snapshot in an independent repository and verify a
   restore on isolated storage. Retain a stopped, consistent pre-upgrade data
   copy; a live filesystem copy is not a supported snapshot substitute.
3. Upgrade the existing database to a supported 2.19.x patch first. Verify
   health, mappings, all HiveMind index counts, and representative API reads and
   writes. Take and verify a new snapshot at this stage.
4. Upgrade to the pinned 3.9.0 image on prepared storage. Preserve matching
   plugin versions and TLS configuration. Verify primary shards, index counts,
   API create/search/idempotent retry, MCP negotiation and administrative
   rejection before resuming normal writers. Reconcile any single-node replica
   warnings explicitly; do not label missing primary shards as healthy.
5. Retain the pre-upgrade snapshots, compatible old binaries and configuration
   for the agreed recovery window. Recovery means an isolated old-version
   cluster restored from a compatible pre-upgrade snapshot/cold copy, never
   starting 2.x against storage modified by 3.x. A retained old copy omits all
   subsequent writes; define reconciliation and acceptable data loss first.

Operators retaining 2.x must keep their existing reviewed database image and
deployment definition until a separate migration is ready. This release does
not certify an arbitrary existing database or perform a migration for you.

## Verification and remaining scope

Run `npm ci`, `npm test`, `npm run pack:mcp`, both production/full `npm audit`
checks and a fresh scan of the exact image you build. The repository's local
OpenSearch maintenance smoke expects 3.9.0 and must target a disposable,
unauthenticated loopback node only. Never aim it at retained production data.
Package and container advisory counts overlap and are not proof of exploitability
or of complete security. This release does not certify external proxies,
database image dependencies, deployment-specific TLS trust or backup schedules.
