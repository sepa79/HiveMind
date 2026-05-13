import { describe, expect, it } from "vitest";
import { HiveMindApiClient, HiveMindApiClientError } from "./api-client.mjs";

describe("HiveMindApiClient", () => {
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
