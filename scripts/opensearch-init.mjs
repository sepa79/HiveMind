import { fileURLToPath } from "node:url";

const DEFAULT_ENDPOINT = "https://opensearch:9200";
const DEFAULT_INDEX_PREFIX = "hivemind";
const DEFAULT_ATTEMPTS = 60;
const DEFAULT_DELAY_MS = 2000;
const ROLE_NAME = "hivemind_api";

export function requiredEnv(env, name) {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function basicAuth(username, password) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

export function buildProvisioningRequests({ username, password, indexPrefix = DEFAULT_INDEX_PREFIX }) {
  return [
    {
      path: `/_plugins/_security/api/roles/${ROLE_NAME}`,
      body: {
        cluster_permissions: [],
        index_permissions: [
          {
            index_patterns: [`${indexPrefix}-*`],
            allowed_actions: ["indices:admin/*", "indices:data/*"]
          }
        ],
        tenant_permissions: []
      }
    },
    {
      path: `/_plugins/_security/api/internalusers/${encodeURIComponent(username)}`,
      body: {
        password,
        backend_roles: [ROLE_NAME],
        attributes: {}
      }
    },
    {
      path: `/_plugins/_security/api/rolesmapping/${ROLE_NAME}`,
      body: {
        backend_roles: [ROLE_NAME],
        users: [username],
        hosts: []
      }
    }
  ];
}

export async function waitForOpenSearch({
  endpoint,
  authorization,
  fetchImpl = fetch,
  attempts = DEFAULT_ATTEMPTS,
  delayMs = DEFAULT_DELAY_MS,
  sleep = defaultSleep
}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(`${endpoint}/_cluster/health`, {
        headers: { authorization }
      });
      if (response.ok) {
        return;
      }
      if (attempt === attempts) {
        throw new Error(`OpenSearch health failed with HTTP ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
    }
    await sleep(delayMs);
  }
}

export async function putJson({ endpoint, authorization, path, body, fetchImpl = fetch }) {
  const response = await fetchImpl(endpoint + path, {
    method: "PUT",
    headers: {
      authorization,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`${path} failed with HTTP ${response.status}: ${responseText}`);
  }
  return responseText;
}

export async function provisionOpenSearch({
  env = process.env,
  fetchImpl = fetch,
  logger = console,
  sleep = defaultSleep
} = {}) {
  const endpoint = env.HIVEMIND_OPENSEARCH_ADMIN_NODE || env.HIVEMIND_OPENSEARCH_NODE || DEFAULT_ENDPOINT;
  const adminPassword = requiredEnv(env, "OPENSEARCH_INITIAL_ADMIN_PASSWORD");
  const username = requiredEnv(env, "HIVEMIND_OPENSEARCH_USERNAME");
  const password = requiredEnv(env, "HIVEMIND_OPENSEARCH_PASSWORD");
  const indexPrefix = env.HIVEMIND_OPENSEARCH_INDEX_PREFIX || DEFAULT_INDEX_PREFIX;
  const authorization = basicAuth("admin", adminPassword);

  await waitForOpenSearch({ endpoint, authorization, fetchImpl, sleep });

  for (const request of buildProvisioningRequests({ username, password, indexPrefix })) {
    logger.log(await putJson({ endpoint, authorization, fetchImpl, ...request }));
  }
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  provisionOpenSearch().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
