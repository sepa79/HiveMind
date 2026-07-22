import { describe, expect, it } from "vitest";
import { isExclusiveProjectOperation, RequestOperationGate } from "./request-operation-gate.mjs";

describe("RequestOperationGate", () => {
  it("waits for shared operations and prevents new ones from bypassing a queued exclusive operation", async () => {
    const gate = new RequestOperationGate();
    const events = [];
    let releaseFirst;
    let releaseExclusive;

    const first = gate.runShared(async () => {
      events.push("first:start");
      await new Promise((resolve) => {
        releaseFirst = resolve;
      });
      events.push("first:end");
    });
    await Promise.resolve();
    const exclusive = gate.runExclusive(async () => {
      events.push("exclusive:start");
      await new Promise((resolve) => {
        releaseExclusive = resolve;
      });
      events.push("exclusive:end");
    });
    const second = gate.runShared(async () => {
      events.push("second:start");
    });

    await Promise.resolve();
    expect(events).toEqual(["first:start"]);
    releaseFirst();
    await first;
    await Promise.resolve();
    expect(events).toEqual(["first:start", "first:end", "exclusive:start"]);
    releaseExclusive();
    await Promise.all([exclusive, second]);
    expect(events).toEqual(["first:start", "first:end", "exclusive:start", "exclusive:end", "second:start"]);
  });

  it("classifies only destructive project maintenance as exclusive", () => {
    expect(isExclusiveProjectOperation("DELETE", "/v1/admin/projects/alpha")).toBe(true);
    expect(isExclusiveProjectOperation("POST", "/v1/admin/projects/merge")).toBe(true);
    expect(isExclusiveProjectOperation("POST", "/v1/admin/memory-review")).toBe(false);
    expect(isExclusiveProjectOperation("POST", "/v1/entries")).toBe(false);
    expect(isExclusiveProjectOperation("GET", "/v1/projects")).toBe(false);
  });
});
