/**
 * Client chord grid — resolve akordy.clips at display ticks (α8/α9).
 * Countdown digits are synthetic overlays (not stored in project.json).
 * CL-04: 2-line phrase carousel (current + upcoming subsection) + hero/next.
 */

import type { AkordClip, FormaClip, Project } from "@stagesync/shared";
import {
  resolveFormaClipAt,
  syntheticCountdownDisplayFromProject,
} from "@stagesync/shared";
import { resolveAkordClipAt } from "./akordyEdit.js";
import { barsInTickRange } from "./clientBarCells.js";
import {
  subsectionRanges,
  type SubsectionRange,
} from "./formaSubsections.js";

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
  /** Compressed cycle for active Forma subsection (CL-04). */
  cycle: GridCycleStep[];
  /** Upcoming phrase row (next subsection / next section first band). */
  nextCycle: GridCycleStep[];
  /** Large hero chord symbol (raw, before display prefs). */
  hero: string;
  /** Hero “nast.” preview — next chord change. */
  heroNext: string | null;
  sectionName: string | null;
  /** 0-based band within the active Forma section; null when no section. */
  subsectionIndex: number | null;
  /** Number of subsection bands (1 when no interior boundaries). */
  subsectionCount: number | null;
  /** Stable key for carousel row identity (section + subsection). */
  carouselKey: string;
  /** Playhead in Countdown — current row collapsed, next holds first verse. */
  countdownPreview: boolean;
  /** Hero digit / CD styling. */
  isCountdown: boolean;
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

/**
 * Active Forma subsection band under `displayTicks`.
 * Empty / missing `subsections` → single band covering the whole clip.
 */
export function resolveActiveSubsection(
  section: Pick<FormaClip, "startTicks" | "lengthTicks" | "subsections">,
  displayTicks: number,
): SubsectionRange {
  const ranges = subsectionRanges(section.subsections, section.lengthTicks);
  const rel = Math.trunc(displayTicks) - section.startTicks;
  for (const range of ranges) {
    if (rel >= range.startRel && rel < range.startRel + range.lengthRel) {
      return range;
    }
  }
  // Clamp to last band (playhead on exclusive end / float edge).
  return ranges[ranges.length - 1]!;
}

function isNumericCountdownChord(symbol: string): boolean {
  return /^\d+$/.test(symbol.trim());
}

function barChordsForRange(
  project: Project,
  clips: AkordClip[],
  rangeStart: number,
  rangeEnd: number,
): { barChords: string[]; barIndexInSection: number; totalBars: number } {
  const bars = barsInTickRange(project, rangeStart, rangeEnd);
  if (bars.length === 0) {
    return { barChords: [], barIndexInSection: 0, totalBars: 0 };
  }
  const barChords = bars.map((b) => chordAtTicks(clips, b.startTicks));
  return {
    barChords,
    barIndexInSection: 0,
    totalBars: bars.length,
  };
}

function barIndexAtDisplay(
  project: Project,
  rangeStart: number,
  rangeEnd: number,
  displayTicks: number,
): number {
  const bars = barsInTickRange(project, rangeStart, rangeEnd);
  let barIndexInSection = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    if (displayTicks >= b.startTicks && displayTicks < b.endTicks) {
      return i;
    }
    if (displayTicks >= b.endTicks) barIndexInSection = i;
  }
  return barIndexInSection;
}

/** One chord symbol per bar overlapping the active Forma subsection. */
export function sectionBarChords(
  project: Project,
  displayTicks: number,
): {
  sectionName: string;
  sectionId: string;
  barChords: string[];
  /** Bar index within the active subsection (0-based). */
  barIndexInSection: number;
  totalBarsInSubsection: number;
  subsectionIndex: number;
  subsectionCount: number;
  rangeStart: number;
  rangeEnd: number;
} | null {
  const section = resolveFormaClipAt(project, displayTicks);
  if (!section) return null;
  const ranges = subsectionRanges(section.subsections, section.lengthTicks);
  const sub = resolveActiveSubsection(section, displayTicks);
  const rangeStart = section.startTicks + sub.startRel;
  const rangeEnd = rangeStart + sub.lengthRel;
  const clips = mergeAkordyWithCountdownDigits(project, displayTicks);
  const bars = barsInTickRange(project, rangeStart, rangeEnd);
  if (bars.length === 0) return null;
  const barChords = bars.map((b) => chordAtTicks(clips, b.startTicks));
  return {
    sectionName: section.name,
    sectionId: section.id,
    barChords,
    barIndexInSection: barIndexAtDisplay(
      project,
      rangeStart,
      rangeEnd,
      displayTicks,
    ),
    totalBarsInSubsection: bars.length,
    subsectionIndex: sub.index,
    subsectionCount: ranges.length,
    rangeStart,
    rangeEnd,
  };
}

