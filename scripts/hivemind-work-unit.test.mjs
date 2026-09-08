import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FsJsonlStorage } from "../hivemind-api/src/storage/fs-jsonl-storage.mjs";
import { HiveMindService } from "../hivemind-api/src/app/service.mjs";
import { createApp } from "../hivemind-api/src/http/app.mjs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main, parseCli } from "./hivemind-work-unit.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("hivemind work-unit CLI", () => {
  it("parses start options", () => {
    expect(parseCli(["start", "--goal", "Audit UI", "--branch", "main"])).toEqual({
      command: "start",
      options: {
        goal: "Audit UI",
        branch: "main"
      },
      commandArgs: []
    });
  });

  it("parses wrapped commands after --", () => {
    expect(parseCli(["run", "--goal", "Run tests", "--", "npm", "test"])).toEqual({
      command: "run",
      options: {
        goal: "Run tests"
      },
      commandArgs: ["npm", "test"]
    });
  });

  it("parses repeated feature values for init", () => {
    expect(parseCli(["init", "--project", "buzz", "--feature", "UI", "--feature", "Backend"])).toEqual({
      command: "init",
      options: {
        project: "buzz",
        feature: ["UI", "Backend"]
      },
      commandArgs: []
    });
  });

  it.each(["start", "run"])("%s forwards feature scope to real API recall and preserves it in work-unit state", async (command) => {
    const root = mkdtempSync(join(tmpdir(), "hivemind-cli-feature-")); roots.push(root);
    const storage = new FsJsonlStorage({ dataRoot: join(root, "data") });
    const service = new HiveMindService({ storage });
    const app = createApp({ service });
    await service.registerProject({ project_id: "alpha", name: "Alpha", repository_slug: "example/alpha", repository_url: "https://github.com/example/alpha.git", root_path: root, default_branch: "main" });
    await service.defineRules({ project_id: "alpha", rules: [{ rule_id: "test_relevant_slices", label: "Test relevant slices", description: "Run relevant tests", severity: "required", check_mode: "command_reference_required" }] });
    const provenance = { project_id: "alpha", branch: "main", workspace_path: root, author_id: "codex", author_type: "agent", source: "mcp", agent_id: "codex" };
    const seed = await service.startSession({ ...provenance, goal: "Seed feature memory" }, { idempotencyKey: "seed" });
    const { entry } = await service.appendEntry({ ...provenance, session_id: seed.session.session_id, entry_type: "decision", feature: "PAYMENTS", summary: "Payment contract", applicability: { state: "current", scope: "feature", reason: "Verified", evidence_refs: [{ kind: "repo_file", target: "README.md" }] } }, { idempotencyKey: "decision" });
    const fetch = vi.fn((url, init) => app.request(url, init));
    vi.stubGlobal("fetch", fetch);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const statePath = join(root, "state.json");
    const args = [command, "--goal", "Feature work", "--project", "alpha", "--branch", "main", "--feature", "PAYMENTS", "--state", statePath, "--idempotency-key", "cli-session"];
    if (command === "run") args.push("--", process.execPath, "-e", "process.exit(0)");
    expect(await main(args, {}, root)).toBe(0);
    const output = JSON.parse(log.mock.calls[0][0]);
    expect(output.session.feature).toBe("PAYMENTS");
    expect(output.recall.scope.feature).toBe("PAYMENTS");
    expect(output.recall.guidance.map((item) => item.id)).toEqual([entry.entry_id]);
    expect((await storage.getSession(output.session.session_id)).feature).toBe("PAYMENTS");
    if (command === "start") {
      expect(JSON.parse(readFileSync(statePath, "utf8")).feature).toBe("PAYMENTS");
      const callsBeforeResume = fetch.mock.calls.length;
      await main([...args, "--resume"], {}, root);
      expect(fetch.mock.calls).toHaveLength(callsBeforeResume + 1);
      expect(fetch.mock.calls.at(-1)[0]).toBe(`http://127.0.0.1:4010/v1/sessions/${output.session.session_id}`);
      const wrongScope = [...args]; wrongScope[wrongScope.indexOf("PAYMENTS")] = "REPORTS";
      await expect(main([...wrongScope, "--resume"], {}, root)).rejects.toThrow("different feature");
      rmSync(statePath);
      await main(args, {}, root);
      expect(JSON.parse(readFileSync(statePath, "utf8")).session_id).toBe(output.session.session_id);
    } else {
      const progress = await storage.searchEntries({ project_id: "alpha", session_id: output.session.session_id, entry_type: ["progress"] });
      expect(progress.entries).toHaveLength(1);
      expect(progress.entries[0].feature).toBe("PAYMENTS");
      expect((await storage.getSession(output.session.session_id)).status).toBe("completed");
    }
  });

  it("resumes using the renamed feature from the API and updates local state", async () => {
    const { root, service, storage, statePath, args } = await renameFixture();
    await main(["start", ...args, "--feature", "PAYMENTS"], {}, root);
    const initial = JSON.parse(readFileSync(statePath, "utf8"));
    await service.renameFeature({ project_id: "alpha", feature: "PAYMENTS", new_feature: "BILLING" });
    await main(["start", ...args, "--resume", "--feature", "BILLING"], {}, root);
    expect(JSON.parse(readFileSync(statePath, "utf8"))).toMatchObject({ session_id: initial.session_id, feature: "BILLING" });
    await expect(main(["start", ...args, "--resume", "--feature", "PAYMENTS"], {}, root)).rejects.toThrow("different feature");
    await main(["run", ...args, "--resume", "--", process.execPath, "-e", "process.exit(0)"], {}, root);
    const progress = await storage.searchEntries({ project_id: "alpha", session_id: initial.session_id, entry_type: ["progress"] });
    expect(progress.entries.map((entry) => entry.feature)).toEqual(["BILLING"]);
  });

  it("refreshes the session again when a feature is renamed during the wrapped command", async () => {
    const { root, service, storage, args } = await renameFixture();
    const server = createServer(async (_req, res) => {
      try {
        await service.renameFeature({ project_id: "alpha", feature: "PAYMENTS", new_feature: "BILLING" });
        res.end("renamed");
      } catch (error) { res.statusCode = 500; res.end(error.message); }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const command = `fetch("http://127.0.0.1:${server.address().port}", { method: "POST" }).then(r => { if (!r.ok) process.exit(1); })`;
      expect(await main(["run", ...args, "--feature", "PAYMENTS", "--", process.execPath, "-e", command], {}, root)).toBe(0);
      const progress = await storage.searchEntries({ project_id: "alpha", entry_type: ["progress"] });
      expect(progress.entries.map((entry) => entry.feature)).toEqual(["BILLING"]);
      expect((await storage.getSession(progress.entries[0].session_id)).feature).toBe("BILLING");
    } finally { await new Promise((resolve) => server.close(resolve)); }
  });

  it.each(["missing", "completed", "unavailable"])("does not run or write from cached state when authoritative session lookup is %s", async (failure) => {
    const { root, service, storage, app, statePath, args } = await renameFixture();
    await main(["start", ...args, "--feature", "PAYMENTS"], {}, root);
    const originalState = readFileSync(statePath, "utf8");
    const { session_id } = JSON.parse(originalState);
    if (failure === "completed") await service.endSession({ session_id, status: "completed" });
    if (failure === "missing") await service.deleteProject({ project_id: "alpha" });
    if (failure === "unavailable") vi.stubGlobal("fetch", async (url, init) => {
      if (init.method === "GET") throw new Error("API unavailable");
      return app.request(url, init);
    });
    const marker = join(root, "command-ran");
    const command = `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran")`;
    const error = failure === "completed" ? "only active" : failure === "missing" ? "SESSION_NOT_FOUND" : "API unavailable";
    await expect(main(["run", ...args, "--resume", "--", process.execPath, "-e", command], {}, root)).rejects.toThrow(error);
    expect(existsSync(marker)).toBe(false);
    expect(readFileSync(statePath, "utf8")).toBe(originalState);
    if (failure !== "missing") expect((await storage.searchEntries({ project_id: "alpha", entry_type: ["progress"] })).entries).toEqual([]);
  });

  it("does not append progress or close a session when the post-command refresh fails", async () => {
    const { root, storage, app, statePath, args } = await renameFixture();
    vi.stubGlobal("fetch", async (url, init) => {
      if (init.method === "GET") throw new Error("Refresh unavailable");
      return app.request(url, init);
    });
    await expect(main(["run", ...args, "--feature", "PAYMENTS", "--", process.execPath, "-e", "process.exit(0)"], {}, root)).rejects.toThrow("Refresh unavailable");
    const { session_id } = JSON.parse(readFileSync(statePath, "utf8"));
    expect((await storage.getSession(session_id)).status).toBe("active");
    expect((await storage.searchEntries({ project_id: "alpha", entry_type: ["progress"] })).entries).toEqual([]);
  });

  it.each([["--feature"], ["--feature", "A", "--feature", "B"]])("rejects invalid feature flag arity: %j", async (...flags) => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(main(["start", "--goal", "Test", "--branch", "main", ...flags], {}, process.cwd())).rejects.toThrow("exactly one");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses the canonical project id returned by init before adding features", async () => {
    const calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        calls.push({ url, init });
        if (url.endsWith("/v1/projects") && init.method === "POST") {
          return jsonResponse({
            ok: true,
            data: {
              project: {
                project_id: "myproject",
                features: []
              }
            }
          });
        }
        if (url.endsWith("/v1/projects/myproject/features") && init.method === "POST") {
          return jsonResponse({
            ok: true,
            data: {
              project_id: "myproject",
              features: ["UI"]
            }
          });
        }
        if (url.endsWith("/v1/projects/myproject/features") && init.method === "GET") {
          return jsonResponse({
            ok: true,
            data: {
              project_id: "myproject",
              features: ["UI"]
            }
          });
        }
        return jsonResponse(
          {
            ok: false,
            error: {
              code: "UNEXPECTED_URL",
              message: url
            }
          },
          404
        );
      })
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const exitCode = await main(
      [
        "init",
        "--project",
        "MyProject",
        "--name",
        "My Project",
        "--repository-url",
        "https://github.com/org/MyProject.git",
        "--root",
        "/repo/MyProject",
        "--feature",
        "UI"
      ],
      {},
      process.cwd()
    );

    expect(exitCode).toBe(0);
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/v1/projects",
      "/v1/projects/myproject/features",
      "/v1/projects/myproject/features"
    ]);
    expect(log).toHaveBeenCalledOnce();
  });
});

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  };
}

async function renameFixture() {
  const root = mkdtempSync(join(tmpdir(), "hivemind-cli-rename-")); roots.push(root);
  const storage = new FsJsonlStorage({ dataRoot: join(root, "data") });
  const service = new HiveMindService({ storage });
  const app = createApp({ service });
  await service.registerProject({ project_id: "alpha", name: "Alpha", repository_slug: "example/alpha", repository_url: "https://github.com/example/alpha.git", root_path: root, default_branch: "main" });
  await service.addFeature({ project_id: "alpha", feature: "PAYMENTS" });
  await service.defineRules({ project_id: "alpha", rules: [{ rule_id: "test_relevant_slices", label: "Tests", description: "Run tests", severity: "required", check_mode: "command_reference_required" }] });
  vi.stubGlobal("fetch", (url, init) => app.request(url, init));
  vi.spyOn(console, "log").mockImplementation(() => {});
  const statePath = join(root, "state.json");
  const args = ["--goal", "Feature work", "--project", "alpha", "--branch", "main", "--state", statePath];
  return { root, storage, service, app, statePath, args };
}
