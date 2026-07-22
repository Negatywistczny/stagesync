import {
  DEFAULT_PPQ,
  DEFAULT_SNAP_MODE,
  insertSpanOverwrite,
  localTicksPerBeat,
  quantizeTicks,
  resolveMeterAt,
  ticksPerBar,
  type FormaClip,
  type Project,
  type SnapMode,
  type TimeSignature,
} from "@stagesync/shared";

export type ViewSpan = { start: number; end: number };

/** Match v4 default horizontal scale (`DEFAULT_PX_PER_BAR` in legacy Timeline). */
export const DEFAULT_PX_PER_BAR = 48;

/**
 * v4 ruler + v5 lane densification: when effective px/bar ≥ 56, draw beat
 * subdivisions (beats 2…N). Threshold uses **effective** px/bar (zoomH × UI
 * scale), matching legacy `effectivePxPerBar()`.
 * @see STAGESYNC-APP-LEGACY timeline.js `renderRuler` (`pxb >= 56`)
 */
export const RULER_BEAT_TICKS_MIN_PX = 56;

/** True when zoom is dense enough for beat subdivision marks. */
export function showsBeatSubdivisionMarks(pxPerBar: number): boolean {
  return pxPerBar >= RULER_BEAT_TICKS_MIN_PX;
}

/** Trailing empty bars — scroll room past last clip (layout only). */
const TRAILING_VIEW_BARS = 4;
const DEFAULT_VIEW_METER: TimeSignature = { numerator: 4, denominator: 4 };

export type BarMark = { ticks: number; label: string };

/** Project fields needed to walk musical bars under meterMap. */
export type MeterMapProject = Pick<
  Project,
  "defaultMeter" | "meterMap" | "ppq"
>;

export type BarBoundary = {
  /** 1-based musical bar index (song start = 1). */
  bar: number;
  startTicks: number;
  endTicks: number;
  meter: TimeSignature;
};

export function contentFloorTicks(clips: FormaClip[]): number {
  const countdown = clips.find((c) => c.kind === "countdown");
  if (
    !countdown ||
    !Number.isFinite(countdown.startTicks) ||
    !Number.isFinite(countdown.lengthTicks)
  ) {
    return 0;
  }
  return countdown.startTicks + countdown.lengthTicks;
}

export function computeFormaViewSpan(clips: FormaClip[]): ViewSpan {
  const barTicks = ticksPerBar(DEFAULT_VIEW_METER, DEFAULT_PPQ);
  if (clips.length === 0) {
    return { start: -7680, end: 7680 * 4 };
  }
  const start = Math.min(...clips.map((c) => c.startTicks));
  const contentEnd = Math.max(
    ...clips.map((c) => c.startTicks + c.lengthTicks),
  );
  const end = Math.max(
    contentEnd + TRAILING_VIEW_BARS * barTicks,
    start + barTicks,
  );
  return { start, end };
}

export function computeCanvasWidthPx(
  span: ViewSpan,
  barTicks: number,
  pxPerBar = DEFAULT_PX_PER_BAR,
): number {
  const bars = (span.end - span.start) / barTicks;
  return Math.max(Math.ceil(bars * pxPerBar), pxPerBar * 4);
}

export function tickToPx(
  ticks: number,
  span: ViewSpan,
  barTicks: number,
  pxPerBar = DEFAULT_PX_PER_BAR,
): number {
  return ((ticks - span.start) / barTicks) * pxPerBar;
}

/**
 * Keep a musical tick at the same viewport X when `viewSpan.start` changes
 * (Countdown lengthen/shorten grows/shrinks the pre-roll on the left).
 * Used **during** CD-length drag so pointer→tick deltas stay stable.
 * Returns the new `scrollLeft`.
 */
export function scrollLeftKeepTickAnchored(
  prevSpanStart: number,
  nextSpanStart: number,
  prevScrollLeft: number,
  barTicks: number,
  pxPerBar = DEFAULT_PX_PER_BAR,
): number {
  if (!(barTicks > 0) || prevSpanStart === nextSpanStart) {
    return Math.max(0, prevScrollLeft);
  }
  const deltaPx = ((prevSpanStart - nextSpanStart) / barTicks) * pxPerBar;
  return Math.max(0, prevScrollLeft + deltaPx);
}

