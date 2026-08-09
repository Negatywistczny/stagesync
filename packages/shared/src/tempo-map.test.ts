import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "./project-seed.js";
import {
  advanceTicksAlongTempoMap,
  secondsToTicks,
  secondsToTicksAlongMap,
  ticksToMsAlongTempoMap,
  ticksToSeconds,
  ticksToSecondsAlongMap,
} from "./tempo-map.js";
import { DEFAULT_PPQ, elapsedToTicks, ticksToMs } from "./time.js";

const METER = { numerator: 4, denominator: 4 } as const;

describe("ticksToMsAlongTempoMap", () => {
  it("matches constant-tempo ticksToMs", () => {
    const p = createProjectV5Seed("a", "S", "2026-07-20T00:00:00.000Z");
    p.defaultBpm = 120;
    p.tempoMap = [{ id: "t0", startTicks: 0, bpm: 120 }];
    const ms = ticksToMsAlongTempoMap(0, 1920, p);
    expect(ms).toBeCloseTo(ticksToMs(1920, 120, p.defaultMeter, p.ppq), 5);
  });

  it("slows after a mid-span tempo drop", () => {
    const p = createProjectV5Seed("a", "S", "2026-07-20T00:00:00.000Z");
    p.defaultBpm = 120;
    p.tempoMap = [
      { id: "t0", startTicks: 0, bpm: 120 },
      { id: "t1", startTicks: 1920, bpm: 60 },
    ];
    const halfFast = ticksToMs(1920, 120, p.defaultMeter, p.ppq);
    const halfSlow = ticksToMs(1920, 60, p.defaultMeter, p.ppq);
    const ms = ticksToMsAlongTempoMap(0, 3840, p);
    expect(ms).toBeCloseTo(halfFast + halfSlow, 5);
  });

  it.each([
    { from: Number.NaN, to: 100 },
    { from: 0, to: Number.NaN },
    { from: Number.POSITIVE_INFINITY, to: 100 },
    { from: 0, to: Number.NEGATIVE_INFINITY },
  ] as const)("rejects non-finite ticks ($from → $to)", ({ from, to }) => {
    const p = createProjectV5Seed("a", "S", "2026-07-20T00:00:00.000Z");
    expect(() => ticksToMsAlongTempoMap(from, to, p)).toThrow(
      /ticks must be finite/,
    );
  });

  it("returns 0 for equal endpoints and negates reverse spans", () => {
    const p = createProjectV5Seed("a", "S", "2026-07-20T00:00:00.000Z");
    p.defaultBpm = 100;
    p.tempoMap = [{ id: "t0", startTicks: 0, bpm: 100 }];
    expect(ticksToMsAlongTempoMap(1920, 1920, p)).toBe(0);
    const forward = ticksToMsAlongTempoMap(0, 1920, p);
    const backward = ticksToMsAlongTempoMap(1920, 0, p);
    expect(forward).toBeGreaterThan(0);
    expect(backward).toBeCloseTo(-forward, 5);
  });

  it("splits on mid-span meter changes (same BPM)", () => {
    const p = createProjectV5Seed("a", "S", "2026-07-20T00:00:00.000Z");
    p.defaultBpm = 120;
    p.defaultMeter = { numerator: 4, denominator: 4 };
    p.tempoMap = [{ id: "t0", startTicks: 0, bpm: 120 }];
    p.meterMap = [
      { id: "m0", startTicks: 0, numerator: 4, denominator: 4 },
      { id: "m1", startTicks: 1920, numerator: 3, denominator: 4 },
    ];
    const first = ticksToMs(1920, 120, { numerator: 4, denominator: 4 }, p.ppq);
    const second = ticksToMs(
      1920,
      120,
      { numerator: 3, denominator: 4 },
      p.ppq,
    );
    expect(ticksToMsAlongTempoMap(0, 3840, p)).toBeCloseTo(first + second, 5);
  });
});

