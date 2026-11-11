import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DEFAULT_RULESET_CATALOG_PATH, RulesetCatalog } from "./ruleset-catalog.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("RulesetCatalog", () => {
  it("lists versioned base and AWS microservice profiles", () => {
    const catalog = new RulesetCatalog({ catalogPath: DEFAULT_RULESET_CATALOG_PATH });

    const result = catalog.listProfiles();

    expect(result.profiles.map((profile) => profile.profile_ref)).toEqual([
      "aws-microservice@v2",
      "aws-microservice@v3",
      "base@v1",
      "base@v2",
      "base@v3",
      "base@v4"
    ]);
  });

  it("serves base v2 with repository-wide authority guidance", () => {
    const catalog = new RulesetCatalog({ catalogPath: DEFAULT_RULESET_CATALOG_PATH });

    const bundle = catalog.getBundle("base", "v2", { project_name: "Example", project_id: "example" });

    expect(bundle.manifest.profile_ref).toBe("base@v2");
    expect(bundle.manifest.rules.find((rule) => rule.rule_id === "ssot_contracts")?.description).toContain(
      "one authoritative owner"
    );
    expect(bundle.files.find((file) => file.target === "AGENTS.md")?.content).toContain(
      "SSOT for contracts, state, configuration, and behavior"
    );
    expect(bundle.files.find((file) => file.target === "docs/ai/STANDARD_PROFILE_UPGRADE.md")?.content).toContain(
      "Do not start with `--write` or `--conflict overwrite`"
    );
  });

  it("serves v4 documentation-first guidance while retaining v3 protections", () => {
    const catalog = new RulesetCatalog();
    const previous = catalog.getByRef("base@v3").manifest;
    const bundle = catalog.getBundle("base", "v4", { project_name: "Example", project_id: "example" });
    expect(bundle.manifest.profile_ref).toBe("base@v4");
    expect(bundle.manifest.rules).toEqual(expect.arrayContaining(previous.rules));
    expect(bundle.manifest.files).toEqual(previous.files);
    expect(bundle.manifest.rules.find(rule => rule.rule_id === "documentation_before_implementation")).toMatchObject({
      severity: "required", check_mode: "file_reference_required"
    });
    expect(previous.rules.some(rule => rule.rule_id === "documentation_before_implementation")).toBe(false);

    const content = target => bundle.files.find(file => file.target === target).content;
    expect(content("AGENTS.md")).toContain("AGENTS.md — Example");
    expect(content("docs/ai/STANDARD_PROFILE_UPGRADE.md")).toContain("base@v4");
    for (const target of ["AGENTS.md", "docs/ai/REVIEW_CHECKS.md", "docs/ai/HIVEMIND_RULES.md", "docs/ai/TASK_TEMPLATE.md"]) {
      const text = content(target).toLowerCase();
      expect(text, target).toContain("documentation before implementation");
      for (const requirement of ["read-only investigation", "responsibility owners", "expected behavior", "acceptance criteria", "if the plan changes", "before further implementation or test edits", "deployment or acceptance"]) {
        expect(text, `${target}: ${requirement}`).toContain(requirement);
      }
    }
    for (const file of bundle.files) {
      expect(file.content, file.target).not.toMatch(/before or with implementation|docs in the same change|{{[A-Z_]+}}/);
    }
    const upgrade = content("docs/ai/STANDARD_PROFILE_UPGRADE.md");
    expect(upgrade).toContain("Profile assignment alone does not import manifest rules");
    expect(upgrade).toContain("Preserve unrelated custom rules");
    expect(upgrade).toContain("`--conflict skip` alone does not add new requirements");
  });

  it("resolves an externally configured catalog path", () => {
    const catalogPath = mkCatalogRoot();
    writeManifest(catalogPath, "custom", "v1", {
      profile_id: "custom",
      version: "v1",
      profile_ref: "custom@v1",
      label: "Custom",
      description: "Custom catalog",
      template_variables: ["PROJECT_NAME"],
      files: [{ source: "AGENTS.md", target: "AGENTS.md", required: true }],
      rules: []
    });
    writeFileSync(join(catalogPath, "custom", "v1", "files", "AGENTS.md"), "# {{PROJECT_NAME}}\n", "utf8");

    const catalog = new RulesetCatalog({ catalogPath });

    expect(catalog.listProfiles().profiles[0].profile_ref).toBe("custom@v1");
  });

  it("rejects invalid manifests", () => {
    const catalogPath = mkCatalogRoot();
    writeManifest(catalogPath, "broken", "v1", { profile_id: "broken" });
    const catalog = new RulesetCatalog({ catalogPath });

    expect(() => catalog.listProfiles()).toThrow("Manifest for 'broken@v1' is invalid.");
  });

  it("rejects unknown template placeholders", () => {
    const catalogPath = mkCatalogRoot();
    writeManifest(catalogPath, "broken", "v1", {
      profile_id: "broken",
      version: "v1",
      profile_ref: "broken@v1",
      label: "Broken",
      description: "Broken catalog",
      template_variables: ["PROJECT_NAME"],
      files: [{ source: "AGENTS.md", target: "AGENTS.md", required: true }],
      rules: []
    });
    writeFileSync(join(catalogPath, "broken", "v1", "files", "AGENTS.md"), "# {{UNKNOWN}}\n", "utf8");
    const catalog = new RulesetCatalog({ catalogPath });

    expect(() => catalog.getBundle("broken", "v1", { project_name: "Broken" })).toThrow(
      "Unsupported template variable 'UNKNOWN'."
    );
  });
});

function mkCatalogRoot() {
  const root = join(tmpdir(), `ruleset-catalog-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  roots.push(root);
  return root;
}

function writeManifest(catalogPath, profileId, version, manifest) {
  const profilePath = join(catalogPath, profileId, version);
  mkdirSync(join(profilePath, "files"), { recursive: true });
  writeFileSync(join(profilePath, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}
