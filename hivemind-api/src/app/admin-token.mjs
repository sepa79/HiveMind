import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function resolveAdminToken({ adminToken, dataRoot }) {
  const normalizedAdminToken = normalizeAdminToken(adminToken, {
    emptyStringIsUnset: true,
    emptyMessage: "HIVEMIND_ADMIN_TOKEN is empty."
  });
  if (normalizedAdminToken) {
    return {
      adminToken: normalizedAdminToken,
      source: "environment",
      ...(dataRoot ? await ignoredDataRootToken(dataRoot) : {})
    };
  }

  if (!dataRoot) {
    throw new Error("HIVEMIND_ADMIN_TOKEN is required when HIVEMIND_DATA_ROOT is unavailable.");
  }

  const tokenPath = join(dataRoot, "admin-token");
  const existingToken = await readTokenFile(tokenPath);
  if (existingToken) {
    return {
      adminToken: existingToken,
      source: "file",
      tokenPath
    };
  }

  const generatedToken = randomBytes(32).toString("base64url");
  await mkdir(dirname(tokenPath), { recursive: true });
  await writeFile(tokenPath, `${generatedToken}\n`, { encoding: "utf8", flag: "wx", mode: 0o600 }).catch(async (error) => {
    if (isNodeError(error, "EEXIST")) {
      return;
    }
    throw error;
  });

  return {
    adminToken: (await readTokenFile(tokenPath)) ?? generatedToken,
    source: "generated",
    tokenPath
  };
}

export async function readConfiguredAdminToken({ adminToken, adminTokenFile, tokenName = "HIVEMIND_ADMIN_TOKEN" } = {}) {
  const normalizedAdminToken = normalizeAdminToken(adminToken, {
    emptyStringIsUnset: true,
    emptyMessage: `${tokenName} is empty.`
  });
  if (normalizedAdminToken && adminTokenFile) {
    throw new Error(`${tokenName} and ${tokenName}_FILE are mutually exclusive.`);
  }
  if (normalizedAdminToken) {
    return normalizedAdminToken;
  }
  if (adminTokenFile) {
    return readTokenFile(adminTokenFile, { missingOk: false });
  }
  return undefined;
}

export function adminAuthorizationMatches(authorization, adminToken) {
  if (typeof authorization !== "string") {
    return false;
  }
  const match = authorization.match(/^Bearer\s+(.+?)\s*$/i);
  if (!match) {
    return false;
  }
  let expected;
  let presented;
  try {
    expected = normalizeAdminToken(adminToken, { emptyMessage: "Configured HiveMind admin token is empty." });
    presented = normalizeAdminToken(match[1], {
      emptyMessage: "Presented HiveMind admin token is empty."
    });
  } catch {
    return false;
  }
  if (!expected || !presented) {
    return false;
  }
  const expectedBytes = Buffer.from(expected);
  const presentedBytes = Buffer.from(presented);
  return expectedBytes.length === presentedBytes.length && timingSafeEqual(expectedBytes, presentedBytes);
}

export function normalizeAdminToken(
  value,
  { allowEmpty = false, emptyStringIsUnset = false, emptyMessage = "HiveMind admin token is empty." } = {}
) {
  if (value === undefined || value === null || (value === "" && emptyStringIsUnset)) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error("HiveMind admin token must be a string.");
  }
  const normalized = value.trim();
  if (!normalized) {
    if (allowEmpty) {
      return undefined;
    }
    throw new Error(emptyMessage);
  }
  return normalized;
}

async function ignoredDataRootToken(dataRoot) {
  const tokenPath = join(dataRoot, "admin-token");
  return (await readTokenFile(tokenPath, { allowEmpty: true })) ? { ignoredTokenPath: tokenPath } : {};
}

async function readTokenFile(tokenPath, { allowEmpty = false, missingOk = true } = {}) {
  const token = await readFile(tokenPath, "utf8").catch((error) => {
    if (isNodeError(error, "ENOENT") && missingOk) {
      return undefined;
    }
    throw error;
  });
  if (token === undefined) {
    return undefined;
  }
  return normalizeAdminToken(token, {
    allowEmpty,
    emptyMessage: `HiveMind admin token file is empty: ${tokenPath}`
  });
}

function isNodeError(error, code) {
  return error instanceof Error && "code" in error && error.code === code;
}
