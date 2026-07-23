import { describe, expect, it } from "vitest";
import {
  DEFAULT_PPQ,
  absBeatToTicks,
  assertValidTimeSignature,
  bbtToTicks,
  elapsedToTicks,
  fromDisplayBar,
  quartersToTicks,
  ticksPerBar,
  ticksPerMs,
  ticksToBbt,
  ticksToMs,
  ticksToQuarters,
  toDisplayBar,
  type TimeSignature,
} from "./time.js";

const TS_4_4: TimeSignature = { numerator: 4, denominator: 4 };
const TS_5_8: TimeSignature = { numerator: 5, denominator: 8 };
const TS_7_8: TimeSignature = { numerator: 7, denominator: 8 };
const TS_9_8: TimeSignature = { numerator: 9, denominator: 8 };
const TS_12_8: TimeSignature = { numerator: 12, denominator: 8 };

describe("DEFAULT_PPQ", () => {
  it("is 960", () => {
    expect(DEFAULT_PPQ).toBe(960);
  });
});

describe("ticksPerBar", () => {
  it("computes integer ticks for 4/4, 5/8, 7/8, 9/8, 12/8", () => {
    expect(ticksPerBar(TS_4_4)).toBe(4 * DEFAULT_PPQ); // 3840
    expect(ticksPerBar(TS_5_8)).toBe(5 * ((DEFAULT_PPQ * 4) / 8)); // 2400
    expect(ticksPerBar(TS_7_8)).toBe(7 * ((DEFAULT_PPQ * 4) / 8)); // 3360
    expect(ticksPerBar(TS_9_8)).toBe(9 * ((DEFAULT_PPQ * 4) / 8)); // 4320
    expect(ticksPerBar(TS_12_8)).toBe(12 * ((DEFAULT_PPQ * 4) / 8)); // 5760
  });

  it("throws when ticksPerBar would not be an integer", () => {
    expect(() =>
      ticksPerBar({ numerator: 4, denominator: 7 }, DEFAULT_PPQ),
    ).toThrow(RangeError);
  });

  it("throws for invalid meters", () => {
    expect(() => ticksPerBar({ numerator: 0, denominator: 4 })).toThrow(
      RangeError,
    );
    expect(() => ticksPerBar({ numerator: 4, denominator: -4 })).toThrow(
      RangeError,
    );
    expect(() =>
      assertValidTimeSignature({ numerator: 1.5, denominator: 4 }),
    ).toThrow(RangeError);
  });
});

describe("ticksToBbt / bbtToTicks — 4/4", () => {
  const perBar = ticksPerBar(TS_4_4);

  it("maps bar boundaries", () => {
    expect(ticksToBbt(0, TS_4_4)).toEqual({ bar: 0, beat: 1, tick: 0 });
    expect(ticksToBbt(perBar, TS_4_4)).toEqual({ bar: 1, beat: 1, tick: 0 });
    expect(ticksToBbt(perBar - 1, TS_4_4)).toEqual({
      bar: 0,
      beat: 4,
      tick: DEFAULT_PPQ - 1,
    });
  });

  it("round-trips across bar edges", () => {
    for (const t of [0, 1, DEFAULT_PPQ, perBar - 1, perBar, perBar + 1]) {
      const bbt = ticksToBbt(t, TS_4_4);
      expect(bbtToTicks(bbt.bar, bbt.beat, bbt.tick, TS_4_4)).toBe(t);
    }
  });

  it("rejects beat outside meter (M3)", () => {
    expect(() => bbtToTicks(0, 0, 0, TS_4_4)).toThrow(RangeError);
    expect(() => bbtToTicks(0, 5, 0, TS_4_4)).toThrow(RangeError);
    expect(() => bbtToTicks(0, 1, DEFAULT_PPQ, TS_4_4)).toThrow(RangeError);
  });
});

describe("ticksToBbt / bbtToTicks — 5/8 and 7/8", () => {
  it("5/8: ticksPerBar and round-trip without float drift", () => {
    const perBar = ticksPerBar(TS_5_8);
    expect(perBar).toBe(2400);
    expect(Number.isInteger(perBar)).toBe(true);

    const mid = perBar + 480 + 100; // bar 1, beat 2, tick 100
    const bbt = ticksToBbt(mid, TS_5_8);
    expect(bbt).toEqual({ bar: 1, beat: 2, tick: 100 });
    expect(bbtToTicks(bbt.bar, bbt.beat, bbt.tick, TS_5_8)).toBe(mid);
  });

  it("7/8: round-trip at bar boundary", () => {
    const perBar = ticksPerBar(TS_7_8);
    expect(perBar).toBe(3360);
    expect(ticksToBbt(perBar, TS_7_8)).toEqual({ bar: 1, beat: 1, tick: 0 });
    expect(bbtToTicks(1, 1, 0, TS_7_8)).toBe(perBar);
  });

  it("9/8 and 12/8: integer ticksPerBar and mid-bar round-trip", () => {
    expect(ticksPerBar(TS_9_8)).toBe(4320);
    expect(ticksPerBar(TS_12_8)).toBe(5760);
    for (const ts of [TS_9_8, TS_12_8]) {
      const perBar = ticksPerBar(ts);
      const mid = Math.floor(perBar / 2);
      const bbt = ticksToBbt(mid, ts);
      expect(bbtToTicks(bbt.bar, bbt.beat, bbt.tick, ts)).toBe(mid);
    }
  });
});

