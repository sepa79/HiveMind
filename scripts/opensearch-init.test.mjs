import { describe, expect, it, vi } from "vitest";
import {
  basicAuth,
  buildProvisioningRequests,
  provisionOpenSearch,
  requiredEnv,
  waitForOpenSearch
} from "./opensearch-init.mjs";

describe("opensearch-init", () => {
  it("requires explicit credentials", () => {
    expect(() => requiredEnv({}, "OPENSEARCH_INITIAL_ADMIN_PASSWORD")).toThrow(
      "OPENSEARCH_INITIAL_ADMIN_PASSWORD is required."
    );
  });

  it("builds the expected security provisioning requests", () => {
    expect(
      buildProvisioningRequests({
        username: "hivemind_api",
        password: "service-pass",
        indexPrefix: "team"
      })
    ).toEqual([
      {
        path: "/_plugins/_security/api/roles/hivemind_api",
        body: {
          cluster_permissions: ["indices:data/read/scroll/clear"],
          index_permissions: [
            {
              index_patterns: ["team-*"],
              allowed_actions: ["indices:admin/*", "indices:data/*"]
            }
          ],
          tenant_permissions: []
        }
      },
      {
        path: "/_plugins/_security/api/internalusers/hivemind_api",
        body: {
          password: "service-pass",
          backend_roles: ["hivemind_api"],
          attributes: {}
        }
      },
      {
        path: "/_plugins/_security/api/rolesmapping/hivemind_api",
        body: {
          backend_roles: ["hivemind_api"],
          users: ["hivemind_api"],
          hosts: []
        }
      }
    ]);
  });

  it("waits until OpenSearch health succeeds", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => "starting" })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => "ok" });
    const sleep = vi.fn();

    await waitForOpenSearch({
      endpoint: "https://opensearch:9200",
      authorization: "Basic abc",
      fetchImpl,
      attempts: 2,
      sleep
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it("provisions role, internal user, and role mapping after health succeeds", async () => {
    const fetchImpl = vi.fn(async (url, options) => {
      if (url.endsWith("/_cluster/health")) {
        return { ok: true, status: 200, text: async () => "green" };
      }
      return { ok: true, status: 200, text: async () => `ok:${url}:${options.body}` };
    });
    const logger = { log: vi.fn() };

    await provisionOpenSearch({
      env: {
        OPENSEARCH_INITIAL_ADMIN_PASSWORD: "admin-pass",
        HIVEMIND_OPENSEARCH_USERNAME: "hivemind_api",
        HIVEMIND_OPENSEARCH_PASSWORD: "service-pass",
        HIVEMIND_OPENSEARCH_INDEX_PREFIX: "hivemind"
      },
      fetchImpl,
      logger,
      sleep: vi.fn()
    });

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://opensearch:9200/_cluster/health",
      { headers: { authorization: basicAuth("admin", "admin-pass") } }
    );
    expect(logger.log).toHaveBeenCalledTimes(3);
  });
});
