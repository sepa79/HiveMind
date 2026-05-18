import { describe, expect, it } from "vitest";
import { HiveMindApiClient, HiveMindApiClientError } from "./api-client.mjs";

describe("HiveMindApiClient", () => {
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
