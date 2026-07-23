import { describe, expect, it } from "vitest";
import {
  clampFaderGainDb,
  clampPan,
  balanceGains,
  dbToFaderTaper,
  emptyPeakHold,
  faderTaperToDb,
  FADER_GAIN_FLOOR_DB,
  FADER_TAPER_DB_MAX,
  FADER_TAPER_UNITY_T,
  formatFaderTickLabel,
  formatPeakHoldDb,
  isClipPeakDb,
  linearPeakToMeterDb,
  meterDbPeakBand,
  meterDbToUnit,
  METER_DB_MAX,
  METER_DB_MIN,
  PAN_MAX,
  PAN_MIN,
  STEREO_DOWNMIX_LINEAR,
  updatePeakHold,
} from "./mixer-math.js";

describe("clampPan", () => {
  it("centers nullish / non-finite", () => {
    expect(clampPan(undefined)).toBe(0);
    expect(clampPan(null)).toBe(0);
    expect(clampPan(Number.NaN)).toBe(0);
    expect(clampPan(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("clamps to −1…+1", () => {
    expect(clampPan(-2)).toBe(PAN_MIN);
    expect(clampPan(2)).toBe(PAN_MAX);
    expect(clampPan(-0.5)).toBe(-0.5);
    expect(clampPan(0.25)).toBe(0.25);
  });
});

describe("balanceGains", () => {
  it("center is unity", () => {
    expect(balanceGains(0)).toEqual({ l: 1, r: 1 });
    expect(balanceGains(undefined as unknown as number)).toEqual({
      l: 1,
      r: 1,
    });
  });

  it("attenuates opposite side only", () => {
    expect(balanceGains(-1)).toEqual({ l: 1, r: 0 });
    expect(balanceGains(1)).toEqual({ l: 0, r: 1 });
    expect(balanceGains(-0.5)).toEqual({ l: 1, r: 0.5 });
    expect(balanceGains(0.25)).toEqual({ l: 0.75, r: 1 });
  });

  it("clamps beyond ±1", () => {
    expect(balanceGains(-2)).toEqual({ l: 1, r: 0 });
    expect(balanceGains(3)).toEqual({ l: 0, r: 1 });
  });
});

describe("STEREO_DOWNMIX_LINEAR", () => {
  it("is −3 dB (1/√2)", () => {
    expect(STEREO_DOWNMIX_LINEAR).toBeCloseTo(Math.SQRT1_2, 10);
    expect(20 * Math.log10(STEREO_DOWNMIX_LINEAR)).toBeCloseTo(-3.0103, 3);
  });
});

describe("linearPeakToMeterDb", () => {
  it("maps unity to 0 dB and silence to floor", () => {
    expect(linearPeakToMeterDb(1)).toBeCloseTo(0, 5);
    expect(linearPeakToMeterDb(0)).toBe(METER_DB_MIN);
    expect(linearPeakToMeterDb(-1)).toBe(METER_DB_MIN);
  });

  it("clamps above +6 dB", () => {
    expect(linearPeakToMeterDb(10)).toBe(METER_DB_MAX);
  });

  it("maps −6 dB approx", () => {
    expect(linearPeakToMeterDb(0.5)).toBeCloseTo(-6.02, 1);
  });
});

describe("meterDbToUnit", () => {
  it("maps floor / ceiling / 0 dB", () => {
    expect(meterDbToUnit(METER_DB_MIN)).toBe(0);
    expect(meterDbToUnit(METER_DB_MAX)).toBe(1);
    expect(meterDbToUnit(0)).toBeCloseTo(60 / 66, 5);
  });

  it("clamps out of range", () => {
    expect(meterDbToUnit(-100)).toBe(0);
    expect(meterDbToUnit(100)).toBe(1);
    expect(meterDbToUnit(Number.NaN)).toBe(0);
  });
});

describe("meterDbPeakBand", () => {
  it("classifies safe / warn / clip", () => {
    expect(meterDbPeakBand(-20)).toBe("safe");
    expect(meterDbPeakBand(-6)).toBe("warn");
    expect(meterDbPeakBand(-0.1)).toBe("warn");
    expect(meterDbPeakBand(0)).toBe("warn");
    expect(meterDbPeakBand(0.1)).toBe("clip");
    expect(meterDbPeakBand(6)).toBe("clip");
  });

  it("treats non-finite as safe", () => {
    expect(meterDbPeakBand(Number.NaN)).toBe("safe");
    expect(meterDbPeakBand(Number.NEGATIVE_INFINITY)).toBe("safe");
  });
});

describe("fader taper anchors", () => {
  const anchors: Array<{ t: number; db: number }> = [
    { t: 1, db: 6 },
    { t: 0.75, db: 0 },
    { t: 0.5, db: -10 },
    { t: 0.25, db: -24 },
    { t: 0.08, db: -48 },
  ];

  it("hits table anchors", () => {
    for (const { t, db } of anchors) {
      expect(faderTaperToDb(t)).toBeCloseTo(db, 5);
      expect(dbToFaderTaper(db)).toBeCloseTo(t, 5);
    }
    expect(faderTaperToDb(0)).toBe(Number.NEGATIVE_INFINITY);
    expect(dbToFaderTaper(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(dbToFaderTaper(FADER_GAIN_FLOOR_DB)).toBe(0);
  });

  it("unity mark constant", () => {
    expect(FADER_TAPER_UNITY_T).toBe(0.75);
    expect(faderTaperToDb(FADER_TAPER_UNITY_T)).toBeCloseTo(0, 5);
  });

  it("round-trips finite positions within epsilon", () => {
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      const db = faderTaperToDb(t);
      expect(Number.isFinite(db)).toBe(true);
      expect(dbToFaderTaper(db)).toBeCloseTo(t, 4);
    }
  });

  it("round-trips finite dB samples within epsilon", () => {
    const samples = [6, 3, 0, -3, -6, -10, -15, -20, -30, -40, -48, -54];
    for (const db of samples) {
      const t = dbToFaderTaper(db);
      expect(faderTaperToDb(t)).toBeCloseTo(db, 3);
    }
  });

  it("clamps stored gain for schema / GainNode", () => {
    expect(clampFaderGainDb(Number.NEGATIVE_INFINITY)).toBe(FADER_GAIN_FLOOR_DB);
    expect(clampFaderGainDb(Number.NaN)).toBe(FADER_GAIN_FLOOR_DB);
    expect(clampFaderGainDb(100)).toBe(FADER_TAPER_DB_MAX);
    expect(clampFaderGainDb(-100)).toBe(FADER_GAIN_FLOOR_DB);
    expect(clampFaderGainDb(0)).toBe(0);
  });
});

describe("formatFaderTickLabel", () => {
  it("formats ticks", () => {
    expect(formatFaderTickLabel(6)).toBe("+6");
    expect(formatFaderTickLabel(0)).toBe("0");
    expect(formatFaderTickLabel(-10)).toBe("−10");
    expect(formatFaderTickLabel(Number.NEGATIVE_INFINITY)).toBe("−∞");
  });
});

describe("peak hold latch", () => {
  it("latches max and clip above 0 dBFS", () => {
    let s = emptyPeakHold();
    s = updatePeakHold(s, -12);
    expect(s.holdDb).toBe(-12);
    expect(s.clipped).toBe(false);
    s = updatePeakHold(s, -6);
    expect(s.holdDb).toBe(-6);
    s = updatePeakHold(s, -20);
    expect(s.holdDb).toBe(-6);
    s = updatePeakHold(s, 0.5);
    expect(s.holdDb).toBe(0.5);
    expect(s.clipped).toBe(true);
    s = updatePeakHold(s, -30);
    expect(s.holdDb).toBe(0.5);
    expect(s.clipped).toBe(true);
  });

  it("0 dBFS is not clip; reset clears latch", () => {
    expect(isClipPeakDb(0)).toBe(false);
    expect(isClipPeakDb(0.01)).toBe(true);
    let s = updatePeakHold(emptyPeakHold(), 1);
    expect(s.clipped).toBe(true);
    s = emptyPeakHold();
    expect(s.holdDb).toBe(METER_DB_MIN);
    expect(s.clipped).toBe(false);
  });

  it("formats peak hold readout", () => {
    expect(formatPeakHoldDb(METER_DB_MIN)).toBe("−∞");
    expect(formatPeakHoldDb(-12.34)).toBe("-12.3");
    expect(formatPeakHoldDb(0)).toBe("0.0");
    expect(formatPeakHoldDb(1.25)).toBe("+1.3");
  });
});
