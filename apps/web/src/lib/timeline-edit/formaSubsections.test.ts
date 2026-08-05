import { describe, expect, it } from "vitest";
import {
  fill4BarGapsFromLeft,
  moveSubsectionBoundary,
  normalizeSubsectionOffsets,
  subsectionRanges,
} from "./formaSubsections.js";

const BAR = 3840; // 4/4 @ PPQ 960
const CHUNK4 = 4 * BAR;

describe("formaSubsections", () => {
  it("normalizeSubsectionOffsets drops 0 / length / duplicates", () => {
    expect(
      normalizeSubsectionOffsets([0, BAR, BAR, CHUNK4, 2 * CHUNK4], 2 * CHUNK4),
    ).toEqual([BAR, CHUNK4]);
  });

  it("subsectionRanges covers full clip from 0", () => {
    const ranges = subsectionRanges([BAR], 2 * BAR);
    expect(ranges).toEqual([
      { index: 0, startRel: 0, lengthRel: BAR },
      { index: 1, startRel: BAR, lengthRel: BAR },
    ]);
  });

  it("fill4BarGapsFromLeft splits spans longer than 4 bars", () => {
    // 8-bar clip, scissors at 1 bar → right span 7 bars → one fill at +4 bars
    const filled = fill4BarGapsFromLeft([BAR], 8 * BAR, CHUNK4);
    expect(filled).toEqual([BAR, BAR + CHUNK4]);
  });

  it("moveSubsectionBoundary drag right adds 4-bar fills on left span", () => {
    // 8-bar clip with mid boundary at 4 bars; drag to 6 bars
    const next = moveSubsectionBoundary(
      [CHUNK4],
      8 * BAR,
      1,
      6 * BAR,
      CHUNK4,
    );
    expect(next).toEqual([CHUNK4, 6 * BAR]);
  });

  it("moveSubsectionBoundary to neighbor edge merges + refill", () => {
    // 12-bar clip, boundaries at 4 and 8 bars; drag first interior to start → merge
    const next = moveSubsectionBoundary(
      [CHUNK4, 2 * CHUNK4],
      12 * BAR,
      1,
      0,
      CHUNK4,
    );
    expect(next).toEqual([CHUNK4, 2 * CHUNK4]);
  });

  it("moveSubsectionBoundary drag left fills from right", () => {
    // 8-bar clip, boundary at 4 bars; drag left to 2 bars → fill remaining right span
    const next = moveSubsectionBoundary(
      [CHUNK4],
      8 * BAR,
      1,
      2 * BAR,
      CHUNK4,
    );
    expect(next).not.toBeNull();
    expect(next).toContain(2 * BAR);
    expect(next!.some((t) => t > 2 * BAR)).toBe(true);
  });

  it("interior4BarStartsFromRight caps at 64 fills", () => {
    // Huge span with tiny chunk → hits 64-cap break
    const next = moveSubsectionBoundary([100], 10_000, 1, 50, 1);
    expect(next).not.toBeNull();
    expect(next!.length).toBeLessThanOrEqual(64);
  });

});
