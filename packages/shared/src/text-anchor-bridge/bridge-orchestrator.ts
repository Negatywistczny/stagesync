import {
  AkordClipSchema,
  FormaClipSchema,
  type FormaClip,
} from "../project/schema.js";
import {
  DEFAULT_PPQ,
  ticksPerBar,
  type TimeSignature,
} from "../time-tempo/time.js";
import { applySeedMetronomeFallback } from "../tempo-map-solver/tempo-map-solver.js";
import {
  suggestGridBpmFromPipeAndFirstVocal,
  type UltrastarImportOk,
} from "../import/ultrastar/ultrastar-import.js";
import {
  msPerBarAtBpm,
  suggestBeat1MsFromPipeAndGap,
} from "../smart-tempo/smart-tempo.js";
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
import {
  computeSectionUsMsAndVocalRanges,
  computePhraseMsAndIndicesBySection,
  buildBridgeAnchors,
} from "./bridge-phrase-anchors.js";

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

  const { vocalMsRanges } = computeSectionUsMsAndVocalRanges(
    ugSections,
    ugWords,
    usWords,
    align.mapAtoB,
    placeBpm,
    meter,
    ppq,
    floor,
  );

  const pipeSeed = (() => {
    const pipeSec = ugSections.find((s) => s.pipeBarCount > 0);
    if (!pipeSec || !(us.firstVocalMs > 0)) return null;
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

  const { phraseMsBySection, phraseIndicesBySection } =
    computePhraseMsAndIndicesBySection(
      us,
      usWords,
      ugWords,
      align.mapAtoB,
      placeBpm,
      meter,
      ppq,
      floor,
    );

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

  const { seedAnchors } = buildBridgeAnchors(
    ugSections,
    solverSections,
    chordMsPlans,
    phraseMsBySection,
  );

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

  const tekstAligned = annotateTekstSourceSectionsFromAlign(
    us.tekst.clips,
    usWords,
    ugWords,
    align.mapAtoB,
  );
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
