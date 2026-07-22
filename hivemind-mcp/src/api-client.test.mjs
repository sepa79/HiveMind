import { describe, expect, it } from "vitest";
import { HiveMindApiClient, HiveMindApiClientError } from "./api-client.mjs";

describe("HiveMindApiClient", () => {
  it("checks API health with one fast request", async () => {
    let calls = 0;
    const client = new HiveMindApiClient({
      baseUrl: "http://127.0.0.1:4010",
      fetchImpl: async (input, init) => {
        calls += 1;
        expect(input.toString()).toBe("http://127.0.0.1:4010/health");
        expect(init.method).toBe("GET");
        expect(init.signal).toBeTruthy();
        return jsonResponse(200, {
          ok: true,
          data: {
            status: "ok",
            service: "hivemind-api"
          }
        });
      }
    });

    await expect(client.healthCheck({ timeoutMs: 1000 })).resolves.toEqual({
      status: "ok",
      service: "hivemind-api"
    });
    expect(calls).toBe(1);
  });

  it("does not retry health check transport failures", async () => {
    let calls = 0;
    const client = new HiveMindApiClient({
      baseUrl: "http://127.0.0.1:4010",
      fetchImpl: async () => {
        calls += 1;
        throw new TypeError("fetch failed");
      }
    });

    await expect(client.healthCheck()).rejects.toMatchObject({
      code: "API_TRANSPORT_FAILED",
      details: {
        method: "GET",
        url: "http://127.0.0.1:4010/health",
        attempts: 1
      }
    });
    expect(calls).toBe(1);
  });

  it("sends the admin bearer token to admin endpoints", async () => {
    const client = new HiveMindApiClient({
      baseUrl: "http://127.0.0.1:4010",
      adminToken: "  secret-admin-token\n",
      fetchImpl: async (input, init) => {
        expect(input.toString()).toBe("http://127.0.0.1:4010/v1/admin/projects/buzz?reason=cleanup");
        expect(init.method).toBe("DELETE");
        expect(init.headers.authorization).toBe("Bearer secret-admin-token");
        return jsonResponse(200, {
          ok: true,
          data: {
            deleted_project_id: "buzz"
          }
        });
      }
    });

    await expect(client.deleteProject({ project_id: "buzz", reason: "cleanup" })).resolves.toEqual({
      deleted_project_id: "buzz"
    });
  });

  it("forwards explicit standard profile resolution during project merge", async () => {
    const client = new HiveMindApiClient({
      baseUrl: "http://127.0.0.1:4010",
      adminToken: "secret-admin-token",
      fetchImpl: async (input, init) => {
        expect(input.toString()).toBe("http://127.0.0.1:4010/v1/admin/projects/merge");
        expect(init.method).toBe("POST");
        expect(JSON.parse(init.body)).toEqual({
          source_project_id: "legacy",
          target_project_id: "buzz",
          standard_profile_resolution: {
            strategy: "set",
            standard_profile_ref: "base@v1"
          }
        });
        return jsonResponse(200, {
          ok: true,
          data: {
            source_project_id: "legacy",
            target_project_id: "buzz"
          }
        });
      }
    });

    await expect(
      client.mergeProjects({
        source_project_id: "legacy",
        target_project_id: "buzz",
        standard_profile_resolution: {
          strategy: "set",
          standard_profile_ref: "base@v1"
        }
      })
    ).resolves.toEqual({ source_project_id: "legacy", target_project_id: "buzz" });
  });

  it.each([
    ["delete", (client) => client.deleteProject({ project_id: "buzz" })],
    ["merge", (client) => client.mergeProjects({ source_project_id: "legacy", target_project_id: "buzz" })]
  ])("does not retry %s after a transport failure", async (_operation, invoke) => {
    let calls = 0;
    const client = new HiveMindApiClient({
      baseUrl: "http://127.0.0.1:4010",
      adminToken: "secret-admin-token",
      fetchImpl: async () => {
        calls += 1;
        throw new TypeError("response lost");
      }
    });

    await expect(invoke(client)).rejects.toMatchObject({
      code: "API_TRANSPORT_FAILED",
      details: { attempts: 1 }
    });
    expect(calls).toBe(1);
  });

  it.each([
    ["delete", (client) => client.deleteProject({ project_id: "buzz" })],
    ["merge", (client) => client.mergeProjects({ source_project_id: "legacy", target_project_id: "buzz" })]
  ])("does not retry %s after a transient HTTP response", async (_operation, invoke) => {
    let calls = 0;
    const client = new HiveMindApiClient({
      baseUrl: "http://127.0.0.1:4010",
      adminToken: "secret-admin-token",
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse(503, {
          ok: false,
          error: {
            code: "SERVICE_UNAVAILABLE",
            message: "Service unavailable.",
            details: {}
          },
          meta: {}
        });
      }
    });

    await expect(invoke(client)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      details: { attempts: 1 }
    });
    expect(calls).toBe(1);
  });

  it("retries one transient transport failure", async () => {
    let calls = 0;
    const client = new HiveMindApiClient({
      baseUrl: "http://127.0.0.1:4010",
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          throw new TypeError("fetch failed");
        }
        return jsonResponse(200, {
          ok: true,
          data: {
            projects: []
          }
        });
      }
    });

    await expect(client.listProjects()).resolves.toEqual({ projects: [] });
    expect(calls).toBe(2);
  });

  it("retries one transient 503 response", async () => {
    let calls = 0;
    const client = new HiveMindApiClient({
      baseUrl: "http://127.0.0.1:4010",
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) {
          return jsonResponse(503, {
            ok: false,
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "Service unavailable.",
              details: {}
            },
            meta: {}
          });
        }
        return jsonResponse(200, {
          ok: true,
          data: {
            project_id: "skrybe",
            features: []
          }
        });
      }
    });

    await expect(client.listFeatures("skrybe")).resolves.toEqual({ project_id: "skrybe", features: [] });
    expect(calls).toBe(2);
  });

  it("does not retry validation failures", async () => {
    let calls = 0;
    const client = new HiveMindApiClient({
      baseUrl: "http://127.0.0.1:4010",
      fetchImpl: async () => {
        calls += 1;
        return jsonResponse(400, {
          ok: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request.",
            details: {}
          },
          meta: {}
        });
      }
    });

    await expect(client.listProjects()).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: {
        attempts: 1
      }
    });
    expect(calls).toBe(1);
  });

  it("includes fetch error cause details on transport failures", async () => {
    const cause = Object.assign(new Error("connect ECONNREFUSED 192.168.88.54:4010"), {
      code: "ECONNREFUSED",
      errno: -111,
      syscall: "connect",
      address: "192.168.88.54",
      port: 4010
    });
    const fetchError = new TypeError("fetch failed", { cause });
    const client = new HiveMindApiClient({
      baseUrl: "http://192.168.88.54:4010",
      fetchImpl: async () => {
        throw fetchError;
      }
    });

    await expect(client.listFeatures("skrybe")).rejects.toMatchObject({
      name: "HiveMindApiClientError",
      status: 0,
      code: "API_TRANSPORT_FAILED",
      message: "fetch failed",
      details: {
        method: "GET",
        url: "http://192.168.88.54:4010/v1/projects/skrybe/features",
        cause: {
          name: "Error",
          message: "connect ECONNREFUSED 192.168.88.54:4010",
          code: "ECONNREFUSED",
          errno: -111,
          syscall: "connect",
          address: "192.168.88.54",
          port: 4010
        }
      }
    });

    await expect(client.listFeatures("skrybe")).rejects.toBeInstanceOf(HiveMindApiClientError);
  });
});

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    }
  };
}
