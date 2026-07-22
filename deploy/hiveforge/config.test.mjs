import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("HiveForge admin token deployment contract", () => {
  it.each(["deploy.yml", "update.yml", "upgrade.yml"])("loads admin token inputs in %s", (playbook) => {
    const source = read(`./${playbook}`);

    expect(source).toContain("lookup('ansible.builtin.env', 'HIVEMIND_ADMIN_TOKEN')");
    expect(source).toContain("lookup('ansible.builtin.env', 'HIVEMIND_MCP_ADMIN_TOKEN')");
    expect(source).toContain("HIVEMIND_ADMIN_TOKEN_SECRET");
    expect(source).toContain("HIVEMIND_MCP_ADMIN_TOKEN_SECRET");
  });

  it("renders direct tokens for docker-single and Docker secrets for Swarm", () => {
    const template = read("./templates/docker-compose.yml.j2");

    expect(template).toContain('HIVEMIND_ADMIN_TOKEN: "{{ hivemind_admin_token }}"');
    expect(template).toContain('HIVEMIND_MCP_ADMIN_TOKEN: "{{ hivemind_mcp_admin_token }}"');
    expect(template).toContain('HIVEMIND_ADMIN_TOKEN_FILE: "{{ hivemind_admin_token_secret_path }}"');
    expect(template).toContain('HIVEMIND_MCP_ADMIN_TOKEN_FILE: "{{ hivemind_mcp_admin_token_secret_path }}"');
    expect(template).toContain("hivemind-data:/data");
  });

  it("keeps the HiveMind API deployment single-writer during Swarm updates", () => {
    for (const source of [read("./templates/docker-compose.yml.j2"), read("../../docker-compose.yml")]) {
      const apiService = source.split("  hivemind-api:")[1].split("  hivemind-mcp:")[0];

      expect(apiService).toContain("replicas: 1");
      expect(apiService).toContain("update_config:");
      expect(apiService).toContain("order: stop-first");
    }
  });
});
