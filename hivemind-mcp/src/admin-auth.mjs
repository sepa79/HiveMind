import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

const ADMIN_SCOPE = "admin";

export function resolveMcpAdminToken(env = process.env) {
  const configured = env.HIVEMIND_MCP_ADMIN_TOKEN;
  const tokenFile = normalizeTokenFile(env.HIVEMIND_MCP_ADMIN_TOKEN_FILE);
  if (configured !== undefined && configured !== "" && tokenFile) {
    throw new Error("HIVEMIND_MCP_ADMIN_TOKEN and HIVEMIND_MCP_ADMIN_TOKEN_FILE are mutually exclusive.");
  }
  if ((configured === undefined || configured === "") && !tokenFile) {
    return null;
  }
  const normalized = (tokenFile ? readFileSync(tokenFile, "utf8") : configured).trim();
  if (!normalized) {
    throw new Error(`${tokenFile ? "HIVEMIND_MCP_ADMIN_TOKEN_FILE" : "HIVEMIND_MCP_ADMIN_TOKEN"} must not contain only whitespace.`);
  }
  return normalized;
}

export function authenticateMcpAdminAuthorization(authorization, configuredToken) {
  if (!configuredToken || typeof authorization !== "string") {
    return null;
  }
  const match = authorization.match(/^Bearer\s+(.+?)\s*$/i);
  if (!match || !tokensMatch(match[1], configuredToken)) {
    return null;
  }
  return {
    token: configuredToken,
    clientId: "hivemind-mcp-admin",
    scopes: [ADMIN_SCOPE]
  };
}

export function protectAdminTool(handler, { authorizationRequired = true } = {}) {
  return async (input, extra = {}) => {
    if (authorizationRequired && !extra.authInfo?.scopes?.includes(ADMIN_SCOPE)) {
      return adminUnauthorizedResult();
    }
    return handler(input, extra);
  };
}

function tokensMatch(receivedToken, configuredToken) {
  const receivedDigest = createHash("sha256").update(receivedToken).digest();
  const configuredDigest = createHash("sha256").update(configuredToken).digest();
  return timingSafeEqual(receivedDigest, configuredDigest);
}

function adminUnauthorizedResult() {
  const payload = {
    error: {
      code: "UNAUTHORIZED",
      message: "This MCP tool requires admin authorization.",
      details: {
        required_scope: ADMIN_SCOPE
      }
    },
    meta: {}
  };
  return {
    isError: true,
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload
  };
}

function normalizeTokenFile(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("HIVEMIND_MCP_ADMIN_TOKEN_FILE must be a non-blank path.");
  }
  return value.trim();
}
