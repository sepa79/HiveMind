import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { bootstrapHiveMindProject } from "./bootstrap-skrybe.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("bootstrapHiveMindProject", () => {
  it("creates persistent project and ruleset files for a fresh clone", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "hivemind-workspace-"));
    const dataRoot = join(workspaceRoot, ".skrybe");
    roots.push(workspaceRoot);
    mkdirSync(workspaceRoot, { recursive: true });

    const result = await bootstrapHiveMindProject({ workspaceRoot, dataRoot });

    const project = JSON.parse(readFileSync(join(dataRoot, "projects", "skrybe", "project.json"), "utf8"));
    const ruleset = JSON.parse(readFileSync(join(dataRoot, "projects", "skrybe", "ruleset.json"), "utf8"));

    expect(result.project.project_id).toBe("skrybe");
    expect(result.project.root_path).toBe(workspaceRoot);
    expect(project.root_path).toBe(workspaceRoot);
    expect(ruleset.version).toBe(1);
    expect(ruleset.rules.length).toBeGreaterThan(5);
  });

  it("does not bump the ruleset version when bootstrapped twice without changes", async () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), "hivemind-workspace-"));
    const dataRoot = join(workspaceRoot, ".skrybe");
    roots.push(workspaceRoot);

    const first = await bootstrapHiveMindProject({ workspaceRoot, dataRoot });
    const second = await bootstrapHiveMindProject({ workspaceRoot, dataRoot });

    expect(first.ruleset.version).toBe(1);
    expect(second.ruleset.version).toBe(1);
    expect(second.project.root_path).toBe(workspaceRoot);
  });
});
