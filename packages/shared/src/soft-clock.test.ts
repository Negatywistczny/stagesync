import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ } from "./time.js";
import { getDisplayTicks, type TransportAnchor } from "./soft-clock.js";

const anchor: TransportAnchor = {
  positionTicks: 1000,
  bpm: 120,
  timeSignature: { numerator: 4, denominator: 4 },
  ppq: DEFAULT_PPQ,
};

describe("getDisplayTicks", () => {
  it("returns anchor ticks when not playing", () => {
    expect(getDisplayTicks(anchor, 5000, 1000, false)).toBe(1000);
  });

  it("returns anchor at zero elapsed while playing", () => {
    expect(getDisplayTicks(anchor, 1000, 1000, true)).toBe(1000);
  });

  it("advances by one beat after 500ms at 120 BPM 4/4", () => {
    expect(getDisplayTicks(anchor, 1500, 1000, true)).toBe(1000 + DEFAULT_PPQ);
  });

  it("clamps negative elapsed to zero", () => {
    expect(getDisplayTicks(anchor, 900, 1000, true)).toBe(1000);
  });
});
