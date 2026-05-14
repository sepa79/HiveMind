import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RulesetCatalogManifestSchema } from "../domain/schemas.mjs";
import { ApiError, ensure } from "./errors.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_RULESET_CATALOG_PATH = resolve(__dirname, "..", "..", "..", "ai-rulesets");
export const SUPPORTED_TEMPLATE_VARIABLES = new Set([
  "PROJECT_NAME",
  "PROJECT_ID",
  "PROFILE_REF",
  "HIVEMIND_API_URL"
]);

export class RulesetCatalog {
  constructor({ catalogPath = DEFAULT_RULESET_CATALOG_PATH, catalogSourceUrl = null, hivemindApiUrl = "" } = {}) {
    this.catalogPath = resolve(catalogPath);
    this.catalogSourceUrl = catalogSourceUrl || null;
    this.hivemindApiUrl = hivemindApiUrl || "";
  }

  listProfiles() {
    ensure(existsSync(this.catalogPath), 404, "RULESET_CATALOG_NOT_FOUND", "Ruleset catalog path does not exist.", {
      catalog_path: this.catalogPath
    });

    const profiles = [];
    for (const profileId of readdirSync(this.catalogPath, { withFileTypes: true })) {
      if (!profileId.isDirectory()) {
        continue;
      }
      const profileDir = join(this.catalogPath, profileId.name);
      for (const version of readdirSync(profileDir, { withFileTypes: true })) {
        if (!version.isDirectory()) {
          continue;
        }
        profiles.push(this.#summary(this.getProfile(profileId.name, version.name).manifest));
      }
    }

    return {
      catalog_path: this.catalogPath,
      catalog_source_url: this.catalogSourceUrl,
      profiles: profiles.sort((left, right) => left.profile_ref.localeCompare(right.profile_ref))
    };
  }

  getByRef(profileRef) {
    const { profileId, version } = parseProfileRef(profileRef);
    return this.getProfile(profileId, version);
  }

  getProfile(profileId, version) {
    const manifest = this.#readManifest(profileId, version);
    return {
      catalog_path: this.catalogPath,
      catalog_source_url: this.catalogSourceUrl,
      manifest
    };
  }

  getBundle(profileId, version, variables = {}) {
    const profile = this.getProfile(profileId, version);
    const filesRoot = join(this.catalogPath, profileId, version, "files");
    const renderVariables = this.#buildVariables(profile.manifest, variables);
    const files = profile.manifest.files.map((file) => {
      assertSafeRelativePath(file.source, "source");
      assertSafeRelativePath(file.target, "target");
      const sourcePath = resolve(filesRoot, file.source);
      ensure(
        sourcePath.startsWith(resolve(filesRoot)),
        400,
        "RULESET_FILE_OUTSIDE_PROFILE",
        `Ruleset file '${file.source}' escapes its profile directory.`,
        { source: file.source }
      );
      ensure(existsSync(sourcePath), 400, "RULESET_FILE_NOT_FOUND", `Ruleset file '${file.source}' does not exist.`, {
        source: file.source,
        profile_ref: profile.manifest.profile_ref
      });
      const content = renderTemplate(readFileSync(sourcePath, "utf8"), renderVariables, file.source);
      return {
        source: file.source,
        target: file.target,
        required: file.required,
        content,
        sha256: sha256(content)
      };
    });

    return {
      ...profile,
      files
    };
  }

  #readManifest(profileId, version) {
    assertSafeRelativePath(profileId, "profile_id");
    assertSafeRelativePath(version, "version");
    const manifestPath = join(this.catalogPath, profileId, version, "manifest.json");
    ensure(existsSync(manifestPath), 404, "RULESET_PROFILE_NOT_FOUND", `No ruleset profile '${profileId}@${version}' exists.`, {
      profile_id: profileId,
      version
    });
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (error) {
      throw new ApiError(400, "RULESET_MANIFEST_INVALID_JSON", `Manifest for '${profileId}@${version}' is invalid JSON.`, {
        profile_id: profileId,
        version,
        message: error instanceof Error ? error.message : String(error)
      });
    }
    const result = RulesetCatalogManifestSchema.safeParse(parsed);
    if (!result.success) {
      throw new ApiError(400, "RULESET_MANIFEST_INVALID", `Manifest for '${profileId}@${version}' is invalid.`, {
        profile_id: profileId,
        version,
        issues: result.error.issues
      });
    }
    ensure(
      result.data.profile_id === profileId && result.data.version === version && result.data.profile_ref === `${profileId}@${version}`,
      400,
      "RULESET_MANIFEST_REF_MISMATCH",
      `Manifest identity does not match path '${profileId}@${version}'.`,
      { profile_id: profileId, version, profile_ref: result.data.profile_ref }
    );
    for (const variable of result.data.template_variables) {
      ensure(
        SUPPORTED_TEMPLATE_VARIABLES.has(variable),
        400,
        "RULESET_TEMPLATE_VARIABLE_UNSUPPORTED",
        `Unsupported template variable '${variable}'.`,
        { variable, supported: [...SUPPORTED_TEMPLATE_VARIABLES] }
      );
    }
    for (const file of result.data.files) {
      assertSafeRelativePath(file.source, "source");
      assertSafeRelativePath(file.target, "target");
    }
    return result.data;
  }

  #summary(manifest) {
    return {
      profile_id: manifest.profile_id,
      version: manifest.version,
      profile_ref: manifest.profile_ref,
      label: manifest.label,
      description: manifest.description,
      extends: manifest.extends,
      file_count: manifest.files.length,
      rule_count: manifest.rules.length
    };
  }

  #buildVariables(manifest, variables) {
    return {
      PROJECT_NAME: variables.PROJECT_NAME ?? variables.project_name ?? "",
      PROJECT_ID: variables.PROJECT_ID ?? variables.project_id ?? "",
      PROFILE_REF: variables.PROFILE_REF ?? manifest.profile_ref,
      HIVEMIND_API_URL: variables.HIVEMIND_API_URL ?? variables.hivemind_api_url ?? this.hivemindApiUrl
    };
  }
}

export function parseProfileRef(profileRef) {
  const match = /^([^@]+)@([^@]+)$/.exec(profileRef);
  if (!match) {
    throw new ApiError(400, "STANDARD_PROFILE_REF_INVALID", "Profile refs must use the format 'profile@version'.", {
      profile_ref: profileRef
    });
  }
  return { profileId: match[1], version: match[2] };
}

export function renderTemplate(content, variables, source = "template") {
  return content.replace(/{{\s*([A-Z0-9_]+)\s*}}/g, (match, name) => {
    if (!SUPPORTED_TEMPLATE_VARIABLES.has(name)) {
      throw new ApiError(400, "RULESET_TEMPLATE_VARIABLE_UNSUPPORTED", `Unsupported template variable '${name}'.`, {
        source,
        variable: name,
        supported: [...SUPPORTED_TEMPLATE_VARIABLES]
      });
    }
    return variables[name] ?? "";
  });
}

export function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}

function assertSafeRelativePath(value, field) {
  ensure(typeof value === "string" && value.trim().length > 0, 400, "RULESET_PATH_INVALID", `${field} must be a non-empty path.`, {
    [field]: value
  });
  ensure(
    !value.startsWith("/") && !value.includes("\\") && !value.split("/").includes(".."),
    400,
    "RULESET_PATH_INVALID",
    `${field} must be a safe relative POSIX path.`,
    { [field]: value }
  );
}
