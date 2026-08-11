import {
  findHarmonicAccentSyllable,
  syllablesInChordScope,
  type HarmonicSyllable,
} from "../music/harmonic-accent.js";
import { pristineBarsFromMsSpan } from "../tempo-map-solver/tempo-map-solver.js";
import type { TimeSignature } from "../time-tempo/time.js";
import {
  barsPerChordForSection,
  sectionLengthBarsFromUg,
  structuralBarOffsetsForChordLines,
} from "./onset-grid.js";
import type {
  ChordMsPlan,
  TimedWord,
  UgBridgeChord,
  UgBridgeWord,
  UgSectionParsed,
} from "./types.js";

export type { ChordMsPlan };

export function flattenUgWordsAndChords(
  ugSections: readonly UgSectionParsed[],
): { ugWords: UgBridgeWord[]; ugChords: UgBridgeChord[] } {
  const ugWords: UgBridgeWord[] = [];
  const ugChords: UgBridgeChord[] = [];
  for (let si = 0; si < ugSections.length; si++) {
    const sec = ugSections[si]!;
    const start = ugWords.length;
    for (const w of sec.words) {
      ugWords.push({
        sectionIndex: si,
        sectionName: sec.name,
        raw: w.raw,
        norm: w.norm,
      });
    }
    const end = ugWords.length;
    let order = 0;
    for (const c of sec.chords) {
      const global =
        c.localWordIndex == null
          ? null
          : start + c.localWordIndex < end
            ? start + c.localWordIndex
            : null;
      ugChords.push({
        sectionIndex: si,
        symbol: c.symbol,
        ugWordIndex: global,
        orderInSection: order++,
        chordLineIndex: c.chordLineIndex,
        wordAligned: c.wordAligned,
      });
    }
  }
  return { ugWords, ugChords };
}

export function chordsBySectionEarly(
  ugChords: readonly UgBridgeChord[],
  si: number,
): UgBridgeChord[] {
  return ugChords.filter((c) => c.sectionIndex === si);
}

export function sameWordPrev(
  chords: readonly UgBridgeChord[],
  ci: number,
): boolean {
  if (ci <= 0) return false;
  const cur = chords[ci]!;
  const prev = chords[ci - 1]!;
  return cur.ugWordIndex != null && prev.ugWordIndex === cur.ugWordIndex;
}

export type BuildChordMsPlansInput = {
  ugSections: readonly UgSectionParsed[];
  ugChords: readonly UgBridgeChord[];
  usWords: readonly TimedWord[];
  alignMapAtoB: readonly (number | null)[];
  solverSections: {
    vocalMsRange: { startMs: number; endMs: number } | null;
  }[];
  wallBars: readonly number[];
  phraseMsBySection: Map<number, number[]>;
  phraseIndicesBySection: Map<number, number[]>;
  usSyllablesEarly: readonly HarmonicSyllable[];
  wallMsFromPlaceTicks: (ticks: number) => number;
  useAudioSmartTempo: boolean;
  formaSizingBpm: number;
  placeBpm: number;
  ultrastarMetronomeBpm: number;
  meter: TimeSignature;
  ppq: number;
};

/**
 * Resolve each vocal chord's locked syllable ms + structural barOffset BEFORE
 * the solver — same (ms → N) pairs drive TempoMap and placement (no snap).
 */
