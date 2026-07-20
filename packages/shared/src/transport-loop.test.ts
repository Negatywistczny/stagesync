import { describe, expect, it } from "vitest";
import {
  isUsableLoop,
  loopWrapTicks,
  normalizeLoop,
} from "./transport-loop.js";

describe("transport-loop", () => {
  it("isUsableLoop requires end > start", () => {
    expect(isUsableLoop({ enabled: true, startTicks: 0, endTicks: 0 })).toBe(
      false,
    );
    expect(
      isUsableLoop({ enabled: false, startTicks: 0, endTicks: 960 }),
    ).toBe(true);
  });

  it("loopWrapTicks wraps at exclusive end when enabled", () => {
    const loop = { enabled: true, startTicks: 1920, endTicks: 7680 };
    expect(loopWrapTicks(7679, loop)).toBeNull();
    expect(loopWrapTicks(7680, loop)).toBe(1920);
    expect(loopWrapTicks(9000, loop)).toBe(1920);
  });

  it("loopWrapTicks no-op when disabled", () => {
    expect(
      loopWrapTicks(9000, { enabled: false, startTicks: 0, endTicks: 100 }),
    ).toBeNull();
  });

  it("normalizeLoop rejects bad ranges", () => {
    expect(normalizeLoop({ enabled: true, startTicks: 10, endTicks: 5 })).toBeNull();
    expect(
      normalizeLoop({ enabled: true, startTicks: 0, endTicks: 100 }),
    ).toEqual({ enabled: true, startTicks: 0, endTicks: 100 });
  });
});