describe("negative ticks (pre-roll) — floorDiv + euclidMod", () => {
  const perBar = ticksPerBar(TS_4_4);
  const perBeat = DEFAULT_PPQ;

  it("last tick before bar 0 stays in bar -1 with positive beat/tick", () => {
    const bbt = ticksToBbt(-1, TS_4_4);
    expect(bbt.bar).toBe(-1);
    expect(bbt.beat).toBe(4);
    expect(bbt.tick).toBe(perBeat - 1);
    expect(bbt.beat).toBeGreaterThan(0);
    expect(bbt.tick).toBeGreaterThanOrEqual(0);
  });

  it("start of pre-roll bar maps to beat 1 tick 0", () => {
    expect(ticksToBbt(-perBar, TS_4_4)).toEqual({
      bar: -1,
      beat: 1,
      tick: 0,
    });
  });

  it("round-trips for negative ticks", () => {
    for (const t of [-1, -perBeat, -perBar, -perBar - 1, -2 * perBar + 3]) {
      const bbt = ticksToBbt(t, TS_4_4);
      expect(bbt.beat).toBeGreaterThan(0);
      expect(bbt.tick).toBeGreaterThanOrEqual(0);
      expect(bbtToTicks(bbt.bar, bbt.beat, bbt.tick, TS_4_4)).toBe(t);
    }
  });

  it("euclidMod semantics: remainder never negative for axis offset", () => {
    // If JS % were used raw, -5 % 4 === -1; we must land in [0, perBar).
    const bbt = ticksToBbt(-5, TS_4_4);
    expect(bbt.tick).toBeGreaterThanOrEqual(0);
    expect(bbt.tick).toBeLessThan(perBeat);
    expect(bbt.beat).toBeGreaterThanOrEqual(1);
    expect(bbt.beat).toBeLessThanOrEqual(4);
  });
});

describe("display bar", () => {
  it("ticks 0 → display bar 1", () => {
    const { bar } = ticksToBbt(0, TS_4_4);
    expect(toDisplayBar(bar)).toBe(1);
    expect(fromDisplayBar(1)).toBe(0);
  });

  it("last pre-roll tick → display bar 0", () => {
    const { bar } = ticksToBbt(-1, TS_4_4);
    expect(bar).toBe(-1);
    expect(toDisplayBar(bar)).toBe(0);
  });

  it("tick in second pre-roll bar → display -1", () => {
    const perBar = ticksPerBar(TS_4_4);
    const { bar } = ticksToBbt(-perBar - 1, TS_4_4);
    expect(bar).toBe(-2);
    expect(toDisplayBar(bar)).toBe(-1);
  });
});

describe("quartersToTicks / ticksToQuarters", () => {
  it("converts integer quarters without float", () => {
    expect(quartersToTicks(1)).toBe(DEFAULT_PPQ);
    expect(quartersToTicks(4)).toBe(4 * DEFAULT_PPQ);
    expect(ticksToQuarters(DEFAULT_PPQ)).toBe(1);
    expect(ticksToQuarters(-1)).toBe(-1); // floor toward −∞
  });
});

