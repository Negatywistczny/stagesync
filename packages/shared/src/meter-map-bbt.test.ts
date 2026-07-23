import { describe, expect, it } from "vitest";
import {
  bbtToTicksAlongMeterMap,
  ticksToBbtAlongMeterMap,
} from "./meter-map-bbt.js";
import { DEFAULT_PPQ, ticksPerBar } from "./time.js";

const TS_4_4 = { numerator: 4, denominator: 4 };
const TS_5_8 = { numerator: 5, denominator: 8 };

describe("ticksToBbtAlongMeterMap", () => {
  it("matches constant-meter ticksToBbt when map is empty", () => {
    const perBar = ticksPerBar(TS_4_4, DEFAULT_PPQ);
    expect(ticksToBbtAlongMeterMap(0, TS_4_4, [])).toEqual({
      bar: 0,
      beat: 1,
      tick: 0,
    });
    expect(ticksToBbtAlongMeterMap(perBar, TS_4_4, [])).toEqual({
      bar: 1,
      beat: 1,
      tick: 0,
    });
  });

  it("walks into 5/8 after two bars of 4/4", () => {
    const bar4 = ticksPerBar(TS_4_4, DEFAULT_PPQ);
    const bar5 = ticksPerBar(TS_5_8, DEFAULT_PPQ);
    const map = [
      { startTicks: 0, numerator: 4, denominator: 4 },
      { startTicks: bar4 * 2, numerator: 5, denominator: 8 },
    ];
    // Start of first 5/8 bar = math bar 2
    expect(ticksToBbtAlongMeterMap(bar4 * 2, TS_4_4, map)).toEqual({
      bar: 2,
      beat: 1,
      tick: 0,
    });
    // One local 5/8 beat into that bar
    const localBeat = (DEFAULT_PPQ * 4) / 8;
    expect(
      ticksToBbtAlongMeterMap(bar4 * 2 + localBeat, TS_4_4, map),
    ).toEqual({
      bar: 2,
      beat: 2,
      tick: 0,
    });
    expect(ticksToBbtAlongMeterMap(bar4 * 2 + bar5, TS_4_4, map)).toEqual({
      bar: 3,
      beat: 1,
      tick: 0,
    });
  });

  it("round-trips with bbtToTicksAlongMeterMap", () => {
    const bar4 = ticksPerBar(TS_4_4, DEFAULT_PPQ);
    const map = [
      { startTicks: 0, numerator: 4, denominator: 4 },
      { startTicks: bar4 * 2, numerator: 5, denominator: 8 },
    ];
    for (const bar of [0, 1, 2, 3]) {
      const beat = bar >= 2 ? 3 : 2;
      const ticks = bbtToTicksAlongMeterMap(bar, beat, 0, TS_4_4, map);
      expect(ticksToBbtAlongMeterMap(ticks, TS_4_4, map)).toEqual({
        bar,
        beat,
        tick: 0,
      });
    }
  });

  it.each([
    { ticks: Number.NaN },
    { ticks: 1.5 },
    { ticks: Number.POSITIVE_INFINITY },
  ] as const)("ticksToBbtAlongMeterMap rejects non-int ticks ($ticks)", ({
    ticks,
  }) => {
    expect(() => ticksToBbtAlongMeterMap(ticks, TS_4_4, [])).toThrow(
      /ticks must be a finite integer/,
    );
  });

  it.each([
    { bar: Number.NaN, beat: 1, tick: 0 },
    { bar: 0, beat: 1.5, tick: 0 },
    { bar: 0, beat: 1, tick: Number.POSITIVE_INFINITY },
    { bar: 0.5, beat: 1, tick: 0 },
  ] as const)(
    "bbtToTicksAlongMeterMap rejects non-int BBT ($bar.$beat.$tick)",
    ({ bar, beat, tick }) => {
      expect(() =>
        bbtToTicksAlongMeterMap(bar, beat, tick, TS_4_4, []),
      ).toThrow(/bar, beat, and tick must be finite integers/);
    },
  );

  it("uses constant-meter helpers for pre-roll (negative bar/ticks)", () => {
    expect(ticksToBbtAlongMeterMap(-DEFAULT_PPQ, TS_4_4, [])).toEqual({
      bar: -1,
      beat: 4,
      tick: 0,
    });
    expect(bbtToTicksAlongMeterMap(-1, 1, 0, TS_4_4, [])).toBe(
      -ticksPerBar(TS_4_4, DEFAULT_PPQ),
    );
  });

});
