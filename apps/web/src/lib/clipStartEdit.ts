/**
 * Editable clip start as display bar + beat (v4 inspector parity).
 */

import {
  bbtToTicksAlongMeterMap,
  fromDisplayBar,
  resolveMeterAt,
  ticksToBbtAlongMeterMap,
  type Project,
} from "@stagesync/shared";
import { logicBarFromTicks } from "./scoreBarEdit.js";

export function clipStartBarBeat(
  project: Project,
  startTicks: number,
): { bar: number; beat: number } {
  const bbt = ticksToBbtAlongMeterMap(
    startTicks,
    project.defaultMeter,
    project.meterMap,
    project.ppq,
  );
  return { bar: logicBarFromTicks(project, startTicks), beat: bbt.beat };
}

export function ticksFromDisplayBarBeat(
  project: Project,
  displayBar: number,
  beat: number,
): number {
  const logicBar = fromDisplayBar(Math.max(1, Math.floor(displayBar)));
  const safeBeat = Math.max(1, Math.floor(beat));
  return bbtToTicksAlongMeterMap(
    logicBar,
    safeBeat,
    0,
    project.defaultMeter,
    project.meterMap,
    project.ppq,
  );
}

export function moveClipStartKeepLength<
  T extends { id: string; startTicks: number; lengthTicks: number },
>(
  project: Project,
  clips: T[],
  clipId: string,
  displayBar: number,
  beat: number,
): T[] {
  const startTicks = ticksFromDisplayBarBeat(project, displayBar, beat);
  return clips.map((c) =>
    c.id === clipId ? { ...c, startTicks } : c,
  );
}

export function formatStartBarBeat(project: Project, startTicks: number): string {
  const { bar, beat } = clipStartBarBeat(project, startTicks);
  return `${bar}.${beat}`;
}

export function parseStartBarBeat(
  raw: string,
): { bar: number; beat: number } | null {
  const m = /^(\d+)\s*[.:,]\s*(\d+)\s*$/.exec(raw.trim());
  if (!m) return null;
  const bar = Number(m[1]);
  const beat = Number(m[2]);
  if (!Number.isFinite(bar) || !Number.isFinite(beat) || bar < 1 || beat < 1) {
    return null;
  }
  return { bar, beat };
}

/** Ensure beat is valid for meter at that bar start. */
export function clampBeatForProject(
  project: Project,
  displayBar: number,
  beat: number,
): number {
  const ticks = ticksFromDisplayBarBeat(project, displayBar, 1);
  const meter = resolveMeterAt(project, ticks);
  return Math.max(1, Math.min(meter.numerator, Math.floor(beat)));
}
