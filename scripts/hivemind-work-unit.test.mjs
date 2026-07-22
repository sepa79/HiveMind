import { afterEach, describe, expect, it, vi } from "vitest";
import { main, parseCli } from "./hivemind-work-unit.mjs";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("hivemind work-unit CLI", () => {
  it("parses start options", () => {
    expect(parseCli(["start", "--goal", "Audit UI", "--branch", "main"])).toEqual({
      command: "start",
      options: {
        goal: "Audit UI",
        branch: "main"
      },
      commandArgs: []
    });
  });

  it("parses wrapped commands after --", () => {
    expect(parseCli(["run", "--goal", "Run tests", "--", "npm", "test"])).toEqual({
      command: "run",
      options: {
        goal: "Run tests"
      },
      commandArgs: ["npm", "test"]
    });
  });

  it("parses repeated feature values for init", () => {
    expect(parseCli(["init", "--project", "buzz", "--feature", "UI", "--feature", "Backend"])).toEqual({
      command: "init",
      options: {
        project: "buzz",
        feature: ["UI", "Backend"]
      },
      commandArgs: []
    });
  });

  it("uses the canonical project id returned by init before adding features", async () => {
    const calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url, init) => {
        calls.push({ url, init });
        if (url.endsWith("/v1/projects") && init.method === "POST") {
          return jsonResponse({
            ok: true,
            data: {
              project: {
                project_id: "myproject",
                features: []
              }
            }
          });
        }
        if (url.endsWith("/v1/projects/myproject/features") && init.method === "POST") {
          return jsonResponse({
            ok: true,
            data: {
              project_id: "myproject",
              features: ["UI"]
            }
          });
        }
        if (url.endsWith("/v1/projects/myproject/features") && init.method === "GET") {
          return jsonResponse({
            ok: true,
            data: {
              project_id: "myproject",
              features: ["UI"]
            }
          });
        }
        return jsonResponse(
          {
            ok: false,
            error: {
              code: "UNEXPECTED_URL",
              message: url
            }
          },
          404
        );
      })
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const exitCode = await main(
      [
        "init",
        "--project",
        "MyProject",
        "--name",
        "My Project",
        "--repository-url",
        "https://github.com/org/MyProject.git",
        "--root",
        "/repo/MyProject",
        "--feature",
        "UI"
      ],
      {},
      process.cwd()
    );

    expect(exitCode).toBe(0);
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/v1/projects",
      "/v1/projects/myproject/features",
      "/v1/projects/myproject/features"
    ]);
    expect(log).toHaveBeenCalledOnce();
  });
});

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  };
}
