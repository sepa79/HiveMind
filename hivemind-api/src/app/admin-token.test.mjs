import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { adminAuthorizationMatches, readConfiguredAdminToken, resolveAdminToken } from "./admin-token.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("resolveAdminToken", () => {
  it("uses the environment token and reports ignored file tokens", async () => {
    const dataRoot = tempRoot();
    const tokenPath = join(dataRoot, "admin-token");
    writeFileSync(tokenPath, "file-token\n", "utf8");

    await expect(resolveAdminToken({ adminToken: "env-token", dataRoot })).resolves.toEqual({
      adminToken: "env-token",
      source: "environment",
      ignoredTokenPath: tokenPath
    });
  });

  it("generates and reuses a durable token file when no environment token is set", async () => {
    const dataRoot = tempRoot();
    const first = await resolveAdminToken({ dataRoot });
    const second = await resolveAdminToken({ dataRoot });

    expect(first.source).toBe("generated");
    expect(first.adminToken.length).toBeGreaterThan(20);
    expect(second).toEqual({
      adminToken: first.adminToken,
      source: "file",
      tokenPath: first.tokenPath
    });
    expect(readFileSync(first.tokenPath, "utf8")).toBe(`${first.adminToken}\n`);
  });

  it("fails explicitly when an existing token file is empty", async () => {
    const dataRoot = tempRoot();
    writeFileSync(join(dataRoot, "admin-token"), "\n", "utf8");

    await expect(resolveAdminToken({ dataRoot })).rejects.toThrow("admin token file is empty");
  });
});

describe("readConfiguredAdminToken", () => {
  it("normalizes an environment token through the canonical API helper", async () => {
    await expect(readConfiguredAdminToken({ adminToken: "  env-token\n" })).resolves.toBe("env-token");
  });

  it("rejects a whitespace-only environment token", async () => {
    await expect(readConfiguredAdminToken({ adminToken: "  \n" })).rejects.toThrow("HIVEMIND_ADMIN_TOKEN is empty");
  });

  it("reads an explicit token file", async () => {
    const dataRoot = tempRoot();
    const tokenPath = join(dataRoot, "configured-admin-token");
    writeFileSync(tokenPath, "file-token\n", "utf8");

    await expect(readConfiguredAdminToken({ adminTokenFile: tokenPath })).resolves.toBe("file-token");
  });

  it("fails explicitly when an explicit token file is empty", async () => {
    const dataRoot = tempRoot();
    const tokenPath = join(dataRoot, "configured-admin-token");
    writeFileSync(tokenPath, "\n", "utf8");

    await expect(readConfiguredAdminToken({ adminTokenFile: tokenPath })).rejects.toThrow("admin token file is empty");
  });

  it("fails explicitly when an explicit token file is missing", async () => {
    const tokenPath = join(tempRoot(), "missing-admin-token");

    await expect(readConfiguredAdminToken({ adminTokenFile: tokenPath })).rejects.toMatchObject({
      code: "ENOENT"
    });
  });

  it("rejects mutually exclusive token inputs", async () => {
    await expect(readConfiguredAdminToken({ adminToken: "env-token", adminTokenFile: "/tmp/token" })).rejects.toThrow(
      "HIVEMIND_ADMIN_TOKEN and HIVEMIND_ADMIN_TOKEN_FILE are mutually exclusive"
    );
  });
});

describe("adminAuthorizationMatches", () => {
  it("uses case-insensitive Bearer parsing and the same token normalization", () => {
    expect(adminAuthorizationMatches("Bearer   secret-token  ", " secret-token\n")).toBe(true);
    expect(adminAuthorizationMatches("bearer secret-token", "secret-token")).toBe(true);
    expect(adminAuthorizationMatches("BEARER secret-token", "secret-token")).toBe(true);
  });

  it("rejects missing, blank, and different bearer tokens", () => {
    expect(adminAuthorizationMatches(undefined, "secret-token")).toBe(false);
    expect(adminAuthorizationMatches("Bearer   ", "secret-token")).toBe(false);
    expect(adminAuthorizationMatches("Bearer other-token", "secret-token")).toBe(false);
  });
});

function tempRoot() {
  const root = mkdtempSync(join(tmpdir(), "hivemind-admin-token-"));
  roots.push(root);
  return root;
}
