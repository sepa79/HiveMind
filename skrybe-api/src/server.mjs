#!/usr/bin/env node

import { serve } from "@hono/node-server";
import { HiveMindService } from "./app/service.mjs";
import { createApp } from "./http/app.mjs";
import { FsJsonlStorage } from "./storage/fs-jsonl-storage.mjs";

const port = Number(process.env.SKRYBE_API_PORT || "4010");
const dataRoot = process.env.SKRYBE_DATA_ROOT || `${process.cwd()}/.skrybe`;

const storage = new FsJsonlStorage({ dataRoot });
const service = new HiveMindService({ storage });
const app = createApp({ service });

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    console.log(`HiveMind API listening on http://127.0.0.1:${info.port}`);
  }
);

