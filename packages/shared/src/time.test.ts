import { describe, expect, it } from "vitest";
import { absBeatToBarBeat, barBeatToAbsBeat } from "./time.js";

describe("absBeatToBarBeat", () => {
  it("handles 4/4", () => {
    expect(absBeatToBarBeat(0, { numerator: 4, denominator: 4 })).toEqual({
      bar: 0,
      beatInBar: 0,
    });
    expect(absBeatToBarBeat(4, { numerator: 4, denominator: 4 })).toEqual({
      bar: 1,
      beatInBar: 0,
    });
  });

  it("handles odd meters without rounding", () => {
    expect(absBeatToBarBeat(5.5, { numerator: 5, denominator: 8 })).toEqual({
      bar: 1,
      beatInBar: 0.5,
    });
    expect(absBeatToBarBeat(7, { numerator: 7, denominator: 8 })).toEqual({
      bar: 1,
      beatInBar: 0,
    });
  });
});

describe("barBeatToAbsBeat", () => {
  it("round-trips with absBeatToBarBeat", () => {
    const ts = { numerator: 5, denominator: 8 };
    const abs = 12.25;
    const { bar, beatInBar } = absBeatToBarBeat(abs, ts);
    expect(barBeatToAbsBeat(bar, beatInBar, ts)).toBe(abs);
  });
});