describe("ticksToSeconds / secondsToTicks", () => {
  it("round-trips constant tempo", () => {
    const map = [{ startTicks: 0, bpm: 120 }];
    const ticks = 4 * DEFAULT_PPQ;
    const sec = ticksToSeconds(ticks, map, 120, METER, DEFAULT_PPQ);
    expect(sec).toBeCloseTo(2, 6);
    expect(secondsToTicks(sec, map, 120, METER, DEFAULT_PPQ)).toBe(ticks);
  });

  it("round-trips multi-event tempo map", () => {
    const map = [
      { startTicks: 0, bpm: 120 },
      { startTicks: 1920, bpm: 60 },
      { startTicks: 3840, bpm: 180 },
    ];
    for (const ticks of [0, 960, 1920, 2880, 3840, 4800, 7680]) {
      const sec = ticksToSeconds(ticks, map, 120, METER, DEFAULT_PPQ);
      const back = secondsToTicks(sec, map, 120, METER, DEFAULT_PPQ);
      expect(back).toBe(ticks);
    }
  });

  it("matches elapsedToTicks under a single-event map", () => {
    const map = [{ startTicks: 0, bpm: 90 }];
    const ms = 1500;
    expect(secondsToTicks(ms / 1000, map, 90, METER, DEFAULT_PPQ)).toBe(
      elapsedToTicks(ms, 90, METER, DEFAULT_PPQ),
    );
  });

  it("handles negative pre-roll seconds", () => {
    const map = [{ startTicks: 0, bpm: 120 }];
    const ticks = secondsToTicks(-0.5, map, 120, METER, DEFAULT_PPQ);
    expect(ticks).toBe(-DEFAULT_PPQ);
    expect(ticksToSeconds(ticks, map, 120, METER, DEFAULT_PPQ)).toBeCloseTo(
      -0.5,
      6,
    );
  });

  it("rejects non-finite seconds / ticks", () => {
    const map = [{ startTicks: 0, bpm: 120 }];
    expect(() => secondsToTicks(Number.NaN, map, 120)).toThrow(/finite/);
    expect(() => ticksToSeconds(Number.POSITIVE_INFINITY, map, 120)).toThrow(
      /finite/,
    );
  });
});

describe("AlongMap helpers + advanceTicksAlongTempoMap", () => {
  it("project helpers match free-arg API for constant map", () => {
    const p = createProjectV5Seed("a", "S", "2026-07-20T00:00:00.000Z");
    p.defaultBpm = 100;
    p.tempoMap = [{ id: "t0", startTicks: 0, bpm: 100 }];
    const ticks = 2 * DEFAULT_PPQ;
    expect(ticksToSecondsAlongMap(ticks, p)).toBeCloseTo(
      ticksToSeconds(ticks, p.tempoMap, 100, p.defaultMeter, p.ppq),
      8,
    );
    const sec = ticksToSecondsAlongMap(ticks, p);
    expect(secondsToTicksAlongMap(sec, p)).toBe(ticks);
  });

  it("advanceTicksAlongTempoMap crosses a tempo drop without drift", () => {
    const p = createProjectV5Seed("a", "S", "2026-07-20T00:00:00.000Z");
    p.defaultBpm = 120;
    p.tempoMap = [
      { id: "t0", startTicks: 0, bpm: 120 },
      { id: "t1", startTicks: 1920, bpm: 60 },
    ];
    // 1s @ 120 → 1920 ticks; next 1s @ 60 → +960 ticks → 2880
    const halfFastMs = ticksToMs(1920, 120, p.defaultMeter, p.ppq);
    const halfSlowMs = ticksToMs(960, 60, p.defaultMeter, p.ppq);
    expect(advanceTicksAlongTempoMap(0, halfFastMs + halfSlowMs, p)).toBe(2880);
    // Constant-BPM engine would wrongly stay at 120 for the whole 1.5s.
    const flatWrong = elapsedToTicks(
      halfFastMs + halfSlowMs,
      120,
      p.defaultMeter,
      p.ppq,
    );
    expect(flatWrong).not.toBe(2880);
  });
});
