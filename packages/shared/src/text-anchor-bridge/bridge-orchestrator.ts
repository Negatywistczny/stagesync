import {
  AkordClipSchema,
  FormaClipSchema,
  type FormaClip,
} from "../schema.js";
import { DEFAULT_PPQ, ticksPerBar, type TimeSignature } from "../time.js";
import {
  applySeedMetronomeFallback,
  weightForTempoAnchorKind,
  type TempoSolverAnchor,
} from "../tempo-map-solver.js";
import {
  suggestGridBpmFromPipeAndFirstVocal,
  type UltrastarImportOk,
} from "../ultrastar-import.js";
import {
  msPerBarAtBpm,
  suggestBeat1MsFromPipeAndGap,
} from "../smart-tempo.js";
import { TEXT_ANCHOR_WEAK_ALIGN } from "./constants.js";
import type {
  SectionContainer,
  TextAnchorBridgeOptions,
  TextAnchorBridgeOk,
  TextAnchorBridgeResult,
} from "./types.js";
import { alignWordSequences } from "./align.js";
import { parseUgBridgeSections } from "./ug-parse.js";
import {
  timedSyllablesFromUltrastar,
  timedWordsFromUltrastar,
} from "./ultrastar-words.js";
import { structuralBarsFromUsWalls } from "./onset-grid.js";
import {
  annotateTekstSourceSectionsFromAlign,
  remapMelodyClipsWithMapFn,
  remapTekstClipsWithMapFn,
  remapTickAlongAudioMapContinuous,
  remapTickAlongSolverMap,
  ticksToWallMs,
} from "./clip-remap.js";
import {
  buildBridgeChordMsPlans,
  flattenUgWordsAndChords,
} from "./bridge-chord-ms-plan.js";
import { resolveBridgeTempo } from "./bridge-resolve-tempo.js";
import { placeBridgeAkords } from "./bridge-place-akords.js";
import { layoutFormaFromBridgeAlign } from "./bridge-layout-forma.js";
/**
 * Bridge UltraStar import + UG/ChordPro text → Forma + timed akordy + US tekst.
 */
