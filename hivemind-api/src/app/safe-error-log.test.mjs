import { describe, expect, it, vi } from "vitest";
import { logFatalError, redactSensitiveText, safeErrorDetails } from "./safe-error-log.mjs";

describe("safe error logging", () => {
  it("does not serialize nested OpenSearch request metadata", () => {
    const error = new Error("connect ECONNREFUSED opensearch:9200");
    error.code = "ECONNREFUSED";
    error.meta = {
      statusCode: 503,
      request: {
        params: {
          headers: {
            authorization: "Basic c2VydmljZTpzdXBlci1zZWNyZXQ="
          }
        }
      }
    };

    const serialized = JSON.stringify(safeErrorDetails(error));

    expect(serialized).toContain("ECONNREFUSED");
    expect(serialized).toContain('"status_code":503');
    expect(serialized).not.toContain("c2VydmljZTpzdXBlci1zZWNyZXQ");
    expect(serialized).not.toContain("authorization");
  });

  it("redacts credentials embedded in error messages", () => {
    const message = redactSensitiveText(
      'request failed: authorization="Bearer live-token" password=service-pass https://admin:admin-pass@opensearch:9200; proxy returned Bearer proxy-token'
    );

    expect(message).toContain('authorization="[REDACTED]"');
    expect(message).toContain("Bearer [REDACTED]");
    expect(message).toContain("password=[REDACTED]");
    expect(message).toContain("https://[REDACTED]@opensearch:9200");
    expect(message).not.toContain("live-token");
    expect(message).not.toContain("service-pass");
    expect(message).not.toContain("admin-pass");
  });

  it("logs only the bounded safe summary", () => {
    const logger = { error: vi.fn() };
    const error = Object.assign(new Error("backend rejected Basic dXNlcjpwYXNz"), {
      meta: { request: { headers: { authorization: "Basic dXNlcjpwYXNz" } } }
    });

    logFatalError(logger, "HiveMind API startup failed", error);

    expect(logger.error).toHaveBeenCalledOnce();
    const logged = logger.error.mock.calls[0][0];
    expect(logged).toContain("HiveMind API startup failed");
    expect(logged).toContain("Basic [REDACTED]");
    expect(logged).not.toContain("dXNlcjpwYXNz");
  });
});
