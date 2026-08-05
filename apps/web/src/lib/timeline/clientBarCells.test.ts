import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import { barsInTickRange, buildBarCellsForClip } from "./clientBarCells.js";

describe("clientBarCells", () => {
  const project = createProjectV5Seed(
    "p",
    "S",
    "2026-07-23T00:00:00.000Z",
  );

  it("barsInTickRange returns empty for non-positive span", () => {
    expect(barsInTickRange(project, 100, 100)).toEqual([]);
    expect(barsInTickRange(project, 200, 100)).toEqual([]);
  });

  it("barsInTickRange clips song-body bars to the requested window", () => {
    const bars = barsInTickRange(project, 1000, 5000);
    expect(bars.length).toBeGreaterThan(0);
    expect(bars[0]!.startTicks).toBeGreaterThanOrEqual(1000);
    expect(bars[bars.length - 1]!.endTicks).toBeLessThanOrEqual(5000);
  });

  it("barsInTickRange includes pre-roll then body", () => {
    const bars = barsInTickRange(project, -3840, 3840);
    expect(bars.some((b) => b.startTicks < 0)).toBe(true);
    expect(bars.some((b) => b.startTicks >= 0)).toBe(true);
  });

  it("buildBarCellsForClip indexes from 1 and reports beat progress", () => {
    const cells = buildBarCellsForClip(project, 0, 7680, 480);
    expect(cells[0]!.index).toBe(1);
    expect(cells[0]!.current).toBe(true);
    expect(cells[0]!.beatProgress).toBeCloseTo(480 / 3840);
    expect(cells[1]!.beatProgress).toBe(0);
  });

  it("beatProgress is 0 outside cell and for non-positive span", () => {
    const past = buildBarCellsForClip(project, 0, 7680, -100);
    expect(past.every((c) => c.beatProgress === 0 || c.past)).toBe(true);
    const cells = buildBarCellsForClip(project, 0, 7680, 9000);
    expect(cells.every((c) => !c.current || c.beatProgress >= 0)).toBe(true);
  });
});