export function bridgeUsUgImport(
  us: UltrastarImportOk,
  ugText: string,
  options: TextAnchorBridgeOptions = {},
): TextAnchorBridgeResult {
  const warnings: string[] = [];
  let approximate = false;
  const prefix = options.idPrefix ?? "bridge";
  const floor = options.contentFloorTicks ?? 0;
  const weak = options.weakAlignThreshold ?? TEXT_ANCHOR_WEAK_ALIGN;
  const ppq = options.ppq ?? DEFAULT_PPQ;
  const meter: TimeSignature = options.meter ?? {
    numerator: 4,
    denominator: 4,
  };
  const barTicks = ticksPerBar(meter, ppq);
  const placeBpm = us.metronomeBpm;

  const ugSections = parseUgBridgeSections(ugText);
  if (ugSections.length === 0) {
    return {
      ok: false,
      message:
        "Nie rozpoznano sekcji UG / ChordPro — wklej tab z [Verse]/[Chorus] lub akordami.",
    };
  }

  const usWords = timedWordsFromUltrastar(us);
  if (usWords.length === 0) {
    return { ok: false, message: "UltraStar nie zawiera słów do kotwiczenia." };
  }

  const { ugWords, ugChords } = flattenUgWordsAndChords(ugSections);

  const align = alignWordSequences(
    ugWords.map((w) => w.norm),
    usWords.map((w) => w.norm),
  );

  if (align.score < weak) {
    approximate = true;
    warnings.push(
      `Słabe dopasowanie tekstu UG↔UltraStar (${Math.round(align.score * 100)}%). Akordy bez kotwicy rozłożono na siatce taktów — sprawdź Formę i Tap.`,
    );
  }

  /** Per UG section: wall-clock ms of aligned US words. */
  const sectionUsMs: number[][] = ugSections.map(() => []);
  for (let gi = 0; gi < ugWords.length; gi++) {
    const bj = align.mapAtoB[gi];
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

  const pipeSeed = (() => {
    const pipeSec = ugSections.find((s) => s.pipeBarCount > 0);
    if (!pipeSec || !(us.firstVocalMs > 0)) return null;
    // Content-relative seed: exclude pre-roll. Use editorial Beat 1 @ 120 prior
    // (not a possibly-late transient offset) so SingStar GAP ~35s → ~120, and
    // chord↔syllable align still sees a stable barMs.
    let beat1Ms = 0;
    if (pipeSec.pipeBarCount >= 12) {
      beat1Ms = suggestBeat1MsFromPipeAndGap({
        gapMs: us.firstVocalMs,
        pipeBarCount: pipeSec.pipeBarCount,
        layoutBpm: 120,
        meter,
        ppq,
      });
    }
    const passed = Math.max(
      0,
      options.smartTempoAudio?.audioStartOffsetMs ?? 0,
    );
    // When editorial Beat 1 > 0 (pre-roll in GAP) and the caller trim is near
    // it, prefer the measured offset for a finer seed (~123 vs 120). Never
    // adopt a late transient when editorial says Beat 1 is at 0.
    if (
      beat1Ms > 0 &&
      passed > 0 &&
      Math.abs(passed - beat1Ms) <= msPerBarAtBpm(120, meter, ppq) * 0.5
    ) {
      beat1Ms = passed;
    }
    return suggestGridBpmFromPipeAndFirstVocal({
      pipeBarCount: pipeSec.pipeBarCount,
      firstVocalMs: us.firstVocalMs,
      beat1Ms,
      meter,
    });
  })();

  const useAudioSmartTempo =
    (options.smartTempoAudio?.durationMs ?? 0) > 0 &&
    options.audioAnalysis != null &&
    (options.audioAnalysis.beatMs.length > 0 ||
      options.audioAnalysis.onsetsMs.length > 0);

  // Legacy solver sizing may use US metro fallback. Smart Tempo never sizes
  // Forma from `#BPM` — word links + audio seed only (see layout after map).
  const formaSizingBpm = useAudioSmartTempo
    ? (pipeSeed ??
      (options.audioAnalysis!.estimatedBpm > 0
        ? options.audioAnalysis!.estimatedBpm
        : 120))
    : applySeedMetronomeFallback(
        pipeSeed ?? placeBpm,
        us.ultrastarMetronomeBpm,
      );
  const wallBars = structuralBarsFromUsWalls(
    ugSections,
    vocalMsRanges,
    formaSizingBpm,
    meter,
    ppq,
  );

  const solverSections = ugSections.map((sec, si) => ({
    name: sec.name,
    pipeBarCount: sec.pipeBarCount,
    chordCount: sec.chords.length,
    structuralBars: wallBars[si]!,
    vocalMsRange: vocalMsRanges[si]!,
  }));

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

  // Phrase / line anchors: first US syllable of each tekst clip → structural
  // barOffset within its UG section (C+B phrase framing for TempoMap).
  const usIndexToSection = new Map<number, number>();
  for (let gi = 0; gi < ugWords.length; gi++) {
    const bj = align.mapAtoB[gi];
    if (bj == null) continue;
    const gw = ugWords[gi];
    if (!gw) continue;
    usIndexToSection.set(bj, gw.sectionIndex);
  }

  /** Per section: ordered phrase start ms (US line / tekst clip). */
  const phraseMsBySection = new Map<number, number[]>();
  /** Per section: UltraStar phraseIndex values (tekst clip order). */
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

  const usSyllablesEarly = timedSyllablesFromUltrastar(us);
  const wallMsFromPlaceTicks = (ticks: number): number =>
    ticksToWallMs(ticks, placeBpm, meter, ppq, floor);

  const chordMsPlans = buildBridgeChordMsPlans({
    ugSections,
    ugChords,
    usWords,
    alignMapAtoB: align.mapAtoB,
    solverSections,
    wallBars,
    phraseMsBySection,
    phraseIndicesBySection,
    usSyllablesEarly,
    wallMsFromPlaceTicks,
    useAudioSmartTempo,
    formaSizingBpm,
    placeBpm,
    ultrastarMetronomeBpm: us.ultrastarMetronomeBpm,
    meter,
    ppq,
  });

  // Chord barOffsets → Forma struct floor; phrase ms → soft TempoMap guidance.
  // Per-chord UltraStar ms are orientational (not hard tempo kinks).
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

  // Pass 1 seed: only pipe → first vocal keeps ugBarsHint so Verse→Chorus
  // does not dilute seed when vocal ms span ≠ pipe bars.
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

  const effectiveAudioOffset = options.smartTempoAudio?.audioStartOffsetMs ?? 0;

  const tempoResolved = resolveBridgeTempo({
    useAudioSmartTempo,
    options,
    effectiveAudioOffset,
    meter,
    ppq,
    floor,
    prefix,
    ugSections,
    vocalMsRanges,
    barTicks,
    seedAnchors,
    solverSections,
    pipeSeed,
    placeBpm,
    ultrastarMetronomeBpm: us.ultrastarMetronomeBpm,
  });
  warnings.push(...tempoResolved.warnings);
  if (tempoResolved.approximate) approximate = true;
  const { seedBpm, tempoMap, tempoNodes } = tempoResolved;
  let formaSections = tempoResolved.formaSections;

  // Align-first sourceSection on place-BPM ticks, then remap vocals AlongMap.
  const tekstAligned = annotateTekstSourceSectionsFromAlign(
    us.tekst.clips,
    usWords,
    ugWords,
    align.mapAtoB,
  );
  // Exact US wall-clock → TempoMap (no beat snap). Melody same path.
  const mapUsAudio = useAudioSmartTempo
    ? (t: number) =>
        remapTickAlongAudioMapContinuous(
          t,
          placeBpm,
          tempoMap,
          seedBpm,
          meter,
          ppq,
          floor,
          effectiveAudioOffset,
        )
    : (t: number) =>
        remapTickAlongSolverMap(
          t,
          placeBpm,
          tempoMap,
          seedBpm,
          meter,
          ppq,
          floor,
        );

  const tekstAnnotated = {
    clips: remapTekstClipsWithMapFn(tekstAligned, mapUsAudio),
  };
  const melodyRemapped = {
    clips: remapMelodyClipsWithMapFn(us.melody.clips, mapUsAudio),
  };

  if (useAudioSmartTempo) {
    formaSections = layoutFormaFromBridgeAlign({
      ugSections,
      ugWords,
      usWords,
      mapAtoB: align.mapAtoB,
      mapUsAudio,
      floor,
      meter,
      ppq,
    });
  }

  const formaMusic: FormaClip[] = formaSections.map((p) =>
    Object.freeze({
      id: `${prefix}-forma-${p.sectionIndex + 1}`,
      name: p.name.slice(0, 120),
      startTicks: p.startTicks,
      lengthTicks: p.lengthTicks,
      kind: "section" as const,
    }),
  );

  const containers: SectionContainer[] = formaSections.map((p) =>
    Object.freeze({
      sectionIndex: p.sectionIndex,
      name: p.name.slice(0, 120),
      startTicks: p.startTicks,
      lengthTicks: p.lengthTicks,
      endTicks: p.startTicks + p.lengthTicks,
      anchored: solverSections[p.sectionIndex]!.vocalMsRange != null,
      fromPipe: p.fromPipe,
      lengthBars: p.pristineBars,
    }),
  );

  const sectionPreview: TextAnchorBridgeOk["sections"] = containers.map(
    (c) => ({
      name: c.name,
      startTicks: c.startTicks,
      lengthTicks: c.lengthTicks,
      chordCount: 0,
      anchored: c.anchored,
    }),
  );

  const placed = placeBridgeAkords({
    ugSections,
    containers,
    ugChords,
    solverSections,
    barTicks,
    prefix,
    useAudioSmartTempo,
    alignMapAtoB: align.mapAtoB,
    usWords,
    mapUsAudio,
    chordMsPlans,
    tempoMap,
    seedBpm,
    meter,
    ppq,
    floor,
    effectiveAudioOffset,
  });
  warnings.push(...placed.warnings);
  if (placed.approximate) approximate = true;
  const akordClips = placed.akordClips;
  for (let si = 0; si < sectionPreview.length; si++) {
    sectionPreview[si]!.chordCount = placed.sectionChordCounts[si] ?? 0;
  }

  try {
    for (const c of formaMusic) FormaClipSchema.parse(c);
    for (const c of akordClips) AkordClipSchema.parse(c);
  } catch {
    return {
      ok: false,
      message: "Wynik mostka US+UG nie przeszedł walidacji schematu.",
    };
  }

  return {
    ok: true,
    alignScore: align.score,
    approximate,
    warnings,
    matchedWords: align.matches,
    ugWordCount: ugWords.length,
    usWordCount: usWords.length,
    title: us.title,
    artist: us.artist,
    metronomeBpm: seedBpm,
    ultrastarMetronomeBpm: us.ultrastarMetronomeBpm,
    suggestedGridBpm: null,
    tempoMap,
    seedBpm,
    tekst: tekstAnnotated,
    melody: melodyRemapped,
    formaMusic: { clips: formaMusic },
    akordy: { clips: akordClips },
    sections: sectionPreview,
    tempoNodes,
    ...(options.smartTempoAudio
      ? {
          smartTempoAudio: {
            ...options.smartTempoAudio,
            audioStartOffsetMs: effectiveAudioOffset,
          },
        }
      : {}),
    mp3Hint: us.mp3Hint,
    youtubeVideoId: us.youtubeVideoId,
  };
}
