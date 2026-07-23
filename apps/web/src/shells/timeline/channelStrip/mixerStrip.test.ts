import { describe, expect, it } from "vitest";
import {
  emptyPeakHold,
  formatPeakHoldDb,
  meterDbPeakBand,
  updatePeakHold,
} from "@stagesync/shared";
import { formatPanReadout } from "./PanKnob.js";

describe("formatPanReadout", () => {
  it("formats C / L / R", () => {
    expect(formatPanReadout(0)).toBe("C");
    expect(formatPanReadout(-0.5)).toBe("L50");
    expect(formatPanReadout(1)).toBe("R100");
  });
});

describe("meter LED bands (shared)", () => {
  it("matches strip colour thresholds", () => {
    expect(meterDbPeakBand(-12)).toBe("safe");
    expect(meterDbPeakBand(-6)).toBe("warn");
    expect(meterDbPeakBand(1)).toBe("clip");
  });
});

describe("peak hold latch (Mixer)", () => {
  it("latches max and clip; manual reset clears", () => {
    let s = emptyPeakHold();
    s = updatePeakHold(s, -3);
    s = updatePeakHold(s, 1.2);
    expect(s.holdDb).toBe(1.2);
    expect(s.clipped).toBe(true);
    expect(formatPeakHoldDb(s.holdDb)).toBe("+1.2");
    s = emptyPeakHold();
    expect(s.clipped).toBe(false);
    expect(formatPeakHoldDb(s.holdDb)).toBe("−∞");
  });
});
