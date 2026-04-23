import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HiveMindService } from "../hivemind-api/src/app/service.mjs";
import { createApp } from "../hivemind-api/src/http/app.mjs";
import { FsJsonlStorage } from "../hivemind-api/src/storage/fs-jsonl-storage.mjs";
import { HiveMindApiClient } from "../hivemind-mcp/src/api-client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bootstrapDir = resolve(__dirname, "..", "bootstrap");

export async function bootstrapHiveMindProject({
  workspaceRoot = process.cwd(),
  dataRoot = process.env.HIVEMIND_DATA_ROOT ?? join(workspaceRoot, ".hivemind")
} = {}) {
  const projectTemplate = await readJsonFile(join(bootstrapDir, "hivemind-project.json"));
  const rulesetTemplate = await readJsonFile(join(bootstrapDir, "hivemind-ruleset.json"));

  const storage = new FsJsonlStorage({ dataRoot });
  const service = new HiveMindService({ storage });
  const app = createApp({ service });
  const apiClient = new HiveMindApiClient({
    baseUrl: "http://hivemind.bootstrap",
    fetchImpl: (input, init) => app.request(input, init)
  });

  const projectPayload = {
    ...projectTemplate,
    root_path: workspaceRoot
  };

  const { project } = await apiClient.registerProject(projectPayload);
  const { ruleset } = await apiClient.defineRules({
    project_id: project.project_id,
    rules: rulesetTemplate.rules
  });

  return {
    project,
    ruleset,
    data_root: resolve(dataRoot),
    bootstrap_files: {
      project: relativeBootstrapPath("hivemind-project.json"),
      ruleset: relativeBootstrapPath("hivemind-ruleset.json")
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await bootstrapHiveMindProject();
  console.log(JSON.stringify(result, null, 2));
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function relativeBootstrapPath(fileName) {
  return `bootstrap/${fileName}`;
}
