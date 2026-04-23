#!/usr/bin/env node

/**
 * PocketHive orchestrator / Rabbit debug CLI.
 *
 * This no longer speaks MCP; it just:
 * - Talks to the Orchestrator REST API directly
 * - Reads control-plane recordings written by rabbit-recorder.mjs
 * - Talks to RabbitMQ via AMQP and (optionally) HTTP management API
 *
 * Usage (from repo root):
 *
 *   node tools/mcp-orchestrator-debug/client.mjs list-swarms
 *   node tools/mcp-orchestrator-debug/client.mjs get-swarm foo
 *   node tools/mcp-orchestrator-debug/client.mjs get-recorded
 *
 * For RabbitMQ recording, run in a separate terminal:
 *
 *   node tools/mcp-orchestrator-debug/rabbit-recorder.mjs
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOG_PATH = resolve(__dirname, "control-recording.jsonl");

const ORCHESTRATOR_BASE_URL =
  process.env.ORCHESTRATOR_BASE_URL || "http://localhost:8088/orchestrator";

function printUsage() {
  console.error(
    "Usage:\n" +
      "  node reference/pockethive-orchestrator-debug/client.mjs list-swarms\n" +
      "  node reference/pockethive-orchestrator-debug/client.mjs get-swarm <swarmId>\n" +
      "  node reference/pockethive-orchestrator-debug/client.mjs get-recorded\n"
  );
}

const args = process.argv.slice(2);
if (args.length === 0) {
  printUsage();
  process.exit(1);
}

const subcommand = args[0];

async function main() {
  if (subcommand === "list-swarms") {
    const swarms = await httpJson("/api/swarms");
    console.log(JSON.stringify(swarms ?? [], null, 2));
    return;
  }

  if (subcommand === "get-swarm") {
    const swarmId = args[1];
    if (!swarmId) {
      throw new Error("Missing required argument: swarmId");
    }
    const swarm = await httpJson(`/api/swarms/${encodeURIComponent(swarmId)}`);
    console.log(JSON.stringify(swarm, null, 2));
    return;
  }

  if (subcommand === "get-recorded") {
    if (!existsSync(LOG_PATH)) {
      console.log("[]");
      return;
    }
    const lines = readFileSync(LOG_PATH, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          return [JSON.parse(line)];
        } catch {
          return [];
        }
      });
    console.log(JSON.stringify(lines, null, 2));
    return;
  }

  throw new Error(`Unsupported command '${subcommand}'.`);
}

async function httpJson(pathname) {
  const response = await fetch(`${ORCHESTRATOR_BASE_URL}${pathname}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${pathname}`);
  }
  return response.json();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
