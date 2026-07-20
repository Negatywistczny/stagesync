/**
 * Client chord grid — resolve akordy.clips at display ticks (α8).
 * Countdown digits are synthetic overlays (not stored in project.json).
 * CL-04: section bar→chord cycle strip.
 */

import type { AkordClip, Project } from "@stagesync/shared";
import {
  resolveFormaClipAt,
  syntheticCountdownDisplayFromProject,
} from "@stagesync/shared";
import { resolveAkordClipAt } from "./akordyEdit.js";
import { barsInTickRange } from "./clientBarCells.js";

export type GridCycleStep = {
  symbol: string;
  bars: number;
  active: boolean;
  /** Which bar within this step is current (1-based), when active. */
  activeBarInStep: number | null;
};

export type GridLiveContext = {
  current: AkordClip | null;
  upcoming: AkordClip[];
  emptyReason: string | null;
  /** Compressed cycle for active section (CL-04). */
  cycle: GridCycleStep[];
  sectionName: string | null;
};

/** Persisted Akordy + synthetic CD digit symbols when playhead in/near CD. */
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
    (a, b) =>
      a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
}

function resolveMergedAkordAt(
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
  for (let i = 0; i < barChords.length; ) {
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
  for (let cycleLen = 1; cycleLen <= len; cycleLen++) {
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

function chordAtTicks(clips: AkordClip[], atTicks: number): string {
  const hit = resolveMergedAkordAt(clips, atTicks);
  return hit?.symbol?.trim() ? hit.symbol : "—";
}

/** One chord symbol per bar overlapping the active section. */
export function sectionBarChords(
  project: Project,
  displayTicks: number,
): { sectionName: string; barChords: string[]; barIndexInSection: number } | null {
  const section = resolveFormaClipAt(project, displayTicks);
  if (!section) return null;
  const clipEnd = section.startTicks + section.lengthTicks;
  const bars = barsInTickRange(project, section.startTicks, clipEnd);
  if (bars.length === 0) return null;
  const clips = mergeAkordyWithCountdownDigits(project, displayTicks);
  const barChords = bars.map((b) => chordAtTicks(clips, b.startTicks));
  let barIndexInSection = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    if (displayTicks >= b.startTicks && displayTicks < b.endTicks) {
      barIndexInSection = i;
      break;
    }
    if (displayTicks >= b.endTicks) barIndexInSection = i;
  }
  return {
    sectionName: section.name,
    barChords,
    barIndexInSection,
  };
}

function cycleWithActive(
  steps: { chord: string; bars: number }[],
  barIndexInSection: number,
): GridCycleStep[] {
  const cycleBars = steps.reduce((s, x) => s + x.bars, 0);
  if (cycleBars <= 0) return [];
  const pos = ((barIndexInSection % cycleBars) + cycleBars) % cycleBars;
  let cursor = 0;
  return steps.map((step) => {
    const start = cursor;
    const end = cursor + step.bars;
    cursor = end;
    const active = pos >= start && pos < end;
    return {
      symbol: step.chord,
      bars: step.bars,
      active,
      activeBarInStep: active ? pos - start + 1 : null,
    };
  });
}

export function buildGridLiveContext(
  project: Project | null,
  displayTicks: number,
): GridLiveContext {
  if (!project) {
    return {
      current: null,
      upcoming: [],
      emptyReason: "Oczekiwanie na utwór…",
      cycle: [],
      sectionName: null,
    };
  }
  const clips = mergeAkordyWithCountdownDigits(project, displayTicks);
  if (clips.length === 0) {
    return {
      current: null,
      upcoming: [],
      emptyReason: "Brak akordów — dodaj clipy na lane Akordy w Timeline.",
      cycle: [],
      sectionName: null,
    };
  }
  const current =
    resolveMergedAkordAt(clips, displayTicks) ??
    resolveAkordClipAt(project, displayTicks);
  const upcoming = clips
    .filter((c) => c.startTicks > displayTicks)
    .slice(0, 2);

  const sectionInfo = sectionBarChords(project, displayTicks);
  let cycle: GridCycleStep[] = [];
  if (sectionInfo && sectionInfo.barChords.some((c) => c !== "—")) {
    const steps = progressionForBarChords(sectionInfo.barChords);
    cycle = cycleWithActive(steps, sectionInfo.barIndexInSection);
  }

  return {
    current,
    upcoming,
    emptyReason: null,
    cycle,
    sectionName: sectionInfo?.sectionName ?? null,
  };
}
