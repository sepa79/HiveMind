import { describe, expect, it } from "vitest";
import { parseCli } from "./hivemind-work-unit.mjs";

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
});
