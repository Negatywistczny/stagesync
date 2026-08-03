/**
 * Bidirectional TempoMap SSOT — ticks ↔ wall-clock along tempoMap (+ meterMap).
 * Pure — no Date.now(). Position authority stays integer ticks (ADR 0002).
 */

import type { Project } from "./schema.js";
import { resolveMeterAt, resolveTempoAt } from "./project-resolve.js";
import {
  DEFAULT_PPQ,
  elapsedToTicks,
  ticksToMs,
  type TimeSignature,
} from "./time.js";

export type TempoMapEventLike = { startTicks: number; bpm: number };

export type MeterMapEventLike = {
  startTicks: number;
  numerator: number;
  denominator: number;
};

/** Project slice needed for piecewise tempo / meter integration. */
export type TempoMapProject = Pick<
  Project,
  "defaultBpm" | "defaultMeter" | "tempoMap" | "meterMap" | "ppq"
>;

const DEFAULT_METER: TimeSignature = { numerator: 4, denominator: 4 };

function asProject(
  tempoMap: readonly TempoMapEventLike[],
  defaultBpm: number,
  meter: TimeSignature = DEFAULT_METER,
  ppq: number = DEFAULT_PPQ,
  meterMap: readonly MeterMapEventLike[] = [],
): TempoMapProject {
  return {
    defaultBpm,
    defaultMeter: { ...meter },
    tempoMap: tempoMap.map((e, i) => ({
      id: `t${i}`,
      startTicks: e.startTicks,
      bpm: e.bpm,
    })),
    meterMap: meterMap.map((e, i) => ({
      id: `m${i}`,
      startTicks: e.startTicks,
      numerator: e.numerator,
      denominator: e.denominator,
    })),
    ppq: (ppq ?? DEFAULT_PPQ) as typeof DEFAULT_PPQ,
  };
}

function boundariesBetween(
  fromTicks: number,
  toTicks: number,
  project: TempoMapProject,
): number[] {
  const lo = Math.min(fromTicks, toTicks);
  const hi = Math.max(fromTicks, toTicks);
  const marks = new Set<number>([lo, hi]);
  for (const ev of project.tempoMap) {
    if (ev.startTicks > lo && ev.startTicks < hi) marks.add(ev.startTicks);
  }
  for (const ev of project.meterMap) {
    if (ev.startTicks > lo && ev.startTicks < hi) marks.add(ev.startTicks);
  }
  return [...marks].sort((a, b) => a - b);
}

/**
 * Milliseconds from `fromTicks` to `toTicks` along project maps.
 * Negative when to < from.
 */
export function ticksToMsAlongTempoMap(
  fromTicks: number,
  toTicks: number,
  project: TempoMapProject,
): number {
  if (!Number.isFinite(fromTicks) || !Number.isFinite(toTicks)) {
    throw new RangeError("ticks must be finite");
  }
  if (fromTicks === toTicks) return 0;
  const sign = toTicks >= fromTicks ? 1 : -1;
  const marks = boundariesBetween(fromTicks, toTicks, project);
  let ms = 0;
  for (let i = 0; i < marks.length - 1; i++) {
    const a = marks[i]!;
    const b = marks[i + 1]!;
    const bpm = resolveTempoAt(project, a);
    const meter = resolveMeterAt(project, a);
    ms += ticksToMs(b - a, bpm, meter, project.ppq);
  }
  return sign * ms;
}

/**
 * Wall-clock seconds from tick 0 to `ticks` (negative ticks → negative seconds).
 */
export function ticksToSeconds(
  ticks: number,
  tempoMap: readonly TempoMapEventLike[],
  defaultBpm: number,
  meter: TimeSignature = DEFAULT_METER,
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isFinite(ticks)) {
    throw new RangeError("ticks must be finite");
  }
  const project = asProject(tempoMap, defaultBpm, meter, ppq);
  return ticksToMsAlongTempoMap(0, ticks, project) / 1000;
}

/**
 * Piecewise inverse of {@link ticksToSeconds}: seconds from tick 0 → integer ticks.
 * Binary search on {@link ticksToMsAlongTempoMap} so tick→seconds→tick round-trips
 * (floor within a segment matches {@link elapsedToTicks} without float bleed).
 */
export function secondsToTicks(
  seconds: number,
  tempoMap: readonly TempoMapEventLike[],
  defaultBpm: number,
  meter: TimeSignature = DEFAULT_METER,
  ppq: number = DEFAULT_PPQ,
): number {
  if (!Number.isFinite(seconds)) {
    throw new RangeError("seconds must be finite");
  }
  if (seconds === 0) return 0;
  const project = asProject(tempoMap, defaultBpm, meter, ppq);
  return secondsToTicksAlongMap(seconds, project);
}

/** Convenience: {@link ticksToSeconds} from a project slice. */
export function ticksToSecondsAlongMap(
  ticks: number,
  project: TempoMapProject,
): number {
  return ticksToMsAlongTempoMap(0, ticks, project) / 1000;
}

/**
 * Convenience: {@link secondsToTicks} from a project slice (includes meterMap).
 * Finds the largest integer tick `t` with `ticksToSeconds(t) <= seconds`.
 */
export function secondsToTicksAlongMap(
  seconds: number,
  project: TempoMapProject,
): number {
  if (!Number.isFinite(seconds)) {
    throw new RangeError("seconds must be finite");
  }
  if (seconds === 0) return 0;

  if (seconds < 0) {
    const bpm = resolveTempoAt(project, 0);
    const m = resolveMeterAt(project, 0);
    return -elapsedToTicks(-seconds * 1000, bpm, m, project.ppq);
  }

  const targetMs = seconds * 1000;
  // Upper bound: constant tempo at the slowest map BPM (or default).
  let minBpm = project.defaultBpm;
  for (const ev of project.tempoMap) {
    if (ev.bpm > 0 && ev.bpm < minBpm) minBpm = ev.bpm;
  }
  const meter0 = resolveMeterAt(project, 0);
  let hi = Math.max(
    1,
    elapsedToTicks(targetMs, minBpm, meter0, project.ppq) + project.ppq,
  );
  // Grow hi until wall-clock at hi covers the target (tempo may be faster later).
  while (ticksToMsAlongTempoMap(0, hi, project) < targetMs) {
    hi *= 2;
    if (hi > 1e12) {
      throw new RangeError("secondsToTicks: target beyond searchable range");
    }
  }
  let lo = 0;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ticksToMsAlongTempoMap(0, mid, project) <= targetMs) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * Advance `originTicks` by `elapsedMs` along the tempo/meter maps.
 * Used by transport / soft-clock so mid-span tempo changes do not drift.
 */
export function advanceTicksAlongTempoMap(
  originTicks: number,
  elapsedMs: number,
  project: TempoMapProject,
): number {
  if (!Number.isFinite(originTicks) || !Number.isFinite(elapsedMs)) {
    throw new RangeError("originTicks and elapsedMs must be finite");
  }
  if (elapsedMs === 0) return Math.trunc(originTicks);
  const originSec = ticksToSecondsAlongMap(originTicks, project);
  return secondsToTicksAlongMap(originSec + elapsedMs / 1000, project);
}