/**
 * Jump timeline canvas to the beginning (CD / song start at left) — v4
 * `scrollToTimelineStart` feel after Countdown length change.
 */
export function scrollCanvasToStart(scroll: HTMLElement | null | undefined): void {
  if (!scroll) return;
  const apply = () => {
    scroll.scrollLeft = 0;
  };
  apply();
  const raf =
    typeof globalThis.requestAnimationFrame === "function"
      ? globalThis.requestAnimationFrame.bind(globalThis)
      : null;
  if (raf) raf(apply);
}

/**
 * Paint box = true tick→px geometry (sub-pixel OK).
 *
 * PO (α9): do **not** floor to a min px width at Zoom-out — v4
 * `Layout.clipRect` / `.timeline-clip { min-width: 4px }` and the former
 * `MIN_CLIP_WIDTH_PX` made dense short onsets (Akordy/Tekst) invade the next
 * clip's start even when tick ranges are disjoint. Hit targets stay the paint
 * box; collision / storage unchanged.
 */
export function clipStylePx(
  clip: FormaClip,
  span: ViewSpan,
  barTicks: number,
  pxPerBar = DEFAULT_PX_PER_BAR,
): { left: string; width: string } {
  const left = tickToPx(clip.startTicks, span, barTicks, pxPerBar);
  const width = (clip.lengthTicks / barTicks) * pxPerBar;
  return {
    left: `${left}px`,
    width: `${Math.max(0, width)}px`,
  };
}

function meterAtTicks(
  project: MeterMapProject,
  positionTicks: number,
): TimeSignature {
  const sorted = [...project.meterMap].sort(
    (a, b) => a.startTicks - b.startTicks,
  );
  let active: TimeSignature = { ...project.defaultMeter };
  for (const ev of sorted) {
    if (ev.startTicks <= positionTicks) {
      active = { numerator: ev.numerator, denominator: ev.denominator };
    } else {
      break;
    }
  }
  return active;
}

/**
 * Walk musical bar boundaries in ticks (v4 `iterBarBoundaries` semantics).
 * Meter changes mid-bar truncate the current bar; next bar starts at the change.
 * Covers song body only (`startTicks ≥ 0`).
 */
export function iterBarBoundariesTicks(
  project: MeterMapProject,
  endTicks: number,
): BarBoundary[] {
  const end = Math.max(0, Math.trunc(endTicks));
  if (end <= 0) return [];

  const changePoints = [
    ...new Set(
      project.meterMap
        .map((ev) => ev.startTicks)
        .filter((t) => Number.isInteger(t) && t > 0),
    ),
  ].sort((a, b) => a - b);

  const bars: BarBoundary[] = [];
  let startTicks = 0;
  let bar = 1;
  const maxBars = 100_000;

  while (startTicks < end && bar <= maxBars) {
    const meter = meterAtTicks(project, startTicks);
    const naturalBar = ticksPerBar(meter, project.ppq);
    let naturalEnd = startTicks + naturalBar;

    for (const changeAt of changePoints) {
      if (changeAt > startTicks && changeAt < naturalEnd) {
        naturalEnd = changeAt;
        break;
      }
    }

    bars.push({
      bar,
      startTicks,
      endTicks: naturalEnd,
      meter,
    });
    startTicks = naturalEnd;
    bar += 1;
  }

  return bars;
}

/**
 * Pre-roll / Countdown bars (`start < 0` → 0) using default meter (seed @ 0).
 * `bar` is 0 for all pre-roll cells (song bar 1 starts at tick 0).
 */
