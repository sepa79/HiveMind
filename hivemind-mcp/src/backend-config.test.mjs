import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseBackendProfiles } from "./backend-config.mjs";

const roots = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("backend config", () => {
  it("uses the legacy single backend env var when HIVEMIND_BACKENDS is not set", () => {
    const profiles = parseBackendProfiles({
      HIVEMIND_API_BASE_URL: "https://hivemind.example.com/"
    });

    expect(profiles).toEqual([
      {
        backend_id: "default",
        api_base_url: "https://hivemind.example.com",
        label: undefined
      }
    ]);
  });

  it("parses explicit multi-backend profiles", () => {
    const profiles = parseBackendProfiles({
      HIVEMIND_BACKENDS: JSON.stringify([
        { backend_id: "default", api_base_url: "https://hivemind.example.com" },
        { backend_id: "skippybot", api_base_url: "https://skippybot.example.com/", label: "SkippyBot" }
      ])
    });

    expect(profiles).toEqual([
      {
        backend_id: "default",
        api_base_url: "https://hivemind.example.com",
        label: "default"
      },
      {
        backend_id: "skippybot",
        api_base_url: "https://skippybot.example.com",
        label: "SkippyBot"
      }
    ]);
  });

  it("resolves admin tokens from configured environment variable names", () => {
    const profiles = parseBackendProfiles({
      HF_BIG_TOKEN: "secret-token",
      HIVEMIND_BACKENDS: JSON.stringify([
        {
          backend_id: "default",
          api_base_url: "https://hivemind.example.com",
          admin_token_env: "HF_BIG_TOKEN"
        }
      ])
    });

    expect(profiles).toEqual([
      {
        backend_id: "default",
        api_base_url: "https://hivemind.example.com",
        label: "default",
        admin_token: "secret-token",
        admin_token_env: "HF_BIG_TOKEN"
      }
    ]);
  });

  it("uses the global admin token for explicit backends without per-backend token env names", () => {
    const profiles = parseBackendProfiles({
      HIVEMIND_ADMIN_TOKEN: "global-token",
      HIVEMIND_BACKENDS: JSON.stringify([{ backend_id: "default", api_base_url: "https://hivemind.example.com" }])
    });

    expect(profiles).toEqual([
      {
        backend_id: "default",
        api_base_url: "https://hivemind.example.com",
        label: "default",
        admin_token: "global-token"
      }
    ]);
  });

  it("keeps admin credentials opaque for API-side normalization", () => {
    const profiles = parseBackendProfiles({
      HIVEMIND_ADMIN_TOKEN: "  global-token\n"
    });

    expect(profiles[0].admin_token).toBe("  global-token\n");
  });

  it("reads the API admin token from a configured secret file", () => {
    const tokenFile = tempTokenFile("api-token\n");

    const profiles = parseBackendProfiles({ HIVEMIND_ADMIN_TOKEN_FILE: tokenFile });

    expect(profiles[0].admin_token).toBe("api-token\n");
  });

  it("rejects simultaneous API admin token and token file configuration", () => {
    expect(() =>
      parseBackendProfiles({
        HIVEMIND_ADMIN_TOKEN: "api-token",
        HIVEMIND_ADMIN_TOKEN_FILE: "/run/secrets/api-token"
      })
    ).toThrow("HIVEMIND_ADMIN_TOKEN and HIVEMIND_ADMIN_TOKEN_FILE are mutually exclusive");
  });

  it("rejects whitespace-only admin credentials", () => {
    expect(() => parseBackendProfiles({ HIVEMIND_ADMIN_TOKEN: "  \n" })).toThrow(
      "HIVEMIND_ADMIN_TOKEN must be a non-blank string"
    );
  });

  it("rejects duplicate backend ids", () => {
    expect(() =>
      parseBackendProfiles({
        HIVEMIND_BACKENDS: JSON.stringify([
          { backend_id: "default", api_base_url: "https://one.example.com" },
          { backend_id: "default", api_base_url: "https://two.example.com" }
        ])
      })
    ).toThrow("duplicate backend_id");
  });
});

function tempTokenFile(contents) {
  const root = mkdtempSync(join(tmpdir(), "hivemind-mcp-backend-token-"));
  roots.push(root);
  const tokenFile = join(root, "token");
  writeFileSync(tokenFile, contents, "utf8");
  return tokenFile;
}
