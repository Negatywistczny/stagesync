import { describe, expect, it } from "vitest";
import {
  emptyPeakHold,
  formatPeakHoldDb,
  meterDbPeakBand,
  updatePeakHold,
} from "@stagesync/shared";
import { formatPanReadout } from "./PanKnob.js";
import { clearThenLatch, latchChannelPeaks } from "./useMixerMeterLevels.js";

describe("formatPanReadout", () => {
  it("formats C / L / R", () => {
    expect(formatPanReadout(0)).toBe("C");
    expect(formatPanReadout(-0.5)).toBe("L50");
    expect(formatPanReadout(1)).toBe("R100");
  });

  it("clamps non-finite and near-zero to C", () => {
    expect(formatPanReadout(Number.NaN)).toBe("C");
    expect(formatPanReadout(0.004)).toBe("C");
    expect(formatPanReadout(-2)).toBe("L100");
    expect(formatPanReadout(2)).toBe("R100");
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

  it("clear-then-tick does not restore a pre-clear overshoot from stale prev", () => {
    const latched = latchChannelPeaks(emptyPeakHold(), { l: 1.2, r: -3 });
    expect(latched.hold.holdDb).toBe(1.2);
    expect(latched.hold.clipped).toBe(true);
    // Clear must win before the next analyser sample (ref store, not React prev).
    const afterClear = clearThenLatch({ l: -12, r: -18 });
    expect(afterClear.hold.holdDb).toBe(-12);
    expect(afterClear.hold.clipped).toBe(false);
  });

  it("stereo latch keeps max(L,R) across ticks", () => {
    let reading = latchChannelPeaks(emptyPeakHold(), { l: -6, r: -3 });
    expect(reading.hold.holdDb).toBe(-3);
    reading = latchChannelPeaks(reading.hold, { l: 0.4, r: -1 });
    expect(reading.hold.holdDb).toBe(0.4);
    expect(reading.hold.clipped).toBe(true);
  });
});
