#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { HiveMindApiClient } from "../hivemind-mcp/src/api-client.mjs";
import { DEFAULT_RULESET_CATALOG_PATH, RulesetCatalog, parseProfileRef, sha256 } from "../hivemind-api/src/app/ruleset-catalog.mjs";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:4010";
const MARKER_FILE = ".hivemind-standard.json";

export async function main(argv = process.argv.slice(2), env = process.env, cwd = process.cwd()) {
  const { command, subcommand, options } = parseCli(argv);
  const config = buildConfig({ options, env, cwd });

  if (command === "catalog" && subcommand === "list") {
    const catalog = buildCatalog(config);
    console.log(JSON.stringify(catalog.listProfiles(), null, 2));
    return 0;
  }

  if (command === "catalog" && subcommand === "show") {
    const profileRef = requiredOption(options, "profile");
    const { profileId, version } = parseProfileRef(profileRef);
    const catalog = buildCatalog(config);
    const result = options["include-files"] ? catalog.getBundle(profileId, version) : catalog.getProfile(profileId, version);
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  if (command === "guidance" && subcommand === "check") {
    const projectId = requiredOption(options, "project");
    const target = resolve(options.target || cwd);
    const standardMarker = readMarker(target);
    const apiClient = new HiveMindApiClient({ baseUrl: config.apiBaseUrl });
    const result = await apiClient.guidanceCheck({
      project_id: projectId,
      ...(standardMarker ? { standard_marker: standardMarker } : {})
    });
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  if (command === "apply") {
    const result = applyStandard(config, {
      projectId: requiredOption(options, "project"),
      profileRef: requiredOption(options, "profile"),
      target: resolve(options.target || cwd),
      projectName: options.name || options.project,
      write: Boolean(options.write),
      conflict: options.conflict || "skip"
    });
    console.log(JSON.stringify(result, null, 2));
    return result.summary.conflicting > 0 && !options.write ? 2 : 0;
  }

  usage();
  return 1;
}

export function parseCli(argv) {
  const [command] = argv;
  const hasSubcommand = ["catalog", "guidance"].includes(command);
  const subcommand = hasSubcommand ? argv[1] : null;
  const rest = hasSubcommand ? argv.slice(2) : argv.slice(1);
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = rest[index + 1];
    const hasValue = Boolean(next && !next.startsWith("--"));
    options[key] = hasValue ? next : true;
    if (hasValue) {
      index += 1;
    }
  }
  return { command, subcommand, options };
}

export function applyStandard(config, { projectId, profileRef, target, projectName, write = false, conflict = "skip" }) {
  if (!["skip", "overwrite"].includes(conflict)) {
    throw new Error("--conflict must be skip or overwrite.");
  }
  const { profileId, version } = parseProfileRef(profileRef);
  const catalog = buildCatalog(config);
  const bundle = catalog.getBundle(profileId, version, {
    project_id: projectId,
    project_name: projectName,
    hivemind_api_url: config.apiBaseUrl
  });

  const files = bundle.files.map((file) => compareFile(target, file));
  const actions = [];
  for (const file of files) {
    if (!write) {
      actions.push({ ...file, action: "dry_run" });
      continue;
    }
    if (file.status === "missing") {
      writeTargetFile(target, file.target, file.expected_content);
      actions.push({ ...file, action: "created" });
      continue;
    }
    if (file.status === "current") {
      actions.push({ ...file, action: "unchanged" });
      continue;
    }
    if (conflict === "overwrite") {
      writeTargetFile(target, file.target, file.expected_content);
      actions.push({ ...file, action: "overwritten" });
      continue;
    }
    actions.push({ ...file, action: "skipped" });
  }

  if (write) {
    const markerFiles = bundle.files.map((file) => {
      const targetPath = join(target, file.target);
      const content = existsSync(targetPath) ? readFileSync(targetPath, "utf8") : "";
      return {
        target: file.target,
        sha256: sha256(content)
      };
    });
    writeTargetFile(
      target,
      MARKER_FILE,
      `${JSON.stringify(
        {
          project_id: projectId,
          profile_ref: profileRef,
          catalog_source_url: config.catalogSourceUrl,
          applied_at: new Date().toISOString(),
          files: markerFiles
        },
        null,
        2
      )}\n`
    );
  }

  return {
    profile_ref: profileRef,
    target,
    write,
    conflict,
    files: actions.map(({ expected_content, ...action }) => action),
    summary: summarize(actions)
  };
}

function compareFile(targetRoot, file) {
  const targetPath = join(targetRoot, file.target);
  if (!existsSync(targetPath)) {
    return {
      source: file.source,
      target: file.target,
      required: file.required,
      expected_sha256: file.sha256,
      actual_sha256: null,
      status: "missing",
      expected_content: file.content
    };
  }
  const content = readFileSync(targetPath, "utf8");
  const actualSha = sha256(content);
  return {
    source: file.source,
    target: file.target,
    required: file.required,
    expected_sha256: file.sha256,
    actual_sha256: actualSha,
    status: actualSha === file.sha256 ? "current" : "changed",
    expected_content: file.content
  };
}

function summarize(actions) {
  return {
    missing: actions.filter((file) => file.status === "missing").length,
    current: actions.filter((file) => file.status === "current").length,
    changed: actions.filter((file) => file.status === "changed").length,
    conflicting: actions.filter((file) => file.status === "changed" && file.action !== "overwritten").length,
    written: actions.filter((file) => ["created", "overwritten"].includes(file.action)).length
  };
}

function writeTargetFile(targetRoot, relativePath, content) {
  const targetPath = join(targetRoot, relativePath);
  ensureInsideTarget(targetRoot, targetPath, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, "utf8");
}

function ensureInsideTarget(targetRoot, targetPath, relativePath) {
  const resolvedRoot = resolve(targetRoot);
  const resolvedTarget = resolve(targetPath);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}/`)) {
    throw new Error(`Refusing to write outside target: ${relativePath}`);
  }
}

function readMarker(target) {
  const markerPath = join(target, MARKER_FILE);
  if (!existsSync(markerPath)) {
    return null;
  }
  return JSON.parse(readFileSync(markerPath, "utf8"));
}

function buildConfig({ options, env, cwd }) {
  return {
    apiBaseUrl: trimTrailingSlash(options.api || env.HIVEMIND_API_BASE_URL || DEFAULT_API_BASE_URL),
    catalogPath: resolve(options.catalog || env.HIVEMIND_RULESET_CATALOG_PATH || DEFAULT_RULESET_CATALOG_PATH),
    catalogSourceUrl: options["catalog-source-url"] || env.HIVEMIND_RULESET_CATALOG_SOURCE_URL || null,
    cwd
  };
}

function buildCatalog(config) {
  return new RulesetCatalog({
    catalogPath: config.catalogPath,
    catalogSourceUrl: config.catalogSourceUrl,
    hivemindApiUrl: config.apiBaseUrl
  });
}

function requiredOption(options, name) {
  if (!options[name]) {
    throw new Error(`Missing --${name}.`);
  }
  return options[name];
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function usage() {
  console.log(`Usage:
  node scripts/hivemind-standard.mjs catalog list
  node scripts/hivemind-standard.mjs catalog show --profile aws-microservice@v2 [--include-files]
  node scripts/hivemind-standard.mjs guidance check --project my-service --target /repo
  node scripts/hivemind-standard.mjs apply --project my-service --profile aws-microservice@v2 --target /repo [--write] [--conflict skip|overwrite]`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    }
  );
}
