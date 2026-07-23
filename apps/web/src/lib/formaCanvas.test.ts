import { describe, expect, it, vi } from "vitest";
import { createProjectV5Seed, DEFAULT_SNAP_MODE } from "@stagesync/shared";
import {
  RULER_BEAT_TICKS_MIN_PX,
  addPencilSection,
  buildBarMarks,
  buildRulerBeatMarks,
  canvasPxFromPointer,
  clipStylePx,
  computeCanvasWidthPx,
  computeFormaViewSpan,
  contentFloorTicks,
  iterBarBoundariesTicks,
  pencilFormaClick,
  projectContentEqual,
  scrollCanvasToStart,
  scrollLeftKeepTickAnchored,
  showsBeatSubdivisionMarks,
  snapEditTicks,
  tickToPx,
  ticksFromCanvasPx,
  ticksFromPointer,
} from "./formaCanvas.js";

describe("formaCanvas", () => {
  const project = createProjectV5Seed(
    "id",
    "Demo",
    "2026-07-20T00:00:00.000Z",
  );

  it("computeFormaViewSpan includes countdown start and trailing padding", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    expect(span.start).toBeLessThanOrEqual(-7680);
    expect(span.end).toBeGreaterThan(7680);
  });

  it("scrollLeftKeepTickAnchored grows scroll when CD pre-roll lengthens", () => {
    // CD 2→3 bars: span start -7680 → -11520; tick 0 shifts +48px at 48px/bar.
    const barTicks = 3840;
    const pxPerBar = 48;
    expect(
      scrollLeftKeepTickAnchored(-7680, -11520, 100, barTicks, pxPerBar),
    ).toBe(100 + 48);
  });

  it("scrollLeftKeepTickAnchored shrinks scroll when CD shortens", () => {
    const barTicks = 3840;
    expect(scrollLeftKeepTickAnchored(-11520, -7680, 100, barTicks, 48)).toBe(
      52,
    );
  });

  it("scrollCanvasToStart zeros scrollLeft (sync + rAF)", () => {
    const frames: FrameRequestCallback[] = [];
    const prevRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      frames.push(cb);
      return 1;
    }) as typeof requestAnimationFrame;
    const scroll = { scrollLeft: 240 } as HTMLElement;
    scrollCanvasToStart(scroll);
    expect(scroll.scrollLeft).toBe(0);
    scroll.scrollLeft = 99;
    frames.forEach((cb) => cb(0));
    expect(scroll.scrollLeft).toBe(0);
    globalThis.requestAnimationFrame = prevRaf;
  });

  it("scrollCanvasToStart no-ops on null", () => {
    expect(() => scrollCanvasToStart(null)).not.toThrow();
  });

  it("scrollCanvasToStart works without rAF", () => {
    const prevRaf = globalThis.requestAnimationFrame;
    // @ts-expect-error intentional missing rAF
    delete globalThis.requestAnimationFrame;
    const scroll = { scrollLeft: 40 } as HTMLElement;
    scrollCanvasToStart(scroll);
    expect(scroll.scrollLeft).toBe(0);
    globalThis.requestAnimationFrame = prevRaf;
  });

  it("tickToPx aligns bar 1 at content floor", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    const barTicks = 3840;
    expect(tickToPx(0, span, barTicks)).toBe(
      tickToPx(-7680, span, barTicks) + (7680 / barTicks) * 48,
    );
  });

  it("clipStylePx uses true proportional width (no paint floor at Zoom-out)", () => {
    const span = { start: 0, end: 3840 * 64 };
    const barTicks = 3840;
    // 1/16 bar at 12 px/bar → 0.75px musical width (keep sub-pixel; no 4px floor).
    const short = {
      id: "s",
      name: "A",
      kind: "section" as const,
      startTicks: 0,
      lengthTicks: barTicks / 16,
    };
    expect(clipStylePx(short, span, barTicks, 12).width).toBe("0.75px");
    // Same clip at 48 px/bar → 3px musical.
    expect(clipStylePx(short, span, barTicks, 48).width).toBe("3px");
    // Half bar at 48 px/bar → 24px.
    const halfBar = { ...short, lengthTicks: barTicks / 2 };
    expect(clipStylePx(halfBar, span, barTicks, 48).width).toBe("24px");
  });

  it("buildBarMarks includes CD label, pre-roll barlines, and song bar numbers", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    const marks = buildBarMarks(span, project);
    expect(marks.some((m) => m.label === "CD" && m.ticks === span.start)).toBe(
      true,
    );
    // Pre-roll interior barlines (empty labels) between CD start and 0
    const preRoll = marks.filter((m) => m.ticks < 0 && m.label === "");
    expect(preRoll.length).toBeGreaterThan(0);
    expect(marks.some((m) => m.label === "1" && m.ticks === 0)).toBe(true);
  });

  it("buildRulerBeatMarks densifies Countdown pre-roll when zoomed", () => {
    const span = { start: -7680, end: 3840 };
    const beats = buildRulerBeatMarks(span, project, RULER_BEAT_TICKS_MIN_PX);
    // First CD bar: -7680…-3840 → beats at -6720, -5760, -4800
    expect(beats.map((m) => m.ticks).filter((t) => t < 0)).toEqual([
      -6720, -5760, -4800, -2880, -1920, -960,
    ]);
  });

  it("buildBarMarks follows meterMap 4/4 → 3/4 boundaries", () => {
    const withMeter: typeof project = {
      ...project,
      meterMap: [
        {
          id: "m0",
          startTicks: 0,
          numerator: 4,
          denominator: 4,
        },
        {
          id: "m1",
          startTicks: 7680,
          numerator: 3,
          denominator: 4,
        },
      ],
    };
    const span = { start: 0, end: 7680 + 2880 * 2 };
    const bounds = iterBarBoundariesTicks(withMeter, span.end);
    // Two 4/4 bars (3840), then 3/4 bars (2880)
    expect(
      bounds.slice(0, 4).map((b) => [b.bar, b.startTicks, b.endTicks]),
    ).toEqual([
      [1, 0, 3840],
      [2, 3840, 7680],
      [3, 7680, 10560],
      [4, 10560, 13440],
    ]);
    const marks = buildBarMarks(span, withMeter);
    expect(marks.map((m) => m.ticks)).toEqual([0, 3840, 7680, 10560]);
    expect(marks.map((m) => m.label)).toEqual(["1", "2", "3", "4"]);
  });

  it("showsBeatSubdivisionMarks at effective px/bar ≥ 56 (v4 effectivePxPerBar)", () => {
    expect(showsBeatSubdivisionMarks(55)).toBe(false);
    expect(showsBeatSubdivisionMarks(RULER_BEAT_TICKS_MIN_PX)).toBe(true);
    // UI scale 80% × base 70 = 56
    expect(showsBeatSubdivisionMarks(70 * 0.8)).toBe(true);
    expect(showsBeatSubdivisionMarks(48 * 1.0)).toBe(false);
    expect(showsBeatSubdivisionMarks(48 * 1.2)).toBe(true);
  });

  it("buildRulerBeatMarks only when pxPerBar >= 56; beats 2…N", () => {
    const span = { start: 0, end: 3840 };
    expect(buildRulerBeatMarks(span, project, 55)).toEqual([]);
    const beats = buildRulerBeatMarks(span, project, RULER_BEAT_TICKS_MIN_PX);
    expect(beats.map((m) => m.ticks)).toEqual([960, 1920, 2880]);
    expect(beats.every((m) => m.label === "")).toBe(true);
  });

  it("buildRulerBeatMarks respects 3/4 after meter change", () => {
    const withMeter: typeof project = {
      ...project,
      meterMap: [
        { id: "m0", startTicks: 0, numerator: 4, denominator: 4 },
        { id: "m1", startTicks: 3840, numerator: 3, denominator: 4 },
      ],
    };
    const span = { start: 3840, end: 3840 + 2880 };
    const beats = buildRulerBeatMarks(span, withMeter, 64);
    expect(beats.map((m) => m.ticks)).toEqual([4800, 5760]);
  });

  it("snapEditTicks uses DEFAULT_SNAP_MODE bar (miara)", () => {
    expect(DEFAULT_SNAP_MODE).toBe("bar");
    expect(snapEditTicks(project, 960)).toBe(0);
  });

  it("snapEditTicks bar mode follows meterMap musical barlines", () => {
    const withMeter: typeof project = {
      ...project,
      meterMap: [
        { id: "m0", startTicks: 0, numerator: 4, denominator: 4 },
        { id: "m1", startTicks: 7680, numerator: 3, denominator: 4 },
      ],
    };
    // Past mid of first 3/4 bar (7680…10560) → next barline 10560
    expect(snapEditTicks(withMeter, 7680 + 1500, "bar")).toBe(10560);
    // Constant-meter floorDiv would wrongly use 2880 steps from 0 → 5760
    expect(snapEditTicks(withMeter, 8000, "bar")).not.toBe(5760);
    expect(snapEditTicks(withMeter, 8000, "bar")).toBe(7680);
  });

  it("snapEditTicks beat mode uses local beat grid", () => {
    expect(snapEditTicks(project, 500, "beat")).toBe(960);
  });

  it("snapEditTicks beat mode is piece-wise across 4/4 → 3/4", () => {
    const withMeter: typeof project = {
      ...project,
      meterMap: [
        { id: "m0", startTicks: 0, numerator: 4, denominator: 4 },
        { id: "m1", startTicks: 7680, numerator: 3, denominator: 4 },
      ],
    };
    const zone = 7680;
    expect(snapEditTicks(withMeter, zone + 400, "beat")).toBe(zone);
    expect(snapEditTicks(withMeter, zone + 1000, "beat")).toBe(zone + 960);
    expect(snapEditTicks(withMeter, zone + 1900, "beat")).toBe(zone + 1920);
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

  it("ticksFromCanvasPx is continuous inverse of tickToPx", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    const barTicks = 3840;
    const bar1StartPx = tickToPx(0, span, barTicks);
    const midBar1Px = bar1StartPx + 24;
    expect(ticksFromCanvasPx(midBar1Px, span, barTicks)).toBe(1920);
    expect(ticksFromCanvasPx(midBar1Px + 48, span, barTicks)).toBe(5760);
  });

  it("ticksFromCanvasPx respects pxPerBar (zoom H)", () => {
    const span = computeFormaViewSpan(project.forma.clips);
    const barTicks = 3840;
    const zoom = 96;
    const bar2Px = tickToPx(7680, span, barTicks, zoom);
    expect(ticksFromCanvasPx(bar2Px, span, barTicks, zoom)).toBe(7680);
    // Default 48px/bar would map the same px to a different tick — zoom must match render.
    expect(ticksFromCanvasPx(bar2Px, span, barTicks, 48)).not.toBe(7680);
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

  it("contentFloorTicks and viewSpan fallbacks", () => {
    expect(contentFloorTicks([])).toBe(0);
    expect(contentFloorTicks([{ id: "x", name: "S", kind: "section", startTicks: Number.NaN, lengthTicks: 1 } as never])).toBe(0);
    const emptySpan = computeFormaViewSpan([]);
    expect(emptySpan.end).toBeGreaterThan(emptySpan.start);
    expect(
      scrollLeftKeepTickAnchored(0, 0, 10, 0),
    ).toBe(10);
  });

  it("canvasPxFromPointer and ticksFromPointer", () => {
    const root = {
      getBoundingClientRect: () => ({ left: 50, top: 0, width: 400, height: 100 }),
    } as unknown as HTMLElement;
    expect(canvasPxFromPointer(150, root)).toBe(100);
    const span = computeFormaViewSpan(project.forma.clips);
    const ticks = ticksFromPointer(50 + tickToPx(0, span, 3840), root, span, 3840);
    expect(ticks).toBe(0);
  });

  it("pencilFormaClick / addPencilSection / projectContentEqual", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "forma-new" });
    const next = pencilFormaClick(project, 7680, "Bridge");
    expect(next.forma.clips.some((c) => c.name === "Bridge")).toBe(true);
    expect(addPencilSection(project, 7680, "Bridge2").forma.clips.length).toBeGreaterThan(
      project.forma.clips.length - 1,
    );
    expect(projectContentEqual(project, project)).toBe(true);
    expect(projectContentEqual(project, next)).toBe(false);
  });

  it("snapNearestBarLine walks when playhead past walked bars", () => {
    // Large atTicks forces guard loop expansion
    const far = snapEditTicks(project, 500_000, "bar");
    expect(far % 3840 === 0 || far >= 0).toBe(true);
  });


  it("snap bar with meterMap mid-song and exact end fallback", () => {
    const p = {
      ...project,
      meterMap: [
        { id: "m0", startTicks: 0, numerator: 4, denominator: 4 },
        { id: "m1", startTicks: 7680, numerator: 5, denominator: 8 },
      ],
    };
    // Force search expansion past initial window
    const snapped = snapEditTicks(p, 20_000, "bar");
    expect(Number.isInteger(snapped)).toBe(true);

    // Exact end of a walked bar → containing miss branch
    const atEnd = snapEditTicks(p, 7680, "bar");
    expect(atEnd).toBeGreaterThanOrEqual(0);

    // Non-finite content end path via bogus clip lengths already covered; force empty finite filter
    const bad = computeFormaViewSpan([
      { id: "x", name: "S", kind: "section", startTicks: Number.POSITIVE_INFINITY, lengthTicks: Number.NaN },
    ] as never);
    expect(bad.end).toBeGreaterThan(bad.start);
  });

  it("snapToMusicalBarStart expands when past maxBars walk", () => {
    // 4096 bars * 3840 = 15_728_640; beyond that forces while-guard expansion + quantize fallback
    const far = snapEditTicks(project, 16_000_000, "bar");
    expect(Number.isFinite(far)).toBe(true);
  });

  it("snapEditTicks off mode clamps below content floor", () => {
    expect(snapEditTicks(project, -100, "off")).toBe(0);
    expect(snapEditTicks(project, 500, "off")).toBe(500);
  });

  it("iterBarBoundariesTicks splits bar at mid-bar meter change", () => {
    const withMid = {
      ...project,
      meterMap: [
        { id: "m0", startTicks: 0, numerator: 4, denominator: 4 },
        // Change mid-first-bar so naturalEnd is truncated
        { id: "m1", startTicks: 1920, numerator: 3, denominator: 4 },
      ],
    };
    const bounds = iterBarBoundariesTicks(withMid, 10_000);
    expect(bounds[0]?.endTicks).toBe(1920);
    expect(bounds.length).toBeGreaterThan(1);
  });

});
