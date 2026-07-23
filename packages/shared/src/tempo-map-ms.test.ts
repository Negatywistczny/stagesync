import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "./project-seed.js";
import { ticksToMsAlongTempoMap } from "./tempo-map-ms.js";
import { ticksToMs } from "./time.js";

describe("ticksToMsAlongTempoMap", () => {
  it("matches constant-tempo ticksToMs", () => {
    const p = createProjectV5Seed("a", "S", "2026-07-20T00:00:00.000Z");
    p.defaultBpm = 120;
    p.tempoMap = [{ id: "t0", startTicks: 0, bpm: 120 }];
    const ms = ticksToMsAlongTempoMap(0, 1920, p);
    expect(ms).toBeCloseTo(
      ticksToMs(1920, 120, p.defaultMeter, p.ppq),
      5,
    );
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
});
