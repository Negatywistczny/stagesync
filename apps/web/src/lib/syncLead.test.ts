import { describe, expect, it } from "vitest";
import { ticksFromSyncLeadMs } from "./syncLead.js";

describe("syncLead", () => {
  it("converts lead ms to ticks at 120 BPM PPQ 960", () => {
    // 200ms at 120bpm = 0.4 beats * 960 = 384
    expect(ticksFromSyncLeadMs(200, 120, 960)).toBe(384);
    expect(ticksFromSyncLeadMs(0, 120, 960)).toBe(0);
    expect(ticksFromSyncLeadMs(-200, 120, 960)).toBe(-384);
  });
});