export function buildBridgeChordMsPlans(
  input: BuildChordMsPlansInput,
): ChordMsPlan[] {
  const {
    ugSections,
    ugChords,
    usWords,
    alignMapAtoB: alignMap,
    solverSections,
    wallBars,
    phraseMsBySection,
    phraseIndicesBySection,
    usSyllablesEarly,
    wallMsFromPlaceTicks,
    useAudioSmartTempo,
    formaSizingBpm,
    placeBpm,
    ultrastarMetronomeBpm,
    meter,
    ppq,
  } = input;
  // Local alias matching original `align.mapAtoB` usage
  const align = { mapAtoB: alignMap };
  const chordMsPlans: ChordMsPlan[] = [];

  for (let si = 0; si < ugSections.length; si++) {
    if (ugSections[si]!.pipeBarCount > 0) continue;
    if (solverSections[si]!.vocalMsRange == null) continue;
    const secChords = (chordsBySectionEarly(ugChords, si) ?? []).slice();
    if (secChords.length === 0) continue;
    type LineGroup = { lineIndex: number; chords: UgBridgeChord[] };
    const groups: LineGroup[] = [];
    for (const c of [...secChords].sort(
      (a, b) => a.orderInSection - b.orderInSection,
    )) {
      const last = groups[groups.length - 1];
      if (last && last.lineIndex === c.chordLineIndex) last.chords.push(c);
      else groups.push({ lineIndex: c.chordLineIndex, chords: [c] });
    }

    const phraseMs = phraseMsBySection.get(si) ?? [];
    const vr0 = solverSections[si]!.vocalMsRange;
    const bpmEst = useAudioSmartTempo
      ? formaSizingBpm
      : ultrastarMetronomeBpm > 0
        ? ultrastarMetronomeBpm
        : placeBpm;
    const spanBars = wallBars[si] ?? sectionLengthBarsFromUg(ugSections[si]!);
    const fillBpc = barsPerChordForSection(spanBars, secChords.length);
    const barsPerLine = groups.map((g, gi) => {
      // Left-aligned single chord per lyric line → fill density from Forma span.
      if (g.chords.length === 1) return fillBpc;
      const start = phraseMs[gi] ?? vr0?.startMs ?? 0;
      const end =
        phraseMs[gi + 1] ??
        (gi === groups.length - 1 ? (vr0?.endMs ?? start) : start);
      const fromMs = pristineBarsFromMsSpan(start, end, bpmEst, meter, ppq);
      return Math.max(g.chords.length, fromMs);
    });
    const offsets = structuralBarOffsetsForChordLines(secChords, barsPerLine);
    const offsetByOrder = new Map(
      offsets.map((o) => [o.orderInSection, o.barOffset]),
    );
    const sectionPhrases = phraseIndicesBySection.get(si) ?? [];

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]!;
      const phraseIndex =
        sectionPhrases.length > 0
          ? sectionPhrases[Math.min(gi, sectionPhrases.length - 1)]!
          : null;
      const phraseSyllables =
        phraseIndex == null
          ? []
          : usSyllablesEarly.filter((s) => s.phraseIndex === phraseIndex);
      const linePhraseMs =
        phraseMs.length > 0
          ? phraseMs[Math.min(gi, phraseMs.length - 1)]!
          : null;

      for (let ci = 0; ci < group.chords.length; ci++) {
        const c = group.chords[ci]!;
        const barOffset = offsetByOrder.get(c.orderInSection) ?? 0;
        if (ci > 0 && sameWordPrev(group.chords, ci)) {
          chordMsPlans.push({
            sectionIndex: si,
            symbol: c.symbol,
            orderInSection: c.orderInSection,
            barOffset,
            ms: linePhraseMs ?? phraseMs[0] ?? 0,
            structuralOnly: true,
          });
          continue;
        }

        let scopeStart: number | null = null;
        if (c.ugWordIndex != null) {
          const bj = align.mapAtoB[c.ugWordIndex];
          if (bj != null) scopeStart = usWords[bj]?.startTicks ?? null;
        }
        if (scopeStart == null) {
          scopeStart = phraseSyllables[0]?.startTicks ?? null;
        }
        let scopeEnd: number | null = null;
        for (let nj = ci + 1; nj < group.chords.length; nj++) {
          const n = group.chords[nj]!;
          if (n.ugWordIndex == null) continue;
          const bj = align.mapAtoB[n.ugWordIndex];
          if (bj != null && usWords[bj]) {
            scopeEnd = usWords[bj]!.startTicks;
            break;
          }
        }
        if (scopeEnd == null) {
          const lastSyl = phraseSyllables[phraseSyllables.length - 1];
          scopeEnd = lastSyl != null ? lastSyl.endTicks + 1 : null;
        }
        const sameWordNext =
          ci + 1 < group.chords.length &&
          c.ugWordIndex != null &&
          group.chords[ci + 1]!.ugWordIndex === c.ugWordIndex;

        const scoped =
          scopeStart != null
            ? syllablesInChordScope(
                phraseSyllables.length > 0 ? phraseSyllables : usSyllablesEarly,
                scopeStart,
                sameWordNext
                  ? null
                  : scopeEnd != null && scopeEnd > scopeStart
                    ? scopeEnd
                    : null,
              )
            : [];
        const accent = findHarmonicAccentSyllable(scoped);
        const ms: number | null = accent
          ? wallMsFromPlaceTicks(accent.startTicks)
          : scopeStart != null
            ? wallMsFromPlaceTicks(scopeStart)
            : linePhraseMs;
        if (ms == null) continue;
        chordMsPlans.push({
          sectionIndex: si,
          symbol: c.symbol,
          orderInSection: c.orderInSection,
          barOffset,
          ms,
          structuralOnly: false,
        });
      }
    }

    // Forma Beat 1 ms = first chord (barOffset 0); end covers last chord.
    // Legacy solver only — Smart Tempo Forma comes from word links after Adapt.
    if (!useAudioSmartTempo) {
      const vr = solverSections[si]!.vocalMsRange;
      if (vr) {
        const planned = chordMsPlans.filter((p) => p.sectionIndex === si);
        const first = planned.find((p) => p.barOffset === 0) ?? planned[0];
        if (first) vr.startMs = first.ms;
        if (planned.length > 0) {
          vr.endMs = Math.max(vr.endMs, ...planned.map((p) => p.ms));
        }
      }
    }
  }

  return chordMsPlans;
}
