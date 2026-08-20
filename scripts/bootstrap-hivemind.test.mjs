import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapHiveMindProject } from "./bootstrap-hivemind.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("bootstrapHiveMindProject", () => {
  it("creates persistent project and ruleset files for a fresh clone", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "hivemind-workspace-"));
    const dataRoot = join(workspaceRoot, ".hivemind");
    roots.push(workspaceRoot);
    mkdirSync(workspaceRoot, { recursive: true });

    const result = await bootstrapHiveMindProject({ workspaceRoot, dataRoot });

    const project = JSON.parse(readFileSync(join(dataRoot, "projects", "hivemind", "project.json"), "utf8"));
    const ruleset = JSON.parse(readFileSync(join(dataRoot, "projects", "hivemind", "ruleset.json"), "utf8"));

    expect(result.project.project_id).toBe("hivemind");
    expect(result.project.root_path).toBe(workspaceRoot);
    expect(project.root_path).toBe(workspaceRoot);
    expect(ruleset.version).toBe(1);
    expect(ruleset.rules.length).toBeGreaterThan(5);
  });

  it("does not bump the ruleset version when bootstrapped twice without changes", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "hivemind-workspace-"));
    const dataRoot = join(workspaceRoot, ".hivemind");
    roots.push(workspaceRoot);

    const first = await bootstrapHiveMindProject({ workspaceRoot, dataRoot });
    const second = await bootstrapHiveMindProject({ workspaceRoot, dataRoot });

    expect(first.ruleset.version).toBe(1);
    expect(second.ruleset.version).toBe(1);
    expect(second.project.root_path).toBe(workspaceRoot);
  });

  it("backfills repository identity when bootstrapping over legacy demo state", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "hivemind-workspace-"));
    const dataRoot = join(workspaceRoot, ".hivemind");
    const projectDir = join(dataRoot, "projects", "hivemind");
    roots.push(workspaceRoot);

    mkdirSync(projectDir, { recursive: true });
    writeFileSync(
      join(projectDir, "project.json"),
      JSON.stringify(
        {
          project_id: "hivemind",
          name: "HiveMind",
          root_path: "/legacy/workspace",
          default_branch: "main",
          description: "Legacy demo snapshot",
          features: ["UI"],
          categories: [],
          ruleset_id: "hivemind:1",
          created_at: "2026-04-23T21:14:40.338Z",
          updated_at: "2026-04-27T09:04:00.068Z"
        },
        null,
        2
      )
    );
    writeFileSync(
      join(projectDir, "ruleset.json"),
      JSON.stringify(
        {
          project_id: "hivemind",
          ruleset_id: "hivemind:1",
          version: 1,
          rules: [],
          created_at: "2026-04-23T21:14:40.338Z",
          updated_at: "2026-04-23T21:14:40.341Z"
        },
        null,
        2
      )
    );

    const result = await bootstrapHiveMindProject({ workspaceRoot, dataRoot });
    const project = JSON.parse(readFileSync(join(projectDir, "project.json"), "utf8"));

    expect(result.project.repository_slug).toBe("sepa79/HiveMind");
    expect(result.project.repository_url).toBe("https://github.com/sepa79/HiveMind.git");
    expect(project.repository_slug).toBe("sepa79/HiveMind");
    expect(project.repository_url).toBe("https://github.com/sepa79/HiveMind.git");
    expect(project.root_path).toBe(workspaceRoot);
    expect(result.ruleset.version).toBeGreaterThan(0);
  });
});
