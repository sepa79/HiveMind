import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authenticateMcpAdminAuthorization,
  protectAdminTool,
  resolveMcpAdminToken
} from "./admin-auth.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("HTTP MCP admin authorization", () => {
  it("treats a missing or Compose-empty admin token as unconfigured", () => {
    expect(resolveMcpAdminToken({})).toBeNull();
    expect(resolveMcpAdminToken({ HIVEMIND_MCP_ADMIN_TOKEN: "" })).toBeNull();
  });

  it("normalizes a configured admin token and rejects whitespace-only values", () => {
    expect(resolveMcpAdminToken({ HIVEMIND_MCP_ADMIN_TOKEN: "  admin-secret\n" })).toBe("admin-secret");
    expect(() => resolveMcpAdminToken({ HIVEMIND_MCP_ADMIN_TOKEN: "  \n" })).toThrow(
      "HIVEMIND_MCP_ADMIN_TOKEN must not contain only whitespace."
    );
  });

  it("reads the incoming MCP admin token from a configured secret file", () => {
    const tokenFile = tempTokenFile("  admin-secret\n");

    expect(resolveMcpAdminToken({ HIVEMIND_MCP_ADMIN_TOKEN_FILE: tokenFile })).toBe("admin-secret");
  });

  it("rejects simultaneous incoming MCP admin token and token file configuration", () => {
    expect(() =>
      resolveMcpAdminToken({
        HIVEMIND_MCP_ADMIN_TOKEN: "admin-secret",
        HIVEMIND_MCP_ADMIN_TOKEN_FILE: "/run/secrets/admin-token"
      })
    ).toThrow("HIVEMIND_MCP_ADMIN_TOKEN and HIVEMIND_MCP_ADMIN_TOKEN_FILE are mutually exclusive");
  });

  it("creates admin auth info only for the matching bearer token", () => {
    expect(authenticateMcpAdminAuthorization("Bearer admin-secret", "admin-secret")).toMatchObject({
      clientId: "hivemind-mcp-admin",
      scopes: ["admin"]
    });
    expect(authenticateMcpAdminAuthorization("Bearer wrong-secret", "admin-secret")).toBeNull();
    expect(authenticateMcpAdminAuthorization(undefined, "admin-secret")).toBeNull();
    expect(authenticateMcpAdminAuthorization("Basic admin-secret", "admin-secret")).toBeNull();
  });

  it("blocks protected tools without admin scope", async () => {
    const handler = vi.fn();
    const protectedTool = protectAdminTool(handler);

    const result = await protectedTool({ project_id: "buzz" }, {});

    expect(handler).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      isError: true,
      structuredContent: {
        error: {
          code: "UNAUTHORIZED",
          details: { required_scope: "admin" }
        }
      }
    });
  });

  it("allows protected tools with admin scope and trusted stdio tools", async () => {
    const handler = vi.fn(async (input) => ({ structuredContent: input }));
    const protectedTool = protectAdminTool(handler);
    const stdioTool = protectAdminTool(handler, { authorizationRequired: false });

    await expect(
      protectedTool({ project_id: "buzz" }, { authInfo: { scopes: ["admin"] } })
    ).resolves.toEqual({ structuredContent: { project_id: "buzz" } });
    await expect(stdioTool({ project_id: "buzz" }, {})).resolves.toEqual({
      structuredContent: { project_id: "buzz" }
    });
    expect(handler).toHaveBeenCalledTimes(2);
  });
});

function tempTokenFile(contents) {
  const root = mkdtempSync(join(tmpdir(), "hivemind-mcp-admin-token-"));
  roots.push(root);
  const tokenFile = join(root, "token");
  writeFileSync(tokenFile, contents, "utf8");
  return tokenFile;
}