describe("elapsedToTicks / ticksPerMs", () => {
  it("maps one beat at 120 BPM 4/4 to DEFAULT_PPQ ticks", () => {
    // 120 BPM → 500 ms per quarter; one beat = DEFAULT_PPQ ticks
    expect(elapsedToTicks(500, 120, TS_4_4)).toBe(DEFAULT_PPQ);
    expect(ticksPerMs(120, TS_4_4)).toBe(DEFAULT_PPQ / 500);
  });

  it("floors partial beats", () => {
    expect(elapsedToTicks(250, 120, TS_4_4)).toBe(DEFAULT_PPQ / 2);
    expect(elapsedToTicks(499, 120, TS_4_4)).toBe(
      Math.floor(499 * (DEFAULT_PPQ / 500)),
    );
  });

  it("ticksToMs is inverse of ticksPerMs", () => {
    expect(ticksToMs(DEFAULT_PPQ, 120, TS_4_4)).toBe(500);
    expect(ticksToMs(0, 120, TS_4_4)).toBe(0);
  });

  it.each([
    { bpm: 0 },
    { bpm: -1 },
    { bpm: Number.NaN },
    { bpm: Number.POSITIVE_INFINITY },
  ] as const)("ticksPerMs rejects bpm=$bpm", ({ bpm }) => {
    expect(() => ticksPerMs(bpm, TS_4_4)).toThrow(/bpm must be a finite number > 0/);
  });

  it.each([
    { elapsedMs: Number.NaN, bpm: 120, re: /elapsedMs must be finite/ },
    {
      elapsedMs: Number.POSITIVE_INFINITY,
      bpm: 120,
      re: /elapsedMs must be finite/,
    },
    { elapsedMs: 500, bpm: 0, re: /bpm must be a finite number > 0/ },
  ] as const)("elapsedToTicks rejects invalid input", ({ elapsedMs, bpm, re }) => {
    expect(() => elapsedToTicks(elapsedMs, bpm, TS_4_4)).toThrow(re);
  });

  it.each([
    { ticks: Number.NaN },
    { ticks: Number.POSITIVE_INFINITY },
  ] as const)("ticksToMs rejects non-finite ticks ($ticks)", ({ ticks }) => {
    expect(() => ticksToMs(ticks, 120, TS_4_4)).toThrow(/ticks must be finite/);
  });
});

describe("ticksToBbt / display / quarters / absBeat guards", () => {
  it.each([
    { ticks: Number.NaN },
    { ticks: 1.5 },
    { ticks: Number.POSITIVE_INFINITY },
  ] as const)("ticksToBbt rejects non-int ticks ($ticks)", ({ ticks }) => {
    expect(() => ticksToBbt(ticks, TS_4_4)).toThrow(/ticks must be a finite integer/);
  });

  it.each([
    { bar: Number.NaN, beat: 1, tick: 0 },
    { bar: 0, beat: 1.5, tick: 0 },
    { bar: 0, beat: 1, tick: Number.NaN },
  ] as const)("bbtToTicks rejects non-int BBT", ({ bar, beat, tick }) => {
    expect(() => bbtToTicks(bar, beat, tick, TS_4_4)).toThrow(
      /bar, beat, and tick must be finite integers/,
    );
  });

  it.each([
    { bar: Number.NaN },
    { bar: Number.POSITIVE_INFINITY },
  ] as const)("toDisplayBar rejects non-finite bar ($bar)", ({ bar }) => {
    expect(() => toDisplayBar(bar)).toThrow(/bar must be finite/);
  });

  it.each([
    { displayBar: Number.NaN },
    { displayBar: Number.NEGATIVE_INFINITY },
  ] as const)("fromDisplayBar rejects non-finite ($displayBar)", ({
    displayBar,
  }) => {
    expect(() => fromDisplayBar(displayBar)).toThrow(/displayBar must be finite/);
  });

  it.each([
    { quarters: 1.5, ppq: DEFAULT_PPQ },
    { quarters: Number.NaN, ppq: DEFAULT_PPQ },
    { quarters: 1, ppq: 0 },
    { quarters: 1, ppq: 960.5 },
  ] as const)("quartersToTicks rejects invalid quarters/ppq", ({
    quarters,
    ppq,
  }) => {
    expect(() => quartersToTicks(quarters, ppq)).toThrow(RangeError);
  });

  it.each([
    { ticks: 1.5, ppq: DEFAULT_PPQ },
    { ticks: Number.NaN, ppq: DEFAULT_PPQ },
    { ticks: DEFAULT_PPQ, ppq: 0 },
  ] as const)("ticksToQuarters rejects invalid ticks/ppq", ({ ticks, ppq }) => {
    expect(() => ticksToQuarters(ticks, ppq)).toThrow(RangeError);
  });

  it.each([
    { absBeat: Number.NaN, ppq: DEFAULT_PPQ, re: /absBeat must be finite/ },
    {
      absBeat: Number.POSITIVE_INFINITY,
      ppq: DEFAULT_PPQ,
      re: /absBeat must be finite/,
    },
    { absBeat: 1, ppq: 0, re: /ppq must be a positive integer/ },
    { absBeat: 1, ppq: 1.5, re: /ppq must be a positive integer/ },
  ] as const)("absBeatToTicks rejects invalid input", ({ absBeat, ppq, re }) => {
    expect(() => absBeatToTicks(absBeat, ppq)).toThrow(re);
  });
});
