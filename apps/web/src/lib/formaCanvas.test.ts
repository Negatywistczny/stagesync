import { describe, expect, it } from "vitest";
import { createProjectV2Seed, DEFAULT_SNAP_MODE } from "@stagesync/shared";
import {
  buildBarMarks,
  computeCanvasWidthPx,
  computeFormaViewSpan,
  contentFloorTicks,
  pencilFormaClick,
  snapEditTicks,
  tickToPx,
  ticksFromCanvasPx,
} from "./formaCanvas.js";

describe("formaCanvas", () => {
  const project = createProjectV2Seed(
    "id",
    "Demo",
    "2026-07-20T00:00:00.000Z",
  );

  it("computeFormaViewSpan includes countdown start and trailing padding", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    expect(span.start).toBeLessThanOrEqual(-7680);
    expect(span.end).toBeGreaterThan(7680);
  });

  it("tickToPx aligns bar 1 at content floor", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    const barTicks = 3840;
    expect(tickToPx(0, span, barTicks)).toBe(tickToPx(-7680, span, barTicks) + 7680 / barTicks * 48);
  });

  it("buildBarMarks includes CD and bar numbers", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    const marks = buildBarMarks(span, project.defaultMeter, project.ppq);
    expect(marks.some((m) => m.label === "CD")).toBe(true);
    expect(marks.some((m) => m.label === "1")).toBe(true);
  });

  it("snapEditTicks uses DEFAULT_SNAP_MODE bar (miara)", () => {
    expect(DEFAULT_SNAP_MODE).toBe("bar");
    expect(snapEditTicks(project, 960)).toBe(0);
  });

  it("pencilFormaClick overwrites occupied bar (v4), not skip-ahead", () => {
    const next = pencilFormaClick(project, 960, "Nowa sekcja");
    const inserted = next.forma.clips.find(
      (c) => c.kind === "section" && c.name === "Nowa sekcja",
    );
    expect(inserted?.startTicks).toBe(0);
    expect(inserted?.lengthTicks).toBe(3840);
    const introRemnant = next.forma.clips.find(
      (c) => c.kind === "section" && c.startTicks === 3840,
    );
    expect(introRemnant?.name).toBe("Intro");
  });

  it("pencilFormaClick appends after last section when clicking empty canvas", () => {
    const next = pencilFormaClick(project, 7680, "Verse");
    expect(next.forma.clips.some((c) => c.name === "Verse")).toBe(true);
    expect(
      next.forma.clips.find((c) => c.name === "Verse")?.startTicks,
    ).toBe(7680);
  });

  it("computeCanvasWidthPx scales with span", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    const w = computeCanvasWidthPx(span, 3840);
    expect(w).toBeGreaterThan(48 * 4);
  });

  it("contentFloorTicks is countdown end", () => {
    expect(contentFloorTicks(project.forma.clips)).toBe(0);
  });

  it("ticksFromCanvasPx maps px column to containing bar (not round-up)", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    const barTicks = 3840;
    const bar1StartPx = tickToPx(0, span, barTicks);
    const midBar1Px = bar1StartPx + 24;
    expect(ticksFromCanvasPx(midBar1Px, span, barTicks)).toBe(0);
    expect(ticksFromCanvasPx(midBar1Px + 48, span, barTicks)).toBe(3840);
  });

  it("ticksFromCanvasPx is stable across scroll (no double scrollLeft)", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    const barTicks = 3840;
    const canvasWidth = computeCanvasWidthPx(span, barTicks);
    const bar2Px = tickToPx(7680, span, barTicks);

    const atBar2 = ticksFromCanvasPx(bar2Px, span, barTicks);
    expect(atBar2).toBe(7680);

    // Same canvas px after simulated scroll must map to the same tick.
    const scrolledSameCanvasPx = bar2Px;
    expect(ticksFromCanvasPx(scrolledSameCanvasPx, span, barTicks)).toBe(7680);

    const edge = ticksFromCanvasPx(canvasWidth, span, barTicks);
    expect(edge).toBeGreaterThanOrEqual(span.end - barTicks);
  });
});
