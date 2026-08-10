import type { TimeSignature } from "../time.js";
import { layoutFormaFromAlignedWords } from "../smart-tempo.js";
import type { TempoSolverSectionPlan } from "../tempo-map-solver.js";
import type { TimedWord, UgBridgeWord, UgSectionParsed } from "./types.js";

export type LayoutFormaFromBridgeAlignInput = {
  ugSections: readonly UgSectionParsed[];
  ugWords: readonly UgBridgeWord[];
  usWords: readonly TimedWord[];
  mapAtoB: readonly (number | null)[];
  mapUsAudio: (t: number) => number;
  floor: number;
  meter: TimeSignature;
  ppq: number;
};

/**
 * Rebuild Forma section walls from UG↔US word links after audio TempoMap remap.
 */
export function layoutFormaFromBridgeAlign(
  input: LayoutFormaFromBridgeAlignInput,
): TempoSolverSectionPlan[] {
  const {
    ugSections,
    ugWords,
    usWords,
    mapAtoB,
    mapUsAudio,
    floor,
    meter,
    ppq,
  } = input;

  // First/last in UG reading order — NOT min/max time. A single misaligned
  // early word (Math.min) was pulling Chorus Forma onto leftover Verse lyrics.
  const sectionWordTicksInOrder: number[][] = ugSections.map(() => []);
  for (let gi = 0; gi < ugWords.length; gi++) {
    const gw = ugWords[gi]!;
    const bj = mapAtoB[gi];
    if (bj == null) continue;
    const uw = usWords[bj];
    if (!uw) continue;
    sectionWordTicksInOrder[gw.sectionIndex]!.push(mapUsAudio(uw.startTicks));
  }
  const sectionFirstLastTicks = sectionWordTicksInOrder.map((ticks) => {
    if (ticks.length === 0) {
      return { first: null as number | null, last: null as number | null };
    }
    return { first: ticks[0]!, last: ticks[ticks.length - 1]! };
  });
  // Monotonic section starts: skip outlier early aligns within a section.
  let prevFirst = floor;
  for (let si = 0; si < sectionFirstLastTicks.length; si++) {
    const ticks = sectionWordTicksInOrder[si]!;
    if (ticks.length === 0) continue;
    let first = ticks[0]!;
    for (const t of ticks) {
      if (t >= prevFirst) {
        first = t;
        break;
      }
    }
    if (first < prevFirst) first = prevFirst;
    sectionFirstLastTicks[si] = {
      first,
      last: Math.max(first, ticks[ticks.length - 1]!),
    };
    prevFirst = first;
  }
  return layoutFormaFromAlignedWords(
    ugSections.map((sec, si) => ({
      name: sec.name,
      pipeBarCount: sec.pipeBarCount,
      structuralBars: sec.structuralBars,
      firstWordTicks: sectionFirstLastTicks[si]!.first,
      lastWordTicks: sectionFirstLastTicks[si]!.last,
    })),
    floor,
    meter,
    ppq,
  );
}
