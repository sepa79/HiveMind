import { describe, expect, it } from "vitest";
import { parseBackendProfiles } from "./backend-config.mjs";

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
