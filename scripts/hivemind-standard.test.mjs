import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_RULESET_CATALOG_PATH } from "../hivemind-api/src/app/ruleset-catalog.mjs";
import { applyStandard, parseCli } from "./hivemind-standard.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("hivemind standard CLI", () => {
  it("upgrades to v4 without replacing customized authorities and is repeatable", () => {
    const target = tempDir();
    applyStandard(config(), { projectId: "buzz", profileRef: "base@v3", target, projectName: "Buzz", write: true });
    const custom = "# Buzz project authority\nKeep the project-specific deployment rules.\n";
    writeFileSync(join(target, "AGENTS.md"), custom);
    // A missing target may be created only after the adopting maintainer checks
    // that no equivalent authority exists elsewhere; this fixture has none.
    rmSync(join(target, "docs/ai/TASK_TEMPLATE.md"));
    const options = { projectId: "buzz", profileRef: "base@v4", target, projectName: "Buzz" };
    const dry = applyStandard(config(), options);
    expect(dry.files.every(file => file.action === "dry_run")).toBe(true);
    expect(existsSync(join(target, "docs/ai/TASK_TEMPLATE.md"))).toBe(false);
    expect(readFileSync(join(target, "AGENTS.md"), "utf8")).toBe(custom);
    const applied = applyStandard(config(), { ...options, write: true, conflict: "skip" });
    expect(applied.files.find(file => file.target === "AGENTS.md").action).toBe("skipped");
    expect(readFileSync(join(target, "AGENTS.md"), "utf8")).toBe(custom);
    expect(readFileSync(join(target, "docs/ai/TASK_TEMPLATE.md"), "utf8")).toContain("Documentation before implementation");
    const repeated = applyStandard(config(), { ...options, write: true, conflict: "skip" });
    expect(repeated.files.every(file => ["skipped", "unchanged"].includes(file.action))).toBe(true);
    expect(existsSync(join(target, ".hivemind-standard.json"))).toBe(false);
  });

  it("parses apply options without a subcommand", () => {
    expect(parseCli(["apply", "--project", "buzz", "--profile", "aws-microservice@v3"])).toEqual({
      command: "apply",
      subcommand: null,
      options: {
        project: "buzz",
        profile: "aws-microservice@v3"
      }
    });
  });

  it("dry-run reports missing files and writes nothing", () => {
    const target = tempDir();

    const result = applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v3",
      target,
      projectName: "Buzz"
    });

    expect(result.summary.missing).toBeGreaterThan(0);
    expect(existsSync(join(target, "AGENTS.md"))).toBe(false);
    expect(existsSync(join(target, ".hivemind-standard.json"))).toBe(false);
  });

  it("write mode creates missing files without a local marker artifact", () => {
    const target = tempDir();

    const result = applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v3",
      target,
      projectName: "Buzz",
      write: true
    });

    expect(result.summary.written).toBeGreaterThan(0);
    expect(readFileSync(join(target, "AGENTS.md"), "utf8")).toContain("Buzz");
    expect(existsSync(join(target, ".hivemind-standard.json"))).toBe(false);
  });

  it("skips changed files unless overwrite is requested", () => {
    const target = tempDir();
    applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v3",
      target,
      projectName: "Buzz",
      write: true
    });
    writeFileSync(join(target, "AGENTS.md"), "# Custom\n", "utf8");

    const skipped = applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v3",
      target,
      projectName: "Buzz",
      write: true
    });
    expect(skipped.files.find((file) => file.target === "AGENTS.md").action).toBe("skipped");
    expect(readFileSync(join(target, "AGENTS.md"), "utf8")).toBe("# Custom\n");

    const overwritten = applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v3",
      target,
      projectName: "Buzz",
      write: true,
      conflict: "overwrite"
    });
    expect(overwritten.files.find((file) => file.target === "AGENTS.md").action).toBe("overwritten");
    expect(readFileSync(join(target, "AGENTS.md"), "utf8")).toContain("Buzz");
  });
});

function config() {
  return {
    apiBaseUrl: "http://hivemind.test",
    catalogPath: DEFAULT_RULESET_CATALOG_PATH,
    catalogSourceUrl: "https://git.example/ai-rulesets"
  };
}

function tempDir() {
  const root = mkdtempSync(join(tmpdir(), "hivemind-standard-"));
  roots.push(root);
  return root;
}
