import type { TimeSignature } from "../time-tempo/time.js";
import {
  weightForTempoAnchorKind,
  type TempoSolverAnchor,
} from "../tempo-map-solver/tempo-map-solver.js";
import type { UltrastarImportOk } from "../import/ultrastar/ultrastar-import.js";
import type { UgSectionParsed, UgBridgeWord, TimedWord } from "./types.js";
import { ticksToWallMs } from "./clip-remap.js";
import type { ChordMsPlan } from "./bridge-chord-ms-plan.js";

export interface VocalMsRange {
  startMs: number;
  endMs: number;
}

export function computeSectionUsMsAndVocalRanges(
  ugSections: UgSectionParsed[],
  ugWords: UgBridgeWord[],
  usWords: TimedWord[],
  alignMapAtoB: (number | null)[],
  placeBpm: number,
  meter: TimeSignature,
  ppq: number,
  floor: number,
): { sectionUsMs: number[][]; vocalMsRanges: (VocalMsRange | null)[] } {
  const sectionUsMs: number[][] = ugSections.map(() => []);
  for (let gi = 0; gi < ugWords.length; gi++) {
    const bj = alignMapAtoB[gi];
    if (bj == null) continue;
    const uw = usWords[bj];
    const gw = ugWords[gi];
    if (!uw || !gw) continue;
    sectionUsMs[gw.sectionIndex]!.push(
      ticksToWallMs(uw.startTicks, placeBpm, meter, ppq, floor),
    );
  }

  const vocalMsRanges = ugSections.map((_, si) => {
    const msList = sectionUsMs[si] ?? [];
    return msList.length > 0
      ? {
          startMs: Math.min(...msList),
          endMs: Math.max(...msList),
        }
      : null;
  });

  return { sectionUsMs, vocalMsRanges };
}

export function computePhraseMsAndIndicesBySection(
  us: UltrastarImportOk,
  usWords: TimedWord[],
  ugWords: UgBridgeWord[],
  alignMapAtoB: (number | null)[],
  placeBpm: number,
  meter: TimeSignature,
  ppq: number,
  floor: number,
): {
  phraseMsBySection: Map<number, number[]>;
  phraseIndicesBySection: Map<number, number[]>;
} {
  const usIndexToSection = new Map<number, number>();
  for (let gi = 0; gi < ugWords.length; gi++) {
    const bj = alignMapAtoB[gi];
    if (bj == null) continue;
    const gw = ugWords[gi];
    if (!gw) continue;
    usIndexToSection.set(bj, gw.sectionIndex);
  }

  const phraseMsBySection = new Map<number, number[]>();
  const phraseIndicesBySection = new Map<number, number[]>();

  us.tekst.clips.forEach((clip, phraseIndex) => {
    const end = clip.startTicks + clip.lengthTicks;
    const votes = new Map<number, number>();
    for (let wi = 0; wi < usWords.length; wi++) {
      const w = usWords[wi]!;
      if (w.startTicks < clip.startTicks || w.startTicks >= end) continue;
      const si = usIndexToSection.get(wi);
      if (si == null) continue;
      votes.set(si, (votes.get(si) ?? 0) + 1);
    }
    let bestSi: number | undefined;
    let bestN = 0;
    for (const [si, n] of votes) {
      if (n > bestN) {
        bestSi = si;
        bestN = n;
      }
    }
    if (bestSi == null) {
      for (let wi = 0; wi < usWords.length; wi++) {
        const w = usWords[wi]!;
        if (w.startTicks < clip.startTicks) continue;
        const si = usIndexToSection.get(wi);
        if (si != null) {
          bestSi = si;
          break;
        }
      }
    }
    if (bestSi == null) return;
    const ms = ticksToWallMs(clip.startTicks, placeBpm, meter, ppq, floor);
    const list = phraseMsBySection.get(bestSi) ?? [];
    list.push(ms);
    phraseMsBySection.set(bestSi, list);
    const idxs = phraseIndicesBySection.get(bestSi) ?? [];
    idxs.push(phraseIndex);
    phraseIndicesBySection.set(bestSi, idxs);
  });

  return { phraseMsBySection, phraseIndicesBySection };
}

export function buildBridgeAnchors(
  ugSections: UgSectionParsed[],
  solverSections: { vocalMsRange: VocalMsRange | null }[],
  chordMsPlans: ChordMsPlan[],
  phraseMsBySection: Map<number, number[]>,
): { anchors: TempoSolverAnchor[]; seedAnchors: TempoSolverAnchor[] } {
  const anchors: TempoSolverAnchor[] = [];

  for (let si = 0; si < ugSections.length; si++) {
    const sec = ugSections[si]!;
    const vr = solverSections[si]!.vocalMsRange;
    const ugBarsHint = sec.pipeBarCount > 0 ? sec.pipeBarCount : null;
    if (vr) {
      anchors.push({
        ms: vr.startMs,
        sectionIndex: si,
        kind: "section",
        weight: weightForTempoAnchorKind("section"),
        ...(ugBarsHint != null ? { ugBarsHint } : {}),
        barOffset: 0,
      });
    } else if (sec.pipeBarCount > 0) {
      anchors.push({
        ms: 0,
        sectionIndex: si,
        kind: "section",
        weight: weightForTempoAnchorKind("section"),
        ugBarsHint: sec.pipeBarCount,
        barOffset: 0,
      });
    }
  }

  for (const p of chordMsPlans) {
    if (p.structuralOnly) continue;
    anchors.push({
      ms: p.ms,
      sectionIndex: p.sectionIndex,
      kind: "chord",
      weight: weightForTempoAnchorKind("chord"),
      barOffset: p.barOffset,
    });
  }

  for (const [si, phraseMs] of phraseMsBySection) {
    const planned = chordMsPlans.filter((p) => p.sectionIndex === si);
    const lineStarts = [
      ...new Set(
        planned
          .filter((p) => !p.structuralOnly)
          .map((p) => p.barOffset)
          .sort((a, b) => a - b),
      ),
    ];
    for (let pi = 0; pi < phraseMs.length; pi++) {
      anchors.push({
        ms: phraseMs[pi]!,
        sectionIndex: si,
        kind: "phrase",
        weight: weightForTempoAnchorKind("phrase"),
        barOffset:
          lineStarts[Math.min(pi, Math.max(0, lineStarts.length - 1))] ?? pi,
      });
    }
  }

  const pipeAnchor = anchors.find(
    (a) => (ugSections[a.sectionIndex]?.pipeBarCount ?? 0) > 0,
  );
  const firstVocalAnchor = anchors.find(
    (a) => solverSections[a.sectionIndex]?.vocalMsRange != null,
  );
  const seedAnchors: TempoSolverAnchor[] =
    pipeAnchor &&
    firstVocalAnchor &&
    pipeAnchor.sectionIndex !== firstVocalAnchor.sectionIndex
      ? anchors.map((a) =>
          a === pipeAnchor ? a : { ...a, ugBarsHint: undefined },
        )
      : anchors;

  return { anchors, seedAnchors };
}
