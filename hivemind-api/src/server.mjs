#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { serve } from "@hono/node-server";
import { HiveMindService } from "./app/service.mjs";
import { createApp } from "./http/app.mjs";
import { FsJsonlStorage } from "./storage/fs-jsonl-storage.mjs";
import { OpenSearchStorage } from "./storage/opensearch-storage.mjs";

const port = Number(process.env.HIVEMIND_API_PORT || "4010");
const dataRoot = process.env.HIVEMIND_DATA_ROOT || `${process.cwd()}/.hivemind`;
const storageBackend = process.env.HIVEMIND_STORAGE_BACKEND || "fs-jsonl";

const storage = createStorage({ storageBackend, dataRoot });
if (typeof storage.initialize === "function") {
  await storage.initialize();
}

const service = new HiveMindService({
  storage,
  dataRoot: storageBackend === "fs-jsonl" ? dataRoot : null
});
const app = createApp({ service });

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`HiveMind API listening on http://127.0.0.1:${info.port} using ${storageBackend}`);
  }
);

function createStorage({ storageBackend, dataRoot }) {
  if (storageBackend === "fs-jsonl") {
    return new FsJsonlStorage({ dataRoot });
  }

  if (storageBackend === "opensearch") {
    const node = requiredEnv("HIVEMIND_OPENSEARCH_NODE");
    return new OpenSearchStorage({
      node,
      indexPrefix: process.env.HIVEMIND_OPENSEARCH_INDEX_PREFIX || "hivemind",
      auth: {
        username: requiredEnv("HIVEMIND_OPENSEARCH_USERNAME"),
        password: requiredEnv("HIVEMIND_OPENSEARCH_PASSWORD")
      },
      ssl: openSearchSslConfig(node)
    });
  }

  throw new Error(`Unsupported HIVEMIND_STORAGE_BACKEND '${storageBackend}'. Use 'fs-jsonl' or 'opensearch'.`);
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function openSearchSslConfig(node) {
  const caFile = process.env.HIVEMIND_OPENSEARCH_TLS_CA_FILE;
  const rejectUnauthorizedEnv = process.env.HIVEMIND_OPENSEARCH_TLS_REJECT_UNAUTHORIZED;

  if (!node.startsWith("https://")) {
    if (caFile || rejectUnauthorizedEnv !== undefined) {
      throw new Error("OpenSearch TLS settings require HIVEMIND_OPENSEARCH_NODE to use https://.");
    }
    return null;
  }

  return {
    rejectUnauthorized: parseBooleanEnv("HIVEMIND_OPENSEARCH_TLS_REJECT_UNAUTHORIZED", true),
    ...(caFile ? { ca: readFileSync(caFile) } : {})
  };
}

function parseBooleanEnv(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined) {
    return defaultValue;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  throw new Error(`${name} must be 'true' or 'false'.`);
}
