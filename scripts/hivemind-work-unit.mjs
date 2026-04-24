#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:4010";
const DEFAULT_PROJECT_ID = "hivemind";

export async function main(argv = process.argv.slice(2), env = process.env, cwd = process.cwd()) {
  const { command, options, commandArgs } = parseCli(argv);
  const config = buildConfig({ env, cwd, options });

  if (command === "start") {
    await startWorkUnit(config, options);
    return 0;
  }
  if (command === "status") {
    printStatus(config);
    return 0;
  }
  if (command === "end") {
    await endWorkUnit(config, options.status ?? "completed");
    return 0;
  }
  if (command === "run") {
    return runWorkUnit(config, options, commandArgs);
  }
  if (command === "doctor") {
    await doctor(config);
    return 0;
  }
  if (command === "init") {
    await initProject(config, options);
    return 0;
  }

  usage();
  return 1;
}

export function parseCli(argv) {
  const [command, ...rest] = argv;
  const options = {};
  const commandArgs = [];
  let passthrough = false;

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (passthrough) {
      commandArgs.push(arg);
      continue;
    }
    if (arg === "--") {
      passthrough = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[index + 1];
      const hasValue = Boolean(next && !next.startsWith("--"));
      const value = hasValue ? next : true;
      if (options[key] !== undefined) {
        options[key] = Array.isArray(options[key]) ? [...options[key], value] : [options[key], value];
      } else {
        options[key] = value;
      }
      if (hasValue) {
        index += 1;
      }
      continue;
    }
    commandArgs.push(arg);
  }

  return { command, options, commandArgs };
}

function buildConfig({ env, cwd, options }) {
  const dataRoot = resolve(env.HIVEMIND_DATA_ROOT || join(cwd, ".hivemind"));
  return {
    apiBaseUrl: trimTrailingSlash(options.api || env.HIVEMIND_API_BASE_URL || DEFAULT_API_BASE_URL),
    projectId: options.project || env.HIVEMIND_PROJECT_ID || DEFAULT_PROJECT_ID,
    branch: options.branch || env.HIVEMIND_BRANCH || currentGitBranch(cwd) || "main",
    workspacePath: options.workspace || env.HIVEMIND_WORKSPACE_PATH || cwd,
    authorId: options.author || env.HIVEMIND_AUTHOR_ID || env.USER || "agent",
    authorType: options["author-type"] || env.HIVEMIND_AUTHOR_TYPE || "agent",
    source: options.source || env.HIVEMIND_SOURCE || "cli",
    agentId: options.agent || env.HIVEMIND_AGENT_ID || "hivemind-work-unit",
    stateFile: resolve(options.state || env.HIVEMIND_WORK_UNIT_STATE || join(dataRoot, "current-work-unit.json"))
  };
}

async function startWorkUnit(config, options) {
  if (!options.goal) {
    throw new Error("Missing --goal.");
  }
  if (existsSync(config.stateFile) && !options.resume) {
    const current = readState(config);
    throw new Error(
      `Work unit already active: ${current.session_id}. Run status/end first, or pass --resume to reuse it.`
    );
  }
  if (existsSync(config.stateFile) && options.resume) {
    const current = readState(config);
    console.log(JSON.stringify({ session_id: current.session_id, resumed: true }, null, 2));
    return current;
  }

  const payload = {
    project_id: config.projectId,
    branch: config.branch,
    workspace_path: config.workspacePath,
    author_id: config.authorId,
    author_type: config.authorType,
    source: config.source,
    agent_id: config.agentId,
    goal: options.goal
  };
  const data = await api(config, "/v1/sessions", {
    method: "POST",
    idempotencyKey: options["idempotency-key"] || `work-unit-${randomUUID()}`,
    body: payload
  });
  const state = {
    session_id: data.session.session_id,
    project_id: data.session.project_id,
    branch: data.session.branch,
    goal: data.session.goal,
    started_at: data.session.started_at
  };
  writeState(config, state);
  console.log(JSON.stringify({ session: state, startup_summary: data.startup_summary }, null, 2));
  return state;
}

function printStatus(config) {
  if (!existsSync(config.stateFile)) {
    console.log("No active HiveMind work unit.");
    return;
  }
  console.log(JSON.stringify(readState(config), null, 2));
}

async function endWorkUnit(config, status) {
  if (!existsSync(config.stateFile)) {
    throw new Error("No active HiveMind work unit state file exists.");
  }
  if (!["completed", "abandoned"].includes(status)) {
    throw new Error("--status must be completed or abandoned.");
  }
  const state = readState(config);
  const data = await api(config, `/v1/sessions/${encodeURIComponent(state.session_id)}/end`, {
    method: "POST",
    body: { status }
  });
  rmSync(config.stateFile, { force: true });
  console.log(JSON.stringify(data.closeout, null, 2));
  return data.closeout;
}

