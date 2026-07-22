import { ticksPerBar } from "./time.js";
import type { Project } from "./schema.js";

const EMPTY_PROJECT_END_BARS = 2;

/**
 * End of song in ticks for transport clamp / auto-advance.
 * Max of forma + content-lane + audio clip ends (start + length).
 * Countdown (negative) ignored for end. Empty content → 2 bars @ defaultMeter / ppq.
 */
export function emptyProjectEndTicks(project: {
  ppq: number;
  defaultMeter: { numerator: number; denominator: number };
}): number {
  return (
    EMPTY_PROJECT_END_BARS *
    ticksPerBar(project.defaultMeter, project.ppq)
  );
}

function considerEnd(maxEnd: number, startTicks: number, lengthTicks: number): number {
  const end = startTicks + lengthTicks;
  return end > maxEnd ? end : maxEnd;
}

export function projectEndTicks(project: Project): number {
  let maxEnd = Number.NEGATIVE_INFINITY;
  for (const clip of project.forma.clips) {
    maxEnd = considerEnd(maxEnd, clip.startTicks, clip.lengthTicks);
  }
  for (const clip of project.tekst?.clips ?? []) {
    maxEnd = considerEnd(maxEnd, clip.startTicks, clip.lengthTicks);
  }
  for (const clip of project.akordy?.clips ?? []) {
    maxEnd = considerEnd(maxEnd, clip.startTicks, clip.lengthTicks);
  }
  for (const clip of project.cue?.clips ?? []) {
    maxEnd = considerEnd(maxEnd, clip.startTicks, clip.lengthTicks);
  }
  for (const clip of project.audioClips ?? []) {
    maxEnd = considerEnd(maxEnd, clip.startTicks, clip.lengthTicks);
  }
  if (!Number.isFinite(maxEnd) || maxEnd <= 0) {
    return emptyProjectEndTicks(project);
  }
  return maxEnd;
}
