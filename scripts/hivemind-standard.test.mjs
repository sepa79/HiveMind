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
  it("parses apply options without a subcommand", () => {
    expect(parseCli(["apply", "--project", "buzz", "--profile", "aws-microservice@v2"])).toEqual({
      command: "apply",
      subcommand: null,
      options: {
        project: "buzz",
        profile: "aws-microservice@v2"
      }
    });
  });

  it("dry-run reports missing files and writes nothing", () => {
    const target = tempDir();

    const result = applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v2",
      target,
      projectName: "Buzz"
    });

    expect(result.summary.missing).toBeGreaterThan(0);
    expect(existsSync(join(target, "AGENTS.md"))).toBe(false);
    expect(existsSync(join(target, ".hivemind-standard.json"))).toBe(false);
  });

  it("write mode creates missing files and a marker", () => {
    const target = tempDir();

    const result = applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v2",
      target,
      projectName: "Buzz",
      write: true
    });

    expect(result.summary.written).toBeGreaterThan(0);
    expect(readFileSync(join(target, "AGENTS.md"), "utf8")).toContain("Buzz");
    const marker = JSON.parse(readFileSync(join(target, ".hivemind-standard.json"), "utf8"));
    expect(marker.profile_ref).toBe("aws-microservice@v2");
    expect(marker.files.some((file) => file.target === "AGENTS.md")).toBe(true);
  });

  it("skips changed files unless overwrite is requested", () => {
    const target = tempDir();
    applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v2",
      target,
      projectName: "Buzz",
      write: true
    });
    writeFileSync(join(target, "AGENTS.md"), "# Custom\n", "utf8");

    const skipped = applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v2",
      target,
      projectName: "Buzz",
      write: true
    });
    expect(skipped.files.find((file) => file.target === "AGENTS.md").action).toBe("skipped");
    expect(readFileSync(join(target, "AGENTS.md"), "utf8")).toBe("# Custom\n");

    const overwritten = applyStandard(config(), {
      projectId: "buzz",
      profileRef: "aws-microservice@v2",
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