function formaClipsSorted(project: Project): FormaClip[] {
  return [...project.forma.clips].sort(
    (a, b) => a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
}

function firstNonCountdownAfter(
  project: Project,
  afterStartTicks: number,
): FormaClip | null {
  for (const clip of formaClipsSorted(project)) {
    if (clip.startTicks < afterStartTicks) continue;
    if (clip.kind === "countdown") continue;
    return clip;
  }
  return null;
}

/**
 * Next phrase band after the active subsection (or first verse after Countdown).
 * Port of legacy `buildNextPhrasePreview` / countdown upcoming.
 */
export function resolveNextPhraseBand(
  project: Project,
  displayTicks: number,
): {
  sectionName: string;
  sectionId: string;
  subsectionIndex: number;
  subsectionCount: number;
  barChords: string[];
} | null {
  const clips = mergeAkordyWithCountdownDigits(project, displayTicks);
  const section = resolveFormaClipAt(project, displayTicks);

  if (!section || section.kind === "countdown") {
    const cd = project.forma.clips.find((c) => c.kind === "countdown");
    const after = cd
      ? cd.startTicks + cd.lengthTicks
      : Math.trunc(displayTicks);
    const nextSec = firstNonCountdownAfter(project, after);
    if (!nextSec) return null;
    const ranges = subsectionRanges(nextSec.subsections, nextSec.lengthTicks);
    const first = ranges[0]!;
    const rangeStart = nextSec.startTicks + first.startRel;
    const rangeEnd = rangeStart + first.lengthRel;
    const { barChords } = barChordsForRange(
      project,
      clips,
      rangeStart,
      rangeEnd,
    );
    if (!barChords.some((c) => c !== "—")) return null;
    return {
      sectionName: nextSec.name,
      sectionId: nextSec.id,
      subsectionIndex: 0,
      subsectionCount: ranges.length,
      barChords,
    };
  }

  const ranges = subsectionRanges(section.subsections, section.lengthTicks);
  const sub = resolveActiveSubsection(section, displayTicks);
  if (sub.index + 1 < ranges.length) {
    const next = ranges[sub.index + 1]!;
    const rangeStart = section.startTicks + next.startRel;
    const rangeEnd = rangeStart + next.lengthRel;
    const { barChords } = barChordsForRange(
      project,
      clips,
      rangeStart,
      rangeEnd,
    );
    if (!barChords.some((c) => c !== "—")) return null;
    return {
      sectionName: section.name,
      sectionId: section.id,
      subsectionIndex: next.index,
      subsectionCount: ranges.length,
      barChords,
    };
  }

  const nextSec = firstNonCountdownAfter(
    project,
    section.startTicks + section.lengthTicks,
  );
  if (!nextSec) return null;
  const nextRanges = subsectionRanges(nextSec.subsections, nextSec.lengthTicks);
  const first = nextRanges[0]!;
  const rangeStart = nextSec.startTicks + first.startRel;
  const rangeEnd = rangeStart + first.lengthRel;
  const { barChords } = barChordsForRange(
    project,
    clips,
    rangeStart,
    rangeEnd,
  );
  if (!barChords.some((c) => c !== "—")) return null;
  return {
    sectionName: nextSec.name,
    sectionId: nextSec.id,
    subsectionIndex: 0,
    subsectionCount: nextRanges.length,
    barChords,
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

function cyclePreview(steps: { chord: string; bars: number }[]): GridCycleStep[] {
  return steps.map((step) => ({
    symbol: step.chord,
    bars: step.bars,
    active: false,
    activeBarInStep: null,
  }));
}

/**
 * Next hero chord — port of legacy getNextCycleChordInfo / phrase next cell.
 * Within cycle → next step; last step mid-subsection → wrap; end of band → next row.
 */
export function resolveHeroNextSymbol(
  cycle: GridCycleStep[],
  nextCycle: GridCycleStep[],
  barIndexInSection: number,
  totalBarsInSubsection: number,
): string | null {
  if (cycle.length === 0) {
    return nextCycle[0]?.symbol ?? null;
  }
  const activeIdx = cycle.findIndex((s) => s.active);
  if (activeIdx >= 0 && activeIdx + 1 < cycle.length) {
    return cycle[activeIdx + 1]!.symbol;
  }
  const onLastBarOfBand =
    totalBarsInSubsection > 0 &&
    barIndexInSection >= totalBarsInSubsection - 1;
  if (!onLastBarOfBand && cycle.length > 0) {
    return cycle[0]!.symbol;
  }
  return nextCycle[0]?.symbol ?? null;
}

/**
 * CSS `grid-template-columns` from bar durations — width ∝ bars (v4 `--slot-bar-units`).
 * Same duration → same track share; 2-bar chord = 2× a 1-bar chord.
 */
export function cycleGridTemplateColumns(
  steps: readonly { bars: number }[],
): string {
  if (steps.length === 0) return "";
  return steps.map((s) => `${Math.max(1, Math.round(s.bars))}fr`).join(" ");
}

/** Sum of bar units in the cycle — drives proportional tile columns. */
export function cycleTotalBars(cycle: readonly GridCycleStep[]): number {
  return cycle.reduce((sum, step) => sum + Math.max(0, step.bars), 0);
}

const emptyContext = (emptyReason: string | null): GridLiveContext => ({
  current: null,
  upcoming: [],
  emptyReason,
  cycle: [],
  nextCycle: [],
  hero: "—",
  heroNext: null,
  sectionName: null,
  subsectionIndex: null,
  subsectionCount: null,
  carouselKey: "",
  countdownPreview: false,
  isCountdown: false,
});

export function buildGridLiveContext(
  project: Project | null,
  displayTicks: number,
): GridLiveContext {
  if (!project) {
    return emptyContext("Oczekiwanie na utwór…");
  }
  const clips = mergeAkordyWithCountdownDigits(project, displayTicks);
  if (clips.length === 0) {
    return emptyContext(
      "Brak akordów — dodaj clipy na lane Akordy w Timeline.",
    );
  }
  const current =
    resolveMergedAkordAt(clips, displayTicks) ??
    resolveAkordClipAt(project, displayTicks);
  const upcoming = clips
    .filter((c) => c.startTicks > displayTicks)
    .slice(0, 2);

  const section = resolveFormaClipAt(project, displayTicks);
  const isCountdown = section?.kind === "countdown" ||
    (current != null && isNumericCountdownChord(current.symbol));
  const countdownPreview = section?.kind === "countdown";

  const sectionInfo = countdownPreview
    ? null
    : sectionBarChords(project, displayTicks);
  const nextBand = resolveNextPhraseBand(project, displayTicks);

  let cycle: GridCycleStep[] = [];
  if (sectionInfo && sectionInfo.barChords.some((c) => c !== "—")) {
    const steps = progressionForBarChords(sectionInfo.barChords);
    cycle = cycleWithActive(steps, sectionInfo.barIndexInSection);
  } else if (countdownPreview && current) {
    // Single active CD digit tile so hero/active still have a row identity.
    cycle = [
      {
        symbol: current.symbol,
        bars: 1,
        active: true,
        activeBarInStep: 1,
      },
    ];
  }

  const nextCycle = nextBand
    ? cyclePreview(progressionForBarChords(nextBand.barChords))
    : [];

  const hero =
    cycle.find((s) => s.active)?.symbol ??
    current?.symbol ??
    "—";

  const heroNext = countdownPreview
    ? upcoming[0]?.symbol ?? nextCycle[0]?.symbol ?? null
    : resolveHeroNextSymbol(
        cycle,
        nextCycle,
        sectionInfo?.barIndexInSection ?? 0,
        sectionInfo?.totalBarsInSubsection ?? 0,
      );

  const carouselKey = countdownPreview
    ? `cd:${section?.id ?? "cd"}`
    : sectionInfo
      ? `${sectionInfo.sectionId}:${sectionInfo.subsectionIndex}`
      : current
        ? `clip:${current.id}`
        : "";

  return {
    current,
    upcoming,
    emptyReason: null,
    cycle: countdownPreview ? [] : cycle,
    nextCycle,
    hero,
    heroNext: heroNext && heroNext !== "—" ? heroNext : null,
    sectionName: countdownPreview
      ? (section?.name ?? "Countdown")
      : (sectionInfo?.sectionName ?? null),
    subsectionIndex: sectionInfo?.subsectionIndex ?? null,
    subsectionCount: sectionInfo?.subsectionCount ?? null,
    carouselKey,
    countdownPreview,
    isCountdown: Boolean(isCountdown),
  };
}
