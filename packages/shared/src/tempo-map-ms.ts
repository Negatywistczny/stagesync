/**
 * Wall-clock ms across a tick span, walking tempoMap (+ meter for ticksPerMs).
 * Pure — no Date.now().
 */

import type { Project } from "./schema.js";
import { resolveMeterAt, resolveTempoAt } from "./project-resolve.js";
import { ticksToMs } from "./time.js";

type TempoProject = Pick<
  Project,
  "defaultBpm" | "defaultMeter" | "tempoMap" | "meterMap" | "ppq"
>;

function boundariesBetween(
  fromTicks: number,
  toTicks: number,
  project: TempoProject,
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
  project: TempoProject,
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
    const mid = a;
    const bpm = resolveTempoAt(project, mid);
    const meter = resolveMeterAt(project, mid);
    ms += ticksToMs(b - a, bpm, meter, project.ppq);
  }
  return sign * ms;
}
