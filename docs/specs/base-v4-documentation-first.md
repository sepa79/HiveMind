# base@v4: documentation before implementation

Status: planned profile change, documented before profile or test edits on
11 November 2026. This specification is not deployment or acceptance evidence.

## Responsibility owners

- Profile content and required structured guidance: `ai-rulesets/base/v4/manifest.json`
  and its `files/` tree, owned by HiveMind catalog maintainers.
- Catalog loading, manifest validation and rendering: the existing
  `hivemind-api/src/app/ruleset-catalog.mjs` and domain contracts. No new API,
  schema, renderer or enforcement service is introduced.
- Repository adoption: the adopting project's maintainer owns authority mapping,
  preservation of customized instructions, explicit profile assignment and marker
  refresh. Publishing a catalog does not migrate projects.
- Contributors document intended changes before implementation; reviewers verify
  that sequence and the documented acceptance criteria against actual evidence.

## Expected behavior

Add immutable `base@v4` alongside unchanged `base@v3`, inheriting its NFF,
repository-wide SSOT, meaningful testing, Git safety and canonical stored-marker
requirements. No existing project assignment or AWS profile changes.

The new required rule `documentation_before_implementation` must require:

1. Read-only investigation may precede documentation.
2. Before editing implementation or tests, update the canonical docs/specs for
   planned behavior, architecture, contracts, configuration, commands, deployment
   or risk changes. Use the existing authority, not a parallel task/spec copy.
3. Document responsibility owners, expected behavior and acceptance criteria.
4. If the plan changes, revise those documents before further implementation or
   test edits for the changed plan.
5. Treat planned, implemented, verified and deployed status separately; a plan
   does not establish implementation, deployment or acceptance.

The same requirement must appear in the v4 AGENTS, review and HiveMind
checklists, task template and structured rule. Supporting bootstrap, specs,
evidence and upgrade guidance must not retain the weaker "before or with
implementation" or "docs in the same change" permission. The structured rule
uses the existing `required` / `file_reference_required` contract; this is
agent/reviewer guidance, not a server that infers edit order from file hashes.

Catalog manifest rules and active project rulesets are separate authorities in
the existing API. Profile assignment does not import manifest rules into the
project ruleset. Adoption must read `rules_get`, explicitly merge the v4 rule
by `rule_id` into the full existing ruleset using `rules_define`, then re-read
and verify it. Preserve all unrelated project rules; do not replace them with
only the manifest. This task supplies the rule and tests that activation path
with disposable projects only, without modifying a live project's ruleset.

## Adoption and availability

Catalog contents are local to the API host/image or explicitly configured catalog
mount. CLI `apply` uses its local catalog; a successful local apply does not prove
the deployed API serves v4. The release path and separate project migration are
documented in `docs/ai-ruleset-catalog.md`. This task prepares source and tests
only, with no commit, push, merge, tag, deployment or reassignment.

For existing repositories, first inspect the deployed bundle and local dry-run,
map every target to its canonical authority, then merge missing v4 requirements
into customized files. `--conflict skip` alone does not install new rules into
existing files. Preserve project-specific instructions and never blanket
overwrite them. Assign v4 only after that review, then refresh the canonical
stored marker and run guidance plus normal validation. Existing projects keep
their previous assignments and local extensions until explicitly migrated.

## Acceptance criteria

- Catalog list/get/bundle expose base@v4 with rendered project/profile variables.
- All v3 required rules survive unchanged; v4 adds the required documentation rule.
- All v4 workflow surfaces express the order, owners, behavior, acceptance,
  replanning and status distinction without the weaker wording.
- Existing profile versions are unchanged; no project assignments are modified.
- CLI dry-run writes nothing; safe application preserves customized instructions,
  creates missing files, and a repeated apply does not rewrite matching files.
- Existing catalog validation, API guidance/marker and upgrade tests pass along
  with new v4 checks. Document actual commands/results separately from this plan.
- Availability instructions explicitly distinguish local readiness, API catalog
  publication and project adoption; they do not claim v4 is already deployed.
