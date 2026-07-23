import { describe, expect, it } from "vitest";
import { ticksFromSyncLeadMs } from "./syncLead.js";

describe("syncLead", () => {
  it("converts lead ms to ticks at 120 BPM PPQ 960", () => {
    expect(ticksFromSyncLeadMs(200, 120, 960)).toBe(384);
    expect(ticksFromSyncLeadMs(0, 120, 960)).toBe(0);
    expect(ticksFromSyncLeadMs(-200, 120, 960)).toBe(-384);
  });

  it("falls back when bpm/ppq invalid", () => {
    expect(ticksFromSyncLeadMs(1000, Number.NaN)).toBeGreaterThan(0);
    expect(ticksFromSyncLeadMs(1000, -5)).toBeGreaterThan(0);
    expect(ticksFromSyncLeadMs(1000, 120, -1)).toBeGreaterThan(0);
    expect(ticksFromSyncLeadMs(Number.NaN, 120)).toBe(0);
  });
});
