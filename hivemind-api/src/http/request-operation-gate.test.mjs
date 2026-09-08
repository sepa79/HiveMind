import { describe, expect, it } from "vitest";
import { ProjectOperationGates, RequestOperationGate, normalizeProjectGateKeys } from "./request-operation-gate.mjs";

describe("RequestOperationGate", () => {
  it("waits for shared operations and prevents new ones from bypassing a queued exclusive operation", async () => {
    const gate = new RequestOperationGate();
    const events = [];
    let releaseFirst;
    let releaseExclusive;
    let signalFirstStarted;
    const firstStarted = new Promise((resolve) => {
      signalFirstStarted = resolve;
    });

    const first = gate.runShared(async () => {
      events.push("first:start");
      signalFirstStarted();
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

    await firstStarted;
    expect(events).toEqual(["first:start"]);
    releaseFirst();
    await first;
    await Promise.resolve();
    expect(events).toEqual(["first:start", "first:end", "exclusive:start"]);
    releaseExclusive();
    await Promise.all([exclusive, second]);
    expect(events).toEqual(["first:start", "first:end", "exclusive:start", "exclusive:end", "second:start"]);
  });

  it("normalizes project gate keys deterministically", () => {
    expect(normalizeProjectGateKeys(["beta", " alpha ", "beta", "", null, "alpha", "  "])).toEqual(["alpha", "beta"]);
  });

  it("locks only the addressed project gates", async () => {
    const gates = new ProjectOperationGates();
    const events = [];
    let releaseAlpha;
    const alphaStarted = new Promise((resolve) => {
      releaseAlpha = resolve;
    });

    const alphaShared = gates.runShared("alpha", async () => {
      events.push("alpha:start");
      await alphaStarted;
      events.push("alpha:end");
    });
    await Promise.resolve();

    let alphaExclusiveFinished = false;
    const alphaExclusive = gates.runExclusive("alpha", async () => {
      alphaExclusiveFinished = true;
      events.push("alpha:exclusive");
    });
    const betaShared = gates.runShared("beta", async () => {
      events.push("beta:start");
    });

    await betaShared;
    expect(events).toEqual(["alpha:start", "beta:start"]);
    expect(alphaExclusiveFinished).toBe(false);

    releaseAlpha();
    await Promise.all([alphaShared, alphaExclusive]);
    expect(events).toEqual(["alpha:start", "beta:start", "alpha:end", "alpha:exclusive"]);
  });

  it("releases retained project gates after queued work finishes", async () => {
    const gates = new ProjectOperationGates();
    let releaseShared;
    let signalSharedStarted;
    const sharedStarted = new Promise((resolve) => {
      signalSharedStarted = resolve;
    });

    const shared = gates.runShared("alpha", async () => {
      signalSharedStarted();
      await new Promise((resolve) => {
        releaseShared = resolve;
      });
    });
    await sharedStarted;

    const exclusive = gates.runExclusive("alpha", async () => {});
    await Promise.resolve();
    expect(gates.activeGateCount()).toBe(1);

    releaseShared();
    await Promise.all([shared, exclusive]);
    expect(gates.activeGateCount()).toBe(0);
  });

  it("orders overlapping merge locks consistently and releases them on failure", async () => {
    const gates = new ProjectOperationGates();
    const events = [];
    const first = gates.runExclusive(["beta", " alpha "], async () => {
      events.push("first");
      throw new Error("injected failure");
    });
    const second = gates.runExclusive(["alpha", "beta"], async () => {
      events.push("second");
    });
    const results = await Promise.allSettled([first, second]);
    expect(results.map((result) => result.status)).toEqual(["rejected", "fulfilled"]);
    expect(events).toEqual(["first", "second"]);
    expect(gates.activeGateCount()).toBe(0);
  });
});
