import {
  DEFAULT_PPQ,
  DEFAULT_SNAP_MODE,
  quantizeTicks,
  resolveMeterAt,
  ticksPerBar,
  ticksToBbt,
  toDisplayBar,
  type FormaClip,
  type Project,
  type TimeSignature,
} from "@stagesync/shared";

export type ViewSpan = { start: number; end: number };

/** Match v4 default horizontal scale (`DEFAULT_PX_PER_BAR` in legacy Timeline). */
export const DEFAULT_PX_PER_BAR = 48;

/** Trailing empty bars — scroll room past last clip (layout only). */
const TRAILING_VIEW_BARS = 4;
const DEFAULT_VIEW_METER: TimeSignature = { numerator: 4, denominator: 4 };

export type BarMark = { ticks: number; label: string };

export function contentFloorTicks(clips: FormaClip[]): number {
  const countdown = clips.find((c) => c.kind === "countdown");
  return countdown ? countdown.startTicks + countdown.lengthTicks : 0;
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
    width: `${Math.max(width, 2)}px`,
  };
}

export function buildBarMarks(
  span: ViewSpan,
  meter: TimeSignature,
  ppq: number,
): BarMark[] {
  const barTicks = ticksPerBar(meter, ppq);
  const marks: BarMark[] = [];
  const countdownStart = -7680;
  if (span.start <= countdownStart && countdownStart < span.end) {
    marks.push({ ticks: countdownStart, label: "CD" });
  }
  let t = Math.max(0, Math.ceil(span.start / barTicks) * barTicks);
  if (span.start <= 0 && 0 < span.end && !marks.some((m) => m.ticks === 0)) {
    t = 0;
  }
  for (; t < span.end; t += barTicks) {
    if (t < 0) continue;
    const label = String(toDisplayBar(ticksToBbt(t, meter, ppq).bar));
    if (!marks.some((m) => m.ticks === t)) {
      marks.push({ ticks: t, label });
    }
  }
  return marks.sort((a, b) => a.ticks - b.ticks);
}

export function snapEditTicks(project: Project, atTicks: number): number {
  const meter = resolveMeterAt(project, atTicks);
  return quantizeTicks(atTicks, DEFAULT_SNAP_MODE, {
    meter,
    ppq: project.ppq,
    contentFloorTicks: contentFloorTicks(project.forma.clips),
  });
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
  // Inverse of tickToPx: one px column = one bar (no ratio round-up).
  const barIndex = Math.floor(x / pxPerBar);
  return span.start + barIndex * barTicks;
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
 * v4 Forma pencil click: 1 bar at snapped barline, overwrite occupied span.
 * Countdown span is protected; clicks before content floor clamp to floor.
 */
export function pencilFormaClick(
  project: Project,
  atTicks: number,
  sectionName: string,
): Project {
  const startTicks = snapEditTicks(project, atTicks);
  const meter = resolveMeterAt(project, startTicks);
  const barTicks = ticksPerBar(meter, project.ppq);
  const endTicks = startTicks + barTicks;

  const countdown = project.forma.clips.find((c) => c.kind === "countdown");
  if (countdown) {
    const cdEnd = countdown.startTicks + countdown.lengthTicks;
    if (startTicks < cdEnd && endTicks > countdown.startTicks) {
      return project;
    }
  }

  const newSection: FormaClip = {
    id: `forma-${crypto.randomUUID()}`,
    name: sectionName,
    kind: "section",
    startTicks,
    lengthTicks: barTicks,
  };

  const kept: FormaClip[] = [];
  for (const clip of project.forma.clips) {
    if (clip.kind === "countdown") {
      kept.push(clip);
      continue;
    }

    const clipEnd = clip.startTicks + clip.lengthTicks;

    if (clipEnd <= startTicks || clip.startTicks >= endTicks) {
      kept.push(clip);
      continue;
    }

    if (clip.startTicks < startTicks) {
      kept.push({
        ...clip,
        lengthTicks: startTicks - clip.startTicks,
      });
    }

    if (clipEnd > endTicks) {
      kept.push({
        ...clip,
        id: `forma-${crypto.randomUUID()}`,
        startTicks: endTicks,
        lengthTicks: clipEnd - endTicks,
      });
    }
  }

  const clips = [...kept, newSection].sort(
    (a, b) => a.startTicks - b.startTicks,
  );
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
