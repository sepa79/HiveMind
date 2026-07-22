import { readFileSync } from "node:fs";

export function parseBackendProfiles(env = process.env) {
  const globalAdminToken = credentialFromEnvOrFile(env, "HIVEMIND_ADMIN_TOKEN");
  if (env.HIVEMIND_BACKENDS?.trim()) {
    const parsed = parseBackendsJson(env.HIVEMIND_BACKENDS);
    const profiles = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed).map(([backend_id, profile]) => ({
          backend_id,
          ...profile
        }));
    return validateProfiles(profiles, env, globalAdminToken);
  }

  return [
    {
      backend_id: "default",
      api_base_url: (env.HIVEMIND_API_BASE_URL || "http://127.0.0.1:4010").replace(/\/$/, ""),
      ...(globalAdminToken ? { admin_token: globalAdminToken } : {})
    }
  ];
}

function parseBackendsJson(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`HIVEMIND_BACKENDS must be valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateProfiles(profiles, env, globalAdminToken) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error("HIVEMIND_BACKENDS must define at least one backend profile.");
  }

  const seen = new Set();
  return profiles.map((profile, index) => {
    const backendId = stringValue(profile.backend_id);
    const apiBaseUrl = stringValue(profile.api_base_url ?? profile.baseUrl ?? profile.base_url);
    const adminTokenEnv = stringValue(profile.admin_token_env ?? profile.adminTokenEnv);
    const adminToken =
      credentialValue(profile.admin_token ?? profile.adminToken, `HIVEMIND_BACKENDS[${index}].admin_token`) ??
      (adminTokenEnv
        ? credentialValue(env[adminTokenEnv], adminTokenEnv)
        : globalAdminToken);
    if (!backendId) {
      throw new Error(`HIVEMIND_BACKENDS[${index}] is missing backend_id.`);
    }
    if (!apiBaseUrl) {
      throw new Error(`HIVEMIND_BACKENDS[${index}] is missing api_base_url.`);
    }
    if (seen.has(backendId)) {
      throw new Error(`HIVEMIND_BACKENDS contains duplicate backend_id '${backendId}'.`);
    }
    seen.add(backendId);
    return {
      backend_id: backendId,
      api_base_url: apiBaseUrl.replace(/\/$/, ""),
      label: stringValue(profile.label) || backendId,
      ...(adminToken ? { admin_token: adminToken } : {}),
      ...(adminTokenEnv ? { admin_token_env: adminTokenEnv } : {})
    };
  });
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function credentialValue(value, label) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-blank string.`);
  }
  return value;
}

function credentialFromEnvOrFile(env, tokenName) {
  const token = credentialValue(env[tokenName], tokenName);
  const tokenFile = stringValue(env[`${tokenName}_FILE`]);
  if (token && tokenFile) {
    throw new Error(`${tokenName} and ${tokenName}_FILE are mutually exclusive.`);
  }
  if (!tokenFile) {
    return token;
  }
  return credentialValue(readFileSync(tokenFile, "utf8"), `${tokenName}_FILE`);
}
