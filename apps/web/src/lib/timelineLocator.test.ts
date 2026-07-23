import { describe, expect, it } from "vitest";
import { createProjectV5Seed, type TransportLoop } from "@stagesync/shared";
import {
  moveLoopRange,
  snapLoopRange,
  snapMovedLoopRange,
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

  it("moveLoopRange preserves duration", () => {
    expect(moveLoopRange({ startTicks: 1920, endTicks: 7680 }, -960)).toEqual({
      startTicks: 960,
      endTicks: 6720,
    });
  });

  it("snapMovedLoopRange snaps start and keeps duration", () => {
    const project = createProjectV5Seed(
      "id",
      "Demo",
      "2026-07-20T00:00:00.000Z",
    );
    const range = snapMovedLoopRange(
      project,
      { startTicks: 1920, endTicks: 5760 },
      500,
    );
    expect(range.startTicks).toBe(2880);
    expect(range.endTicks - range.startTicks).toBe(3840);
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

  it("ticksInLoopRegion rejects non-finite / inverted ranges", () => {
    expect(ticksInLoopRegion(Number.NaN, { startTicks: 0, endTicks: 10 })).toBe(false);
    expect(ticksInLoopRegion(5, { startTicks: 10, endTicks: 0 })).toBe(false);
    expect(ticksInLoopRegion(5, null)).toBe(false);
  });

  it("snapLoopRange expands collapsed drag and falls back to ppq", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-23T00:00:00.000Z");
    const collapsed = snapLoopRange(p, 0, 0, "bar");
    expect(collapsed.endTicks).toBeGreaterThan(collapsed.startTicks);
    const off = snapLoopRange(p, 100, 100, "off");
    expect(off.endTicks).toBeGreaterThan(off.startTicks);
  });

  it("snapMovedLoopRange off preserves raw move", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-23T00:00:00.000Z");
    const moved = snapMovedLoopRange(
      p,
      { startTicks: 0, endTicks: 960 },
      100,
      "off",
    );
    expect(moved).toEqual({ startTicks: 100, endTicks: 1060 });
  });

});
