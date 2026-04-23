import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SkrybeService } from "../skrybe-api/src/app/service.mjs";
import { createApp } from "../skrybe-api/src/http/app.mjs";
import { FsJsonlStorage } from "../skrybe-api/src/storage/fs-jsonl-storage.mjs";
import { SkrybeApiClient } from "../skrybe-mcp/src/api-client.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const bootstrapDir = resolve(__dirname, "..", "bootstrap");

export async function bootstrapSkrybeProject({
  workspaceRoot = process.cwd(),
  dataRoot = process.env.SKRYBE_DATA_ROOT ?? join(workspaceRoot, ".skrybe")
} = {}) {
  const projectTemplate = await readJsonFile(join(bootstrapDir, "skrybe-project.json"));
  const rulesetTemplate = await readJsonFile(join(bootstrapDir, "skrybe-ruleset.json"));

  const storage = new FsJsonlStorage({ dataRoot });
  const service = new SkrybeService({ storage });
  const app = createApp({ service });
  const apiClient = new SkrybeApiClient({
    baseUrl: "http://skrybe.bootstrap",
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
      project: relativeBootstrapPath("skrybe-project.json"),
      ruleset: relativeBootstrapPath("skrybe-ruleset.json")
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await bootstrapSkrybeProject();
  console.log(JSON.stringify(result, null, 2));
}

async function readJsonFile(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function relativeBootstrapPath(fileName) {
  return `bootstrap/${fileName}`;
}
