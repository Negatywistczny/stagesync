import type { AkordClip, Project } from "@stagesync/shared";
import {
  resolveMeterAt,
  syntheticCountdownDisplayFromProject,
  ticksPerBar,
} from "@stagesync/shared";
import type { ChordStepSpan, GridCycleStep } from "./types.js";

export function mergeAkordyWithCountdownDigits(
  project: Project,
  displayTicks: number,
): AkordClip[] {
  const cd = project.forma.clips.find((c) => c.kind === "countdown");
  const cdEnd = cd != null ? cd.startTicks + cd.lengthTicks : 0;
  const includeDigits = displayTicks < cdEnd;
  const synth = includeDigits
    ? syntheticCountdownDisplayFromProject(project).akordy
    : [];
  const real = project.akordy.clips.filter(
    (c) =>
      !/^cd-chord-/i.test(c.id) &&
      !(c.startTicks < 0 && /^\d+$/.test(c.symbol)),
  );
  return [...synth, ...real].sort(
    (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
}

export function resolveMergedAkordAt(
  clips: AkordClip[],
  atTicks: number,
): AkordClip | null {
  for (const clip of clips) {
    if (
      atTicks >= clip.startTicks &&
      atTicks < clip.startTicks + clip.lengthTicks
    ) {
      return clip;
    }
  }
  return null;
}

/** Port of legacy `compressBarChordsToProgression`. */
export function compressBarChordsToProgression(
  barChords: string[],
): { chord: string; bars: number }[] {
  if (!barChords.length) return [];
  const result: { chord: string; bars: number }[] = [];
  for (let i = 0; i < barChords.length;) {
    const chord = barChords[i]!;
    let bars = 1;
    while (i + bars < barChords.length && barChords[i + bars] === chord) {
      bars += 1;
    }
    result.push({ chord, bars });
    i += bars;
  }
  return result;
}

/** Port of legacy `detectCycleLength`. */
export function detectCycleLength(barChords: string[]): number {
  const len = barChords.length;
  if (len <= 1) return len;
  for (let cycleLen = 1; cycleLen < len; cycleLen++) {
    if (len % cycleLen !== 0) continue;
    let repeats = true;
    for (let i = cycleLen; i < len; i++) {
      if (barChords[i] !== barChords[i % cycleLen]) {
        repeats = false;
        break;
      }
    }
    if (repeats) return cycleLen;
  }
  return len;
}

export function progressionForBarChords(
  barChords: string[],
): { chord: string; bars: number }[] {
  if (!barChords.length) return [];
  if (new Set(barChords).size === 1) {
    return compressBarChordsToProgression(barChords);
  }
  const cycleLen = detectCycleLength(barChords);
  if (cycleLen < barChords.length) {
    return compressBarChordsToProgression(barChords.slice(0, cycleLen));
  }
  return compressBarChordsToProgression(barChords);
}

export function chordAtTicks(clips: AkordClip[], atTicks: number): string {
  const hit = resolveMergedAkordAt(clips, atTicks);
  return hit?.symbol?.trim() ? hit.symbol : "—";
}

function barUnitsForSpan(
  project: Project,
  startTicks: number,
  endTicks: number,
): number {
  const span = Math.max(0, endTicks - startTicks);
  if (span <= 0) return 0.25;
  const meter = resolveMeterAt(project, startTicks);
  const barTicks = ticksPerBar(meter, project.ppq);
  if (barTicks <= 0) return 1;
  return Math.max(0.25, span / barTicks);
}

/**
 * Chord tiles for a tick range — one step per overlapping akord clip (v4 phrase slots).
 * Uses clip onsets/lengths so word-anchored / half-bar changes are not lost at bar starts.
 */
export function chordStepsForTickRange(
  project: Project,
  clips: AkordClip[],
  rangeStart: number,
  rangeEnd: number,
): ChordStepSpan[] {
  const start = Math.trunc(rangeStart);
  const end = Math.trunc(rangeEnd);
  if (!(end > start)) return [];

  const overlapping = clips
    .filter((c) => {
      const sym = c.symbol?.trim();
      if (!sym || sym === "—") return false;
      const clipEnd = c.startTicks + c.lengthTicks;
      return c.startTicks < end && clipEnd > start;
    })
    .sort((a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id));

  const steps: ChordStepSpan[] = [];
  for (const clip of overlapping) {
    const stepStart = Math.max(clip.startTicks, start);
    const stepEnd = Math.min(clip.startTicks + clip.lengthTicks, end);
    if (stepEnd <= stepStart) continue;
    steps.push({
      symbol: clip.symbol.trim(),
      startTicks: stepStart,
      endTicks: stepEnd,
      barUnits: barUnitsForSpan(project, stepStart, stepEnd),
    });
  }
  return mergeAdjacentChordSteps(project, steps);
}

/** Merge touching steps with the same symbol into one wider tile. */
export function mergeAdjacentChordSteps(
  project: Project,
  steps: ChordStepSpan[],
): ChordStepSpan[] {
  if (steps.length === 0) return [];
  const out: ChordStepSpan[] = [{ ...steps[0]! }];
  for (let i = 1; i < steps.length; i++) {
    const cur = steps[i]!;
    const last = out[out.length - 1]!;
    if (cur.symbol === last.symbol && cur.startTicks <= last.endTicks + 1) {
      last.endTicks = Math.max(last.endTicks, cur.endTicks);
      last.barUnits = barUnitsForSpan(project, last.startTicks, last.endTicks);
      continue;
    }
    out.push({ ...cur });
  }
  return out;
}

/**
 * Active Forma subsection band under `displayTicks`.
 * Empty / missing `subsections` → single band covering the whole clip.
 */
