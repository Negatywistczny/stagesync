import type { FormaClip, ProjectV3 } from "./schema.js";
import type { TimeSignature } from "./time.js";

function lastEventAt<T extends { startTicks: number }>(
  events: T[],
  positionTicks: number,
): T | null {
  const sorted = [...events].sort((a, b) => a.startTicks - b.startTicks);
  let active: T | null = null;
  for (const ev of sorted) {
    if (ev.startTicks <= positionTicks) {
      active = ev;
    } else {
      break;
    }
  }
  return active;
}

export function resolveTempoAt(
  project: ProjectV3,
  positionTicks: number,
): number {
  const ev = lastEventAt(project.tempoMap, positionTicks);
  return ev?.bpm ?? project.defaultBpm;
}

export function resolveMeterAt(
  project: ProjectV3,
  positionTicks: number,
): TimeSignature {
  const ev = lastEventAt(project.meterMap, positionTicks);
  if (ev) {
    return { numerator: ev.numerator, denominator: ev.denominator };
  }
  return { ...project.defaultMeter };
}

export function resolveFormaClipAt(
  project: ProjectV3,
  positionTicks: number,
): FormaClip | null {
  return lastEventAt(project.forma.clips, positionTicks);
}