export function iterPreRollBarBoundariesTicks(
  project: MeterMapProject,
  fromTicks: number,
  toTicks = 0,
): BarBoundary[] {
  const start = Math.trunc(fromTicks);
  const end = Math.trunc(toTicks);
  if (!(end > start) || start >= 0) return [];

  const out: BarBoundary[] = [];
  let t = start;
  const maxBars = 10_000;
  while (t < end && out.length < maxBars) {
    const meter = t < 0 ? project.defaultMeter : meterAtTicks(project, t);
    const len = ticksPerBar(meter, project.ppq);
    const barEnd = Math.min(t + len, end);
    out.push({
      bar: 0,
      startTicks: t,
      endTicks: barEnd,
      meter,
    });
    t = barEnd;
  }
  return out;
}

/**
 * Barline marks for ruler labels + lane grid.
 * Pre-roll (CD) gets full barlines; song body follows `meterMap`.
 */
export function buildBarMarks(
  span: ViewSpan,
  project: MeterMapProject,
): BarMark[] {
  const marks: BarMark[] = [];

  if (span.start < 0) {
    marks.push({ ticks: span.start, label: "CD" });
    for (const b of iterPreRollBarBoundariesTicks(project, span.start, 0)) {
      if (b.startTicks >= span.end || b.startTicks < span.start) continue;
      if (b.startTicks === span.start) continue; // CD label already
      if (!marks.some((m) => m.ticks === b.startTicks)) {
        marks.push({ ticks: b.startTicks, label: "" });
      }
    }
  }

  const boundaries = iterBarBoundariesTicks(project, Math.max(span.end, 0));
  for (const b of boundaries) {
    if (b.startTicks >= span.end) break;
    if (b.startTicks < span.start) continue;
    if (!marks.some((m) => m.ticks === b.startTicks)) {
      marks.push({ ticks: b.startTicks, label: String(b.bar) });
    }
  }

  return marks.sort((a, b) => a.ticks - b.ticks);
}

/**
 * Beat subdivision marks (beats 2…N) when {@link showsBeatSubdivisionMarks}.
 * Includes Countdown / pre-roll bars.
 */
export function buildRulerBeatMarks(
  span: ViewSpan,
  project: MeterMapProject,
  pxPerBar: number,
): BarMark[] {
  if (!showsBeatSubdivisionMarks(pxPerBar)) return [];

  const marks: BarMark[] = [];
  const boundaries = [
    ...(span.start < 0
      ? iterPreRollBarBoundariesTicks(project, span.start, 0)
      : []),
    ...iterBarBoundariesTicks(project, Math.max(span.end, 0)),
  ];
  for (const b of boundaries) {
    if (b.startTicks >= span.end) break;
    if (b.endTicks <= span.start) continue;

    const beatTicks = localTicksPerBeat(b.meter, project.ppq);
    const localBpb = Math.max(1, b.meter.numerator);
    for (let beat = 2; beat <= localBpb; beat++) {
      const t = b.startTicks + (beat - 1) * beatTicks;
      if (t >= b.endTicks) break;
      if (t < span.start || t >= span.end) continue;
      marks.push({ ticks: t, label: "" });
    }
  }
  return marks;
}

export function snapEditTicks(
  project: Project,
  atTicks: number,
  mode: SnapMode = DEFAULT_SNAP_MODE,
): number {
  const floor = contentFloorTicks(project.forma.clips);

  if (mode === "off") {
    return atTicks < floor ? floor : atTicks;
  }

  // Forma / bar mode: musical barlines via meterMap (v4 snapAbsToBarStart),
  // not floorDiv on a single resolveMeterAt length (breaks after mid-song meter change).
  if (mode === "bar") {
    return snapToMusicalBarStart(project, atTicks, floor);
  }

  const meter = resolveMeterAt(project, atTicks);
  return quantizeTicks(atTicks, mode, {
    meter,
    ppq: project.ppq,
    contentFloorTicks: floor,
  });
}

/**
 * Snap to nearest musical barline under meterMap (midpoint → earlier).
 * Pre-roll (< 0) clamps to content floor like v4 `Math.max(0, …)`.
 */