async function runWorkUnit(config, options, commandArgs) {
  if (commandArgs.length === 0) {
    throw new Error("Missing command after --.");
  }
  const state = await startWorkUnit(config, options);
  const exitCode = await runCommand(commandArgs, config.workspacePath);
  await appendProgress(config, state, commandArgs, exitCode);
  await submitRuleCheck(config, state, {
    rule_id: "use_hivemind",
    status: "applied",
    evidence: `Wrapped command in HiveMind work unit '${state.session_id}'.`
  });
  await submitRuleCheck(config, state, {
    rule_id: "test_relevant_slices",
    status: exitCode === 0 ? "applied" : "failed",
    evidence: `${commandArgs.join(" ")} exited with code ${exitCode}.`
  });
  await endWorkUnit(config, exitCode === 0 ? "completed" : "abandoned");
  return exitCode;
}

async function doctor(config) {
  const checks = [];
  const health = await api(config, "/health", { method: "GET" });
  checks.push(["api", health.status === "ok", `${health.service} ${health.version}`]);

  const projects = await api(config, "/v1/projects", { method: "GET" });
  checks.push(["projects", Array.isArray(projects.projects), `${projects.projects.length} project(s)`]);

  const ui = await fetch(`${config.apiBaseUrl}/`);
  const uiText = await ui.text();
  checks.push(["ui", ui.ok && uiText.includes("HiveMind Work Units"), `HTTP ${ui.status}`]);

  const failed = checks.filter(([, ok]) => !ok);
  for (const [name, ok, detail] of checks) {
    console.log(`${ok ? "ok" : "fail"} ${name}: ${detail}`);
  }
  if (failed.length > 0) {
    throw new Error(`${failed.length} doctor check(s) failed.`);
  }
}

async function initProject(config, options) {
  const projectId = options.project || config.projectId;
  if (!projectId) {
    throw new Error("Missing --project.");
  }
  const name = options.name || projectId;
  const defaultBranch = options["default-branch"] || config.branch;
  const rootPath = resolve(options.root || config.workspacePath);
  const description = options.description || `HiveMind project for ${name}.`;
  const features = normalizeList(options.feature);

  const { project } = await api(config, "/v1/projects", {
    method: "POST",
    body: {
      project_id: projectId,
      name,
      root_path: rootPath,
      default_branch: defaultBranch,
      description
    }
  });

  for (const feature of features) {
    await api(config, `/v1/projects/${encodeURIComponent(projectId)}/features`, {
      method: "POST",
      body: { feature }
    });
  }

  const result = features.length > 0 ? await api(config, `/v1/projects/${encodeURIComponent(projectId)}/features`, { method: "GET" }) : null;
  console.log(
    JSON.stringify(
      {
        project,
        features: result?.features ?? project.features ?? []
      },
      null,
      2
    )
  );
}

async function appendProgress(config, state, commandArgs, exitCode) {
  await api(config, "/v1/entries", {
    method: "POST",
    idempotencyKey: `work-unit-progress-${state.session_id}`,
    body: {
      project_id: state.project_id,
      branch: state.branch,
      session_id: state.session_id,
      author_id: config.authorId,
      author_type: config.authorType,
      source: config.source,
      entry_type: "progress",
      summary: `Ran '${commandArgs.join(" ")}' in HiveMind work unit; exit code ${exitCode}.`,
      tags: ["hivemind-wrapper"]
    }
  });
}

async function submitRuleCheck(config, state, { rule_id, status, evidence }) {
  await api(config, "/v1/rule-checks", {
    method: "POST",
    idempotencyKey: `work-unit-${state.session_id}-${rule_id}`,
    body: {
      project_id: state.project_id,
      session_id: state.session_id,
      rule_id,
      author_id: config.authorId,
      author_type: config.authorType,
      source: config.source,
      status,
      evidence
    }
  });
}

async function api(config, path, { method, body, idempotencyKey }) {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { "content-type": "application/json" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    const code = payload?.error?.code ?? "HIVEMIND_REQUEST_FAILED";
    const message = payload?.error?.message ?? "HiveMind request failed.";
    throw new Error(`${code}: ${message}`);
  }
  return payload.data;
}

function normalizeList(value) {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function runCommand(commandArgs, cwd) {
  return new Promise((resolveRun) => {
    const child = spawn(commandArgs[0], commandArgs.slice(1), {
      cwd,
      stdio: "inherit",
      shell: false
    });
    child.on("exit", (code) => resolveRun(code ?? 1));
    child.on("error", (error) => {
      console.error(error.message);
      resolveRun(1);
    });
  });
}

function readState(config) {
  return JSON.parse(readFileSync(config.stateFile, "utf8"));
}

function writeState(config, state) {
  mkdirSync(dirname(config.stateFile), { recursive: true });
  writeFileSync(config.stateFile, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function currentGitBranch(cwd) {
  const result = spawnSync("git", ["branch", "--show-current"], {
    cwd,
    encoding: "utf8"
  });
  if (result.status !== 0) {
    return null;
  }
  return result.stdout.trim() || null;
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function usage() {
  console.log(`Usage:
  node scripts/hivemind-work-unit.mjs start --goal "Short task summary"
  node scripts/hivemind-work-unit.mjs status
  node scripts/hivemind-work-unit.mjs end [--status completed|abandoned]
  node scripts/hivemind-work-unit.mjs run --goal "Run tests" -- npm test
  node scripts/hivemind-work-unit.mjs doctor
  node scripts/hivemind-work-unit.mjs init --project my-project --name "My Project" --root /repo/path --feature UI --feature Backend`);
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
