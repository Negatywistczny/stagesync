/**
 * Musical bar cells for Client Forma / Karaoke (CL-01 / CL-05).
 * Reuses Timeline `iterBarBoundariesTicks` for song-body (≥ 0); pre-roll walks meter.
 */

import {
  type Project,
  type TimeSignature,
} from "@stagesync/shared";
import {
  iterBarBoundariesTicks,
  iterPreRollBarBoundariesTicks,
  type BarBoundary,
  type MeterMapProject,
} from "./formaCanvas.js";

export type ClientBarCell = {
  /** 1-based index within the clip (not global song bar). */
  index: number;
  /** Global musical bar when ≥ 1; 0 for pre-roll cells. */
  barDisplay: number;
  startTicks: number;
  endTicks: number;
  meter: TimeSignature;
  past: boolean;
  current: boolean;
  /** 0…1 fill within current bar (beat progress); 0 when not current. */
  beatProgress: number;
};

function beatProgressAt(
  displayTicks: number,
  cellStart: number,
  cellEnd: number,
): number {
  if (displayTicks < cellStart || displayTicks >= cellEnd) return 0;
  const span = cellEnd - cellStart;
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (displayTicks - cellStart) / span));
}

/** Bar boundaries covering [rangeStart, rangeEnd). */
export function barsInTickRange(
  project: MeterMapProject,
  rangeStart: number,
  rangeEnd: number,
): BarBoundary[] {
  const start = Math.trunc(rangeStart);
  const end = Math.trunc(rangeEnd);
  if (!(end > start)) return [];

  if (start >= 0) {
    return iterBarBoundariesTicks(project, end)
      .filter((b) => b.startTicks < end && b.endTicks > start)
      .map((b) => ({
        ...b,
        startTicks: Math.max(b.startTicks, start),
        endTicks: Math.min(b.endTicks, end),
      }))
      .slice(0, 256);
  }

  const pre = iterPreRollBarBoundariesTicks(project, start, Math.min(end, 0));
  const body =
    end > 0
      ? iterBarBoundariesTicks(project, end).filter(
          (b) => b.startTicks < end && b.endTicks > 0,
        )
      : [];
  return [
    ...pre.map((b) => ({
      ...b,
      startTicks: Math.max(b.startTicks, start),
      endTicks: Math.min(b.endTicks, end),
    })),
    ...body.map((b) => ({
      ...b,
      startTicks: Math.max(b.startTicks, start),
      endTicks: Math.min(b.endTicks, end),
    })),
  ].slice(0, 256);
}

export function buildBarCellsForClip(
  project: Project,
  clipStart: number,
  clipEnd: number,
  displayTicks: number,
): ClientBarCell[] {
  const bounds = barsInTickRange(project, clipStart, clipEnd);
  return bounds.map((b, i) => {
    const past = displayTicks >= b.endTicks;
    const current =
      displayTicks >= b.startTicks && displayTicks < b.endTicks;
    return {
      index: i + 1,
      barDisplay: b.bar > 0 ? b.bar : 0,
      startTicks: b.startTicks,
      endTicks: b.endTicks,
      meter: b.meter,
      past,
      current,
      beatProgress: current
        ? beatProgressAt(displayTicks, b.startTicks, b.endTicks)
        : 0,
    };
  });
}