function snapToMusicalBarStart(
  project: MeterMapProject,
  atTicks: number,
  floor: number,
): number {
  const t = Math.max(0, atTicks);
  const meterHere = meterAtTicks(project, t);
  let searchEnd = Math.max(
    t + 1,
    t + ticksPerBar(meterHere, project.ppq) * 2,
  );
  let bars = iterBarBoundariesTicks(project, searchEnd);
  let guard = 0;
  while (
    bars.length > 0 &&
    bars[bars.length - 1]!.endTicks <= t &&
    guard < 32
  ) {
    const last = bars[bars.length - 1]!;
    const nextMeter = meterAtTicks(project, last.endTicks);
    searchEnd =
      last.endTicks + ticksPerBar(nextMeter, project.ppq) * 4;
    bars = iterBarBoundariesTicks(project, searchEnd);
    guard += 1;
  }

  const containing = bars.find(
    (b) => t >= b.startTicks && t < b.endTicks,
  );
  if (!containing) {
    // Exact end of last walked bar, or empty map — fall back to constant meter.
    if (bars.length > 0 && t === bars[bars.length - 1]!.endTicks) {
      return Math.max(floor, bars[bars.length - 1]!.endTicks);
    }
    return quantizeTicks(t, "bar", {
      meter: project.defaultMeter,
      ppq: project.ppq,
      contentFloorTicks: floor,
    });
  }

  const { startTicks, endTicks } = containing;
  if (t - startTicks <= endTicks - t) {
    return Math.max(floor, startTicks);
  }
  return Math.max(floor, endTicks);
}

/**
 * Canvas X from viewport click; coord root must be the lanes/timebase element (grid/playhead origin).
 */
export function canvasPxFromPointer(
  clientX: number,
  coordRoot: HTMLElement,
): number {
  const rect = coordRoot.getBoundingClientRect();
  // getBoundingClientRect already reflects scroll — do not add scrollLeft again.
  return clientX - rect.left;
}

export function ticksFromCanvasPx(
  canvasPx: number,
  span: ViewSpan,
  barTicks: number,
  pxPerBar = DEFAULT_PX_PER_BAR,
): number {
  const canvasWidth = computeCanvasWidthPx(span, barTicks, pxPerBar);
  const x = Math.min(canvasWidth, Math.max(0, canvasPx));
  // Continuous inverse of tickToPx (v4 clientXToAbsBeat with round:false),
  // then round to integer ticks (quantizeTicks requires integers).
  const pxb = pxPerBar > 0 ? pxPerBar : DEFAULT_PX_PER_BAR;
  return Math.round(span.start + (x / pxb) * barTicks);
}

export function ticksFromPointer(
  clientX: number,
  coordRoot: HTMLElement,
  span: ViewSpan,
  barTicks: number,
  pxPerBar = DEFAULT_PX_PER_BAR,
): number {
  return ticksFromCanvasPx(
    canvasPxFromPointer(clientX, coordRoot),
    span,
    barTicks,
    pxPerBar,
  );
}

/**
 * Forma pencil click: 1 bar at snapped barline, overwrite occupied span.
 * Countdown span is protected; clicks before content floor clamp to floor.
 */
export function pencilFormaClick(
  project: Project,
  atTicks: number,
  sectionName: string,
  mode: SnapMode = DEFAULT_SNAP_MODE,
): Project {
  const startTicks = snapEditTicks(project, atTicks, mode);
  const meter = resolveMeterAt(project, startTicks);
  const barTicks = ticksPerBar(meter, project.ppq);

  const newSection: FormaClip = {
    id: `forma-${crypto.randomUUID()}`,
    name: sectionName,
    kind: "section",
    startTicks,
    lengthTicks: barTicks,
  };

  const floor = contentFloorTicks(project.forma.clips);
  const clips = insertSpanOverwrite(project.forma.clips, newSection, {
    contentFloorTicks: floor,
  });
  if (clips === project.forma.clips) return project;
  return { ...project, forma: { clips } };
}

/** @deprecated use pencilFormaClick */
export function addPencilSection(
  project: Project,
  atTicks: number,
  sectionName: string,
): Project {
  return pencilFormaClick(project, atTicks, sectionName);
}

export function projectContentEqual(a: Project, b: Project): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
