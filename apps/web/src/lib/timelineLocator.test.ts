import { describe, expect, it } from "vitest";
import { createProjectV5Seed, type TransportLoop } from "@stagesync/shared";
import {
  snapLoopRange,
  ticksInLoopRegion,
  transportStateFromTick,
  usableLoopRange,
} from "./timelineLocator.js";

describe("timelineLocator", () => {
  it("ticksInLoopRegion is inclusive start / exclusive end", () => {
    const range = { startTicks: 1920, endTicks: 7680 };
    expect(ticksInLoopRegion(1920, range)).toBe(true);
    expect(ticksInLoopRegion(7679, range)).toBe(true);
    expect(ticksInLoopRegion(7680, range)).toBe(false);
    expect(ticksInLoopRegion(0, range)).toBe(false);
  });

  it("usableLoopRange rejects empty", () => {
    expect(usableLoopRange(null)).toBeNull();
    expect(
      usableLoopRange({
        enabled: true,
        startTicks: 10,
        endTicks: 10,
      }),
    ).toBeNull();
    expect(
      usableLoopRange({
        enabled: false,
        startTicks: 0,
        endTicks: 100,
      }),
    ).toEqual({ startTicks: 0, endTicks: 100 });
  });

  it("snapLoopRange snaps to beat grid (v4 quantizeAbsBeat)", () => {
    const project = createProjectV5Seed(
      "id",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    const range = snapLoopRange(project, 500, 5000);
    expect(range.startTicks).toBe(960);
    expect(range.endTicks).toBe(4800);
  });

  it("transportStateFromTick preserves loop", () => {
    const loop: TransportLoop = {
      enabled: true,
      startTicks: 0,
      endTicks: 3840,
    };
    const state = transportStateFromTick({
      playing: true,
      positionTicks: 100,
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq: 960,
      activeProjectId: null,
      loop,
    });
    expect(state.loop).toEqual(loop);
  });

  it("transportStateFromTick defaults missing loop to null", () => {
    const state = transportStateFromTick({
      playing: false,
      positionTicks: 0,
      bpm: 120,
      timeSignature: { numerator: 4, denominator: 4 },
      ppq: 960,
    });
    expect(state.loop).toBeNull();
  });
});
