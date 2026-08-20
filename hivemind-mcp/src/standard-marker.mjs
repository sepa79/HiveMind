import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export function compareStandardBundle(targetRoot, bundleFiles) {
  return bundleFiles.map((file) => compareStandardFile(targetRoot, file));
}

export function buildStandardMarker({ projectId, profileRef, catalogSourceUrl = null, bundleFiles, targetRoot, appliedAt = new Date().toISOString() }) {
  return {
    project_id: projectId,
    profile_ref: profileRef,
    catalog_source_url: catalogSourceUrl,
    applied_at: appliedAt,
    files: bundleFiles
      .map((file) => {
        const targetPath = join(targetRoot, file.target);
        if (!existsSync(targetPath)) {
          return null;
        }
        return {
          target: file.target,
          sha256: sha256(readFileSync(targetPath, "utf8"))
        };
      })
      .filter(Boolean)
  };
}

export function summarizeStandardActions(actions) {
  return {
    missing: actions.filter((file) => file.status === "missing").length,
    template_unmodified: actions.filter((file) => file.status === "template_unmodified").length,
    customized: actions.filter((file) => file.status === "customized").length,
    conflicting: actions.filter((file) => file.status === "customized" && file.action !== "overwritten").length,
    written: actions.filter((file) => ["created", "overwritten"].includes(file.action)).length
  };
}

export function writeTargetFile(targetRoot, relativePath, content) {
  const targetPath = join(targetRoot, relativePath);
  ensureInsideTarget(targetRoot, targetPath, relativePath);
  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(targetPath, content, "utf8");
}

function compareStandardFile(targetRoot, file) {
  const targetPath = join(targetRoot, file.target);
  if (!existsSync(targetPath)) {
    return {
      source: file.source,
      target: file.target,
      required: file.required,
      expected_sha256: file.sha256,
      actual_sha256: null,
      status: "missing",
      expected_content: file.content
    };
  }
  const content = readFileSync(targetPath, "utf8");
  const actualSha = sha256(content);
  return {
    source: file.source,
    target: file.target,
    required: file.required,
    expected_sha256: file.sha256,
    actual_sha256: actualSha,
    status: actualSha === file.sha256 ? "template_unmodified" : "customized",
    expected_content: file.content
  };
}

function ensureInsideTarget(targetRoot, targetPath, relativePath) {
  const resolvedRoot = resolve(targetRoot);
  const resolvedTarget = resolve(targetPath);
  if (resolvedTarget !== resolvedRoot && !resolvedTarget.startsWith(`${resolvedRoot}/`)) {
    throw new Error(`Refusing to write outside target: ${relativePath}`);
  }
}

function sha256(content) {
  return createHash("sha256").update(content).digest("hex");
}
