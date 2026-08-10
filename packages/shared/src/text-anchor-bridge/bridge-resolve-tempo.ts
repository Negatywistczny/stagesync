import type { TempoEvent } from "../schema.js";
import type { TimeSignature } from "../time.js";
import {
  runMultiPassTempoSolver,
  type TempoSolverAnchor,
  type TempoSolverSectionPlan,
} from "../tempo-map-solver.js";
import {
  runAudioDrivenSmartTempo,
  tempoMapFromTempoNodes,
  type AudioAnalysisResult,
  type SmartTempoAudioRef,
  type TempoNode,
} from "../smart-tempo.js";
import type { UgSectionParsed } from "./types.js";

export type ResolveBridgeTempoInput = {
  useAudioSmartTempo: boolean;
  options: {
    audioAnalysis?: AudioAnalysisResult;
    smartTempoAudio?: SmartTempoAudioRef;
    draftTempoNodes?: readonly TempoNode[];
    draftTempoNodesUserEdited?: boolean;
  };
  effectiveAudioOffset: number;
  meter: TimeSignature;
  ppq: number;
  floor: number;
  prefix: string;
  ugSections: readonly UgSectionParsed[];
  vocalMsRanges: readonly ({ startMs: number; endMs: number } | null)[];
  barTicks: number;
  seedAnchors: TempoSolverAnchor[];
  solverSections: {
    name: string;
    pipeBarCount: number;
    chordCount: number;
    structuralBars: number;
    vocalMsRange: { startMs: number; endMs: number } | null;
  }[];
  pipeSeed: number | null;
  placeBpm: number;
  ultrastarMetronomeBpm: number;
};

export type ResolveBridgeTempoResult = {
  seedBpm: number;
  tempoMap: TempoEvent[];
  tempoNodes: TempoNode[];
  formaSections: TempoSolverSectionPlan[];
  warnings: string[];
  approximate: boolean;
};

export function resolveBridgeTempo(
  input: ResolveBridgeTempoInput,
): ResolveBridgeTempoResult {
  const {
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
    ultrastarMetronomeBpm,
  } = input;

  const warnings: string[] = [];
  let approximate = false;
  let seedBpm: number;
  let tempoMap: TempoEvent[];
  let tempoNodes: TempoNode[];
  let formaSections: TempoSolverSectionPlan[];

  if (useAudioSmartTempo) {
    // TempoMap = audio only. `#BPM` / pipe BPM never seed Adapt.
    const audioBpm =
      options.audioAnalysis!.estimatedBpm > 0
        ? options.audioAnalysis!.estimatedBpm
        : 0;
    // Do not nudge audioStartOffset from chord↔syllable — text stays US wall-clock.
    const audioResult = runAudioDrivenSmartTempo({
      analysis: options.audioAnalysis!,
      durationMs: options.smartTempoAudio!.durationMs,
      audioStartOffsetMs: effectiveAudioOffset,
      meter,
      ppq,
      floorTicks: floor,
      idPrefix: prefix,
      fallbackBpm: audioBpm > 0 ? audioBpm : 120,
    });
    warnings.push(...audioResult.warnings);
    seedBpm = audioResult.seedBpm;
    const userEditedDraft =
      options.draftTempoNodesUserEdited === true &&
      options.draftTempoNodes != null &&
      options.draftTempoNodes.length > 0;
    tempoMap = userEditedDraft
      ? tempoMapFromTempoNodes(
          options.draftTempoNodes!,
          seedBpm,
          floor,
          meter,
          ppq,
          prefix,
          {
            audioDurationMs:
              options.smartTempoAudio!.durationMs > 0
                ? options.smartTempoAudio!.durationMs
                : undefined,
          },
        )
      : audioResult.tempoMap;
    tempoNodes = userEditedDraft
      ? [...options.draftTempoNodes!]
      : audioResult.tempoNodes;

    // Placeholder — Forma rebuilt from word ticks after tekst remap below.
    formaSections = ugSections.map((sec, si) => ({
      sectionIndex: si,
      name: sec.name,
      startMs: vocalMsRanges[si]?.startMs ?? 0,
      endMs: vocalMsRanges[si]?.endMs ?? 0,
      pristineBars: 1,
      fromPipe: sec.pipeBarCount > 0 && vocalMsRanges[si] == null,
      startTicks: floor,
      lengthTicks: barTicks,
    }));
  } else {
    if (
      (options.smartTempoAudio?.durationMs ?? 0) > 0 &&
      !options.audioAnalysis
    ) {
      warnings.push(
        "Audio bez analizy tempa — sync eksperymentalny (UltraStar orientacyjny).",
      );
      approximate = true;
    } else if (!options.smartTempoAudio?.durationMs) {
      warnings.push(
        "Import bez podkładu audio — sync UltraStar jest orientacyjny (eksperymentalny).",
      );
      approximate = true;
    }

    const solver = runMultiPassTempoSolver({
      anchors: seedAnchors,
      sections: solverSections,
      meter,
      ppq,
      fallbackBpm: pipeSeed ?? placeBpm,
      referenceMetronomeBpm: ultrastarMetronomeBpm,
      layoutBpm: pipeSeed ?? undefined,
      contentFloorTicks: floor,
      idPrefix: prefix,
    });
    warnings.push(...solver.warnings);
    seedBpm = solver.seedBpm;
    const userEditedDraft =
      options.draftTempoNodesUserEdited === true &&
      options.draftTempoNodes != null &&
      options.draftTempoNodes.length > 0;
    tempoMap = userEditedDraft
      ? tempoMapFromTempoNodes(
          options.draftTempoNodes!,
          solver.seedBpm,
          floor,
          meter,
          ppq,
          prefix,
          {
            audioDurationMs:
              (options.smartTempoAudio?.durationMs ?? 0) > 0
                ? options.smartTempoAudio!.durationMs
                : undefined,
          },
        )
      : solver.tempoMap;
    tempoNodes = userEditedDraft
      ? [...options.draftTempoNodes!]
      : solver.tempoNodes;
    formaSections = solver.sections;
    if (solver.warnings.some((w) => /bez wokalu/i.test(w))) {
      approximate = true;
    }
  }

  return {
    seedBpm,
    tempoMap,
    tempoNodes,
    formaSections,
    warnings,
    approximate,
  };
}
