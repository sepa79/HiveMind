export function parseBackendProfiles(env = process.env) {
  if (env.HIVEMIND_BACKENDS?.trim()) {
    const parsed = parseBackendsJson(env.HIVEMIND_BACKENDS);
    const profiles = Array.isArray(parsed)
      ? parsed
      : Object.entries(parsed).map(([backend_id, profile]) => ({
          backend_id,
          ...profile
        }));
    return validateProfiles(profiles);
  }

  return [
    {
      backend_id: "default",
      api_base_url: (env.HIVEMIND_API_BASE_URL || "http://127.0.0.1:4010").replace(/\/$/, "")
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

function validateProfiles(profiles) {
  if (!Array.isArray(profiles) || profiles.length === 0) {
    throw new Error("HIVEMIND_BACKENDS must define at least one backend profile.");
  }

  const seen = new Set();
  return profiles.map((profile, index) => {
    const backendId = stringValue(profile.backend_id);
    const apiBaseUrl = stringValue(profile.api_base_url ?? profile.baseUrl ?? profile.base_url);
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
      label: stringValue(profile.label) || backendId
    };
  });
}

function stringValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
