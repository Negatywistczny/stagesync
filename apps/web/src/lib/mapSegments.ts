import type { Project } from "@stagesync/shared";
import type { ViewSpan } from "./formaCanvas.js";

export type MapSegment = {
  startTicks: number;
  endTicks: number;
  label: string;
};

function mapSegmentsForSpan<T extends { startTicks: number }>(
  events: T[],
  span: ViewSpan,
  labelOf: (ev: T) => string,
): MapSegment[] {
  const sorted = [...events].sort((a, b) => a.startTicks - b.startTicks);
  const segments: MapSegment[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const ev = sorted[i]!;
    const nextStart = sorted[i + 1]?.startTicks ?? span.end;
    const segStart = Math.max(ev.startTicks, span.start);
    const segEnd = Math.min(nextStart, span.end);
    if (segStart < segEnd) {
      segments.push({
        startTicks: segStart,
        endTicks: segEnd,
        label: labelOf(ev),
      });
    }
  }
  return segments;
}

export function tempoMapSegments(
  project: Project,
  span: ViewSpan,
): MapSegment[] {
  const fromMap = mapSegmentsForSpan(
    project.tempoMap,
    span,
    (ev) => `${ev.bpm} BPM`,
  );
  if (fromMap.length > 0) return fromMap;
  if (span.end > span.start) {
    return [
      {
        startTicks: span.start,
        endTicks: span.end,
        label: `${project.defaultBpm} BPM`,
      },
    ];
  }
  return [];
}

export function meterMapSegments(
  project: Project,
  span: ViewSpan,
): MapSegment[] {
  const fromMap = mapSegmentsForSpan(
    project.meterMap,
    span,
    (ev) => `${ev.numerator}/${ev.denominator}`,
  );
  if (fromMap.length > 0) return fromMap;
  if (span.end > span.start) {
    const m = project.defaultMeter;
    return [
      {
        startTicks: span.start,
        endTicks: span.end,
        label: `${m.numerator}/${m.denominator}`,
      },
    ];
  }
  return [];
}

export function segmentStylePx(
  segment: MapSegment,
  span: ViewSpan,
  barTicks: number,
  pxPerBar: number,
): { left: string; width: string } {
  const left =
    ((segment.startTicks - span.start) / barTicks) * pxPerBar;
  const width =
    ((segment.endTicks - segment.startTicks) / barTicks) * pxPerBar;
  return {
    left: `${left}px`,
    width: `${Math.max(width, 2)}px`,
  };
}
