import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, request } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const root = new URL("../../", import.meta.url);
const children = [];
let dataRoot;
let apiUrl;
let mcpUrl;
let client;

async function start(script, env, ready) {
  const child = spawn(process.execPath, [script], {
    cwd: root, env: { PATH: process.env.PATH, HOME: process.env.HOME, ...env }, stdio: ["ignore", "pipe", "pipe"]
  });
  children.push(child);
  let output = "";
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Startup timed out: ${output}`)), 10000);
    function read(chunk) {
      output = (output + chunk.toString()).slice(-4000);
      const match = ready.exec(output);
      if (match) { clearTimeout(timeout); resolve(match); }
    }
    child.stdout.on("data", read);
    child.stderr.on("data", read);
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
  return output.match(ready)[1];
}

function oversized(body, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request(mcpUrl, { method: "POST", headers: { "content-type": "application/json", ...headers } }, res => {
      res.resume(); res.on("end", () => resolve(res.statusCode));
    });
    req.on("error", reject);
    req.end(body);
  });
}

beforeAll(async () => {
  dataRoot = await mkdtemp(join(tmpdir(), "hivemind-http-test-"));
  apiUrl = await start("hivemind-api/src/server.mjs", {
    HIVEMIND_API_PORT: "0", HIVEMIND_DATA_ROOT: dataRoot, HIVEMIND_ADMIN_TOKEN: "synthetic-test-admin"
  }, /HiveMind API listening on (http:\/\/127\.0\.0\.1:\d+)/);
  // Reserve an ephemeral loopback port for the independently spawned MCP process.
  const probe = createServer(); probe.listen(0, "127.0.0.1"); await once(probe, "listening");
  const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
  mcpUrl = await start("hivemind-mcp/src/server.mjs", {
    HIVEMIND_MCP_TRANSPORT: "http", HIVEMIND_MCP_PORT: String(port), HIVEMIND_MCP_HOST: "127.0.0.1",
    HIVEMIND_API_BASE_URL: apiUrl, HIVEMIND_MCP_ADMIN_TOKEN: "synthetic-test-admin"
  }, /HiveMind MCP listening on (http:\/\/127\.0\.0\.1:\d+\/mcp)/);
  client = new Client({ name: "synthetic-security-test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(mcpUrl)));
}, 15000);

afterAll(async () => {
  await client?.close();
  await Promise.all(children.map(async child => {
    if (child.exitCode === null) { const exited = once(child, "exit"); child.kill(); await exited; }
  }));
  if (dataRoot) await rm(dataRoot, { recursive: true, force: true });
});

describe("real HTTP MCP security boundaries", () => {
  it("negotiates and exposes healthy read tools", async () => {
    expect((await client.listTools()).tools.some(tool => tool.name === "health_check")).toBe(true);
    expect((await client.callTool({ name: "health_check", arguments: {} })).isError).not.toBe(true);
  });

  it("rejects oversized declared and chunked requests without mutation", async () => {
    const body = JSON.stringify({ padding: "x".repeat(1024 * 1024) });
    expect(await oversized(body, { "content-length": Buffer.byteLength(body) })).toBe(413);
    expect(await oversized(body, { "transfer-encoding": "chunked" })).toBe(413);
    expect((await (await fetch(apiUrl + "/v1/projects")).json()).data.projects).toEqual([]);
  });

  it("rejects excessive tool input before creating a project", async () => {
    const arguments_ = { project_id: "synthetic", name: "Synthetic", repository_slug: "example/synthetic", tags: Array(10001).fill("x") };
    const result = await client.callTool({ name: "project_register", arguments: arguments_ });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toMatch(/maximum of 10000 elements/);
    expect((await (await fetch(apiUrl + "/v1/projects")).json()).data.projects).toEqual([]);
  });

  it("preserves administrative rejection for anonymous MCP clients", async () => {
    const result = await client.callTool({ name: "admin_memory_review", arguments: { project_id: "synthetic" } });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toMatch(/authoriz|token/i);
  });
});
