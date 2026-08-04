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

/** Dense-map fast path — ms from tick 0 at tempo/meter boundaries. */
type IntegrationAnchor = { tick: number; ms: number };

const INTEGRATION_PREFIX_MAX = 12;
const integrationPrefixByKey = new Map<string, IntegrationAnchor[]>();

function projectIntegrationKey(project: TempoMapProject): string {
  const parts = [
    String(project.defaultBpm),
    String(project.ppq),
    `${project.defaultMeter.numerator}/${project.defaultMeter.denominator}`,
  ];
  for (const e of project.tempoMap) parts.push(`${e.startTicks}:${e.bpm}`);
  for (const e of project.meterMap) {
    parts.push(`m${e.startTicks}:${e.numerator}/${e.denominator}`);
  }
  return parts.join("|");
}

function buildIntegrationAnchors(
  project: TempoMapProject,
): IntegrationAnchor[] {
  const tickSet = new Set<number>([0]);
  for (const ev of project.tempoMap) {
    if (ev.startTicks >= 0) tickSet.add(ev.startTicks);
  }
  for (const ev of project.meterMap) {
    if (ev.startTicks >= 0) tickSet.add(ev.startTicks);
  }
  const ticks = [...tickSet].sort((a, b) => a - b);
  const anchors: IntegrationAnchor[] = [];
  let ms = 0;
  for (let i = 0; i < ticks.length; i++) {
    const tick = ticks[i]!;
    anchors.push({ tick, ms });
    const next = ticks[i + 1];
    if (next == null) break;
    const bpm = resolveTempoAt(project, tick);
    const meter = resolveMeterAt(project, tick);
    ms += ticksToMs(next - tick, bpm, meter, project.ppq);
  }
  return anchors;
}

function integrationAnchors(project: TempoMapProject): IntegrationAnchor[] {
  const key = projectIntegrationKey(project);
  const hit = integrationPrefixByKey.get(key);
  if (hit) return hit;
  const built = buildIntegrationAnchors(project);
  if (integrationPrefixByKey.size >= INTEGRATION_PREFIX_MAX) {
    const oldest = integrationPrefixByKey.keys().next().value;
    if (oldest !== undefined) integrationPrefixByKey.delete(oldest);
  }
  integrationPrefixByKey.set(key, built);
  return built;
}

function msFromZeroToTick(toTicks: number, project: TempoMapProject): number {
  if (toTicks === 0) return 0;
  if (toTicks < 0) {
    const bpm = resolveTempoAt(project, 0);
    const meter = resolveMeterAt(project, 0);
    return ticksToMs(toTicks, bpm, meter, project.ppq);
  }
  const anchors = integrationAnchors(project);
  let lo = 0;
  let hi = anchors.length - 1;
  let idx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = anchors[mid]?.tick ?? 0;
    if (t <= toTicks) {
      idx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const anchor = anchors[idx]!;
  if (anchor.tick === toTicks) return anchor.ms;
  const bpm = resolveTempoAt(project, anchor.tick);
  const meter = resolveMeterAt(project, anchor.tick);
  return (
    anchor.ms +
    ticksToMs(toTicks - anchor.tick, bpm, meter, project.ppq)
  );
}

function ticksToMsAlongDenseMap(
  fromTicks: number,
  toTicks: number,
  project: TempoMapProject,
): number {
  if (fromTicks === toTicks) return 0;
  const sign = toTicks >= fromTicks ? 1 : -1;
  const lo = Math.min(fromTicks, toTicks);
  const hi = Math.max(fromTicks, toTicks);
  return sign * (msFromZeroToTick(hi, project) - msFromZeroToTick(lo, project));
}

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
  if (
    project.tempoMap.length > 24 ||
    project.meterMap.length > 8
  ) {
    return ticksToMsAlongDenseMap(fromTicks, toTicks, project);
  }
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
