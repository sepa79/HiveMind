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
  it("lists the bundled base and AWS microservice profiles", () => {
    const catalog = new RulesetCatalog({ catalogPath: DEFAULT_RULESET_CATALOG_PATH });

    const result = catalog.listProfiles();

    expect(result.profiles.map((profile) => profile.profile_ref)).toEqual(["aws-microservice@v2", "base@v1"]);
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
