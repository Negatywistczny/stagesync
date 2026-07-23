import { afterEach, describe, expect, it, vi } from "vitest";
import { noteLatencySample } from "./transportReducer.js";

describe("noteLatencySample", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("clamps huge clock skew samples to 60s", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_060_000);
    expect(noteLatencySample(0, 1_700_000_000_000)).toBe(60_000);
  });

  it("keeps EMA under the clamp", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_010_000);
    const next = noteLatencySample(50_000, 1_700_000_000_000);
    expect(next).toBeLessThanOrEqual(60_000);
    expect(next).toBeGreaterThan(40_000);
  });
});
