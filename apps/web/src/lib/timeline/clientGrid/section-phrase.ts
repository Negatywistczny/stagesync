import type { AkordClip, FormaClip, Project } from "@stagesync/shared";
import { resolveFormaClipAt } from "@stagesync/shared";
import { barsInTickRange } from "../clientBarCells.js";
import {
  subsectionRanges,
  type SubsectionRange,
} from "@lib/timeline-edit/formaSubsections.js";
import {
  chordAtTicks,
  chordStepsForTickRange,
  mergeAkordyWithCountdownDigits,
} from "./progression.js";

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

export function isNumericCountdownChord(symbol: string): boolean {
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
    const spans = chordStepsForTickRange(project, clips, rangeStart, rangeEnd);
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
