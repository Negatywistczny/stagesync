import { describe, expect, it } from "vitest";
import { DEFAULT_PPQ } from "@stagesync/shared";
import { ticksFromSyncLeadAlongMap, ticksFromSyncLeadMs } from "./syncLead.js";

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

  it("AlongMap matches flat BPM on a single-event map", () => {
    const project = {
      defaultBpm: 120,
      defaultMeter: { numerator: 4, denominator: 4 },
      tempoMap: [{ id: "t0", startTicks: 0, bpm: 120 }],
      meterMap: [],
      ppq: 960 as const,
    };
    expect(ticksFromSyncLeadAlongMap(200, 0, project)).toBe(
      ticksFromSyncLeadMs(200, 120, DEFAULT_PPQ),
    );
  });
});
