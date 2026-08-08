/**
 * Client chord grid — resolve akordy.clips at display ticks (α8/α9).
 * Countdown digits are synthetic overlays (not stored in project.json).
 * CL-04: 2-line phrase carousel (current + upcoming subsection) + hero/next.
 */

import type { AkordClip, FormaClip, Project } from "@stagesync/shared";
import {
  resolveFormaClipAt,
  resolveMeterAt,
  syntheticCountdownDisplayFromProject,
  ticksPerBar,
} from "@stagesync/shared";
import { resolveAkordClipAt } from "@lib/timeline-edit/akordyEdit.js";
import { barsInTickRange } from "./clientBarCells.js";
import {
  subsectionRanges,
  type SubsectionRange,
} from "@lib/timeline-edit/formaSubsections.js";

export type GridCycleStep = {
  symbol: string;
  /** Duration in bar units (may be fractional, e.g. 0.5 for a half-bar tile). */
  bars: number;
  active: boolean;
  /** Which bar within this step is current (1-based), when active. */
  activeBarInStep: number | null;
  /** True when the tile is narrower than one full bar (v4 sub-bar slot). */
  isSubBar?: boolean;
};

/** Raw chord span within a subsection — built from akord clip windows, not bar starts. */
export type ChordStepSpan = {
  symbol: string;
  startTicks: number;
  endTicks: number;
  barUnits: number;
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

function chordAtTicks(clips: AkordClip[], atTicks: number): string {
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
    .sort(
      (a, b) =>
        a.startTicks - b.startTicks || a.id.localeCompare(b.id),
    );

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
    if (
      cur.symbol === last.symbol &&
      cur.startTicks <= last.endTicks + 1
    ) {
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
      barIndexInSection = i;
      break;
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
  rangeStart: number;
  rangeEnd: number;
} | null {
  const clips = mergeAkordyWithCountdownDigits(project, displayTicks);
  const section = resolveFormaClipAt(project, displayTicks);

  const bandFromRange = (
    sectionName: string,
    sectionId: string,
    subsectionIndex: number,
    subsectionCount: number,
    rangeStart: number,
    rangeEnd: number,
  ) => {
    const spans = chordStepsForTickRange(
      project,
      clips,
      rangeStart,
      rangeEnd,
    );
    const { barChords } = barChordsForRange(
      project,
      clips,
      rangeStart,
      rangeEnd,
    );
    if (spans.length === 0 && !barChords.some((c) => c !== "—")) return null;
    return {
      sectionName,
      sectionId,
      subsectionIndex,
      subsectionCount,
      barChords,
      rangeStart,
      rangeEnd,
    };
  };

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
    return bandFromRange(
      nextSec.name,
      nextSec.id,
      0,
      ranges.length,
      rangeStart,
      rangeEnd,
    );
  }

  const ranges = subsectionRanges(section.subsections, section.lengthTicks);
  const sub = resolveActiveSubsection(section, displayTicks);
  if (sub.index + 1 < ranges.length) {
    const next = ranges[sub.index + 1]!;
    const rangeStart = section.startTicks + next.startRel;
    const rangeEnd = rangeStart + next.lengthRel;
    return bandFromRange(
      section.name,
      section.id,
      next.index,
      ranges.length,
      rangeStart,
      rangeEnd,
    );
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
  return bandFromRange(
    nextSec.name,
    nextSec.id,
    0,
    nextRanges.length,
    rangeStart,
    rangeEnd,
  );
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
      isSubBar: step.bars < 1 - 1e-6,
    };
  });
}

/** Mark active tile from playhead position within clip spans (not bar-start sampling). */
export function cycleStepsWithActive(
  steps: ChordStepSpan[],
  displayTicks: number,
): GridCycleStep[] {
  const t = Math.trunc(displayTicks);
  return steps.map((step) => {
    const active = t >= step.startTicks && t < step.endTicks;
    return {
      symbol: step.symbol,
      bars: step.barUnits,
      active,
      activeBarInStep: active ? 1 : null,
      isSubBar: step.barUnits < 1 - 1e-6,
    };
  });
}

function cyclePreview(steps: ChordStepSpan[]): GridCycleStep[] {
  return steps.map((step) => ({
    symbol: step.symbol,
    bars: step.barUnits,
    active: false,
    activeBarInStep: null,
    isSubBar: step.barUnits < 1 - 1e-6,
  }));
}

function cyclePreviewFromProgression(
  steps: { chord: string; bars: number }[],
): GridCycleStep[] {
  return steps.map((step) => ({
    symbol: step.chord,
    bars: step.bars,
    active: false,
    activeBarInStep: null,
    isSubBar: step.bars < 1 - 1e-6,
  }));
}

/**
 * Next hero chord — within the active row, then upcoming phrase row.
 */
export function resolveHeroNextSymbol(
  cycle: GridCycleStep[],
  nextCycle: GridCycleStep[],
): string | null {
  if (cycle.length === 0) {
    return nextCycle[0]?.symbol ?? null;
  }
  const activeIdx = cycle.findIndex((s) => s.active);
  if (activeIdx >= 0 && activeIdx + 1 < cycle.length) {
    return cycle[activeIdx + 1]!.symbol;
  }
  if (activeIdx >= 0) {
    return nextCycle[0]?.symbol ?? null;
  }
  return nextCycle[0]?.symbol ?? cycle[0]?.symbol ?? null;
}

/**
 * CSS `grid-template-columns` from bar durations — width ∝ bars (v4 `--slot-bar-units`).
 * Same duration → same track share; 2-bar chord = 2× a 1-bar chord.
 */
export function cycleGridTemplateColumns(
  steps: readonly { bars: number }[],
): string {
  if (steps.length === 0) return "";
  return steps
    .map((s) => {
      const units =
        Number.isFinite(s.bars) && s.bars > 0 ? s.bars : 1;
      return `${units}fr`;
    })
    .join(" ");
}

/** Sum of bar units in the cycle — drives proportional tile columns. */
export function cycleTotalBars(cycle: readonly GridCycleStep[]): number {
  return cycle.reduce((sum, step) => {
    const bars =
      Number.isFinite(step.bars) && step.bars > 0 ? step.bars : 0;
    return sum + bars;
  }, 0);
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
  if (sectionInfo) {
    const spans = chordStepsForTickRange(
      project,
      clips,
      sectionInfo.rangeStart,
      sectionInfo.rangeEnd,
    );
    if (spans.length > 0) {
      cycle = cycleStepsWithActive(spans, displayTicks);
    } else if (sectionInfo.barChords.some((c) => c !== "—")) {
      const steps = progressionForBarChords(sectionInfo.barChords);
      cycle = cycleWithActive(steps, sectionInfo.barIndexInSection);
    }
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

  const nextSpans =
    nextBand != null
      ? chordStepsForTickRange(
          project,
          clips,
          nextBand.rangeStart,
          nextBand.rangeEnd,
        )
      : [];
  const nextCycle =
    nextSpans.length > 0
      ? cyclePreview(nextSpans)
      : nextBand
        ? cyclePreviewFromProgression(
            progressionForBarChords(nextBand.barChords),
          )
        : [];

  const hero =
    current?.symbol?.trim() && current.symbol !== "—"
      ? current.symbol
      : cycle.find((s) => s.active)?.symbol ?? "—";

  const heroNext = countdownPreview
    ? upcoming[0]?.symbol ?? nextCycle[0]?.symbol ?? null
    : resolveHeroNextSymbol(cycle, nextCycle);

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
