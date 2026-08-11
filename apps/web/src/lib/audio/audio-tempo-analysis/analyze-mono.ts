import type { AudioAnalysisResult } from "@stagesync/shared";
import {
  medianBpmFromBeatMs,
  selfConsistentScaleBeatGrid,
} from "@stagesync/shared";
import {
  estimateWindowedBpmMap,
  estimateBpmFromOnsetStrengthDetailed,
} from "./bpm-acf.js";
import {
  estimateBpmFromBarHarmonics,
  quickEstimateBpmFromEnergy,
  reconcileEstimatedBpm,
  refineRawBpmWithOnsetEvidence,
} from "./bpm-estimate.js";
import { buildBeatGrid, buildBeatGridAsync } from "./build-beat-grid.js";
import {
  refineBeatGridWithWindowedOnsets,
  snapBeatGridToOnsets,
} from "./beat-grid-refine.js";
import {
  FRAME_SIZE,
  MAX_BEATS_FULL_TRACK,
  MAX_BEATS_WINDOW,
  ONSET_CHUNK_HOPS,
} from "./constants.js";
import { detectFirstMusicalDownbeatMs } from "./downbeat-detect.js";
import {
  acfHopSize,
  effectiveHopSize,
  gridDurationMsForAnalysis,
  makeProgressReporter,
  throwIfAborted,
} from "./helpers.js";
import {
  computeOnsetStrengthEnvelope,
  detectEnergySpikesMs,
  pickOnsetsFromFlux,
} from "./onset-envelope.js";
import type { ViterbiBeatTrace } from "./types.js";

export function analyzeFromMono(
  mono: Float32Array,
  sampleRate: number,
  bufferDurationMs: number,
  maxAnalysisSec: number,
  skipOnsets: boolean,
  seedBpm: number | undefined,
  fullTrackGrid: boolean,
): AudioAnalysisResult {
  const analysisWindowMs = gridDurationMsForAnalysis(
    bufferDurationMs,
    maxAnalysisSec,
  );
  const gridDurationMs = fullTrackGrid ? bufferDurationMs : analysisWindowMs;
  const maxBeats = fullTrackGrid ? MAX_BEATS_FULL_TRACK : MAX_BEATS_WINDOW;
  const hopSize = effectiveHopSize(mono.length);
  let onsetsMs: number[] = [];
  let rawEstimate: number;
  let competitors: number[] = [];
  let acfFlux: Float32Array | undefined;
  const bpmHop = acfHopSize(hopSize, sampleRate);

  if (skipOnsets) {
    rawEstimate = quickEstimateBpmFromEnergy(mono, sampleRate, seedBpm);
  } else {
    const flux = computeOnsetStrengthEnvelope(mono, hopSize);
    onsetsMs = pickOnsetsFromFlux(flux, sampleRate, hopSize);
    acfFlux =
      bpmHop === hopSize ? flux : computeOnsetStrengthEnvelope(mono, bpmHop);
    const acf = estimateBpmFromOnsetStrengthDetailed(
      acfFlux,
      sampleRate,
      bpmHop,
      seedBpm,
    );
    const refined = refineRawBpmWithOnsetEvidence(acf, onsetsMs, seedBpm);
    rawEstimate = refined.estimate;
    competitors = refined.competitors;
    if (!(rawEstimate > 0)) {
      rawEstimate = quickEstimateBpmFromEnergy(mono, sampleRate, seedBpm);
    }
  }
  const periodHintBpm = reconcileEstimatedBpm(
    rawEstimate,
    seedBpm,
    onsetsMs.length,
    competitors,
  );
  const phaseAnchor = detectFirstMusicalDownbeatMs(
    mono,
    sampleRate,
    hopSize,
    onsetsMs,
  );
  const windowedMap = acfFlux
    ? estimateWindowedBpmMap(onsetsMs, gridDurationMs, periodHintBpm)
    : undefined;
  const spikeOnsetsMs = acfFlux
    ? detectEnergySpikesMs(acfFlux, sampleRate, bpmHop)
    : undefined;

  let beatMs = buildBeatGrid(
    onsetsMs,
    periodHintBpm,
    gridDurationMs,
    maxBeats,
    phaseAnchor,
    windowedMap,
    undefined,
    undefined,
    spikeOnsetsMs,
  );

  beatMs = selfConsistentScaleBeatGrid(beatMs, onsetsMs);
  beatMs = snapBeatGridToOnsets(beatMs, onsetsMs, 20);
  const ibiBpm = medianBpmFromBeatMs(beatMs);
  const ibiBpmDeviation =
    ibiBpm > 0 ? Math.abs(ibiBpm - periodHintBpm) / periodHintBpm : 0;
  const estimatedBpm = periodHintBpm > 0 ? periodHintBpm : ibiBpm;

  if (estimatedBpm > 0 && Math.abs(estimatedBpm - periodHintBpm) >= 0.05) {
    let refinedGrid = buildBeatGrid(
      onsetsMs,
      estimatedBpm,
      gridDurationMs,
      maxBeats,
      phaseAnchor,
    );
    refinedGrid = refineBeatGridWithWindowedOnsets(
      refinedGrid,
      onsetsMs,
      estimatedBpm,
    );
    refinedGrid = snapBeatGridToOnsets(refinedGrid, onsetsMs, 20);
    if (refinedGrid.length >= 4) beatMs = refinedGrid;
  }
  console.log(
    `[SMART TEMPO DIAGNOSTICS] po siatce -> medianBpmFromBeatMs: ${ibiBpm > 0 ? ibiBpm.toFixed(2) : "brak"}, periodHintBpm: ${periodHintBpm.toFixed(2)}, ibiBpmDeviation: ${(ibiBpmDeviation * 100).toFixed(1)}%, estimatedBpm (SSOT): ${estimatedBpm.toFixed(2)}`,
  );
  return { onsetsMs, beatMs, estimatedBpm };
}

export async function analyzeFromMonoAsync(
  mono: Float32Array,
  sampleRate: number,
  bufferDurationMs: number,
  maxAnalysisSec: number,
  skipOnsets: boolean,
  seedBpm: number | undefined,
  fullTrackGrid: boolean,
  signal?: AbortSignal,
  onProgress?: (ratio: number) => void,
  externalOnsetsMs?: number[],
  enableTrace?: boolean,
): Promise<AudioAnalysisResult> {
  const report = makeProgressReporter(onProgress);
  report(0);
  const analysisWindowMs = gridDurationMsForAnalysis(
    bufferDurationMs,
    maxAnalysisSec,
  );
  const gridDurationMs = fullTrackGrid ? bufferDurationMs : analysisWindowMs;
  const maxBeats = fullTrackGrid ? MAX_BEATS_FULL_TRACK : MAX_BEATS_WINDOW;
  const hopSize = effectiveHopSize(mono.length);
  let onsetsMs: number[] = [];
  let spikeOnsetsMs: number[] | undefined;
  let acfFlux: Float32Array | undefined;
  let rawEstimate: number;
  let competitors: number[] = [];
  if (skipOnsets) {
    throwIfAborted(signal);
    report(0.35);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    rawEstimate = quickEstimateBpmFromEnergy(mono, sampleRate, seedBpm);
    report(0.85);
  } else {
    const asyncFlux = new Float32Array(
      mono.length > FRAME_SIZE
        ? Math.floor((mono.length - FRAME_SIZE) / hopSize) + 1
        : 0,
    );
    const lowFluxArr = new Float32Array(asyncFlux.length);
    const wideFluxArr = new Float32Array(asyncFlux.length);
    let prevWideEnergy = 0;
    let prevLowEnergy = 0;
    let lowState = 0;
    const alpha =
      (2 * Math.PI * 250) / sampleRate / (1 + (2 * Math.PI * 250) / sampleRate);
    let hopsSinceYield = 0;
    const fluxLen = Math.max(1, asyncFlux.length);
    for (let fi = 0, i = 0; fi < asyncFlux.length; fi++, i += hopSize) {
      throwIfAborted(signal);
      let wideEnergy = 0;
      let lowEnergy = 0;
      for (let j = 0; j < FRAME_SIZE; j++) {
        const v = mono[i + j] ?? 0;
        lowState += alpha * (v - lowState);
        lowEnergy += lowState * lowState;
        wideEnergy += v * v;
      }
      wideEnergy = Math.sqrt(wideEnergy / FRAME_SIZE);
      lowEnergy = Math.sqrt(lowEnergy / FRAME_SIZE);

      const wideFlux = Math.max(0, wideEnergy - prevWideEnergy);
      const lowFlux = Math.max(0, lowEnergy - prevLowEnergy);

      lowFluxArr[fi] = lowFlux;
      wideFluxArr[fi] = wideFlux;
      asyncFlux[fi] = 1.2 * lowFlux + 1.0 * wideFlux;

      prevWideEnergy = wideEnergy * 0.85 + prevWideEnergy * 0.15;
      prevLowEnergy = lowEnergy * 0.85 + prevLowEnergy * 0.15;

      hopsSinceYield += 1;
      if (hopsSinceYield >= ONSET_CHUNK_HOPS) {
        hopsSinceYield = 0;
        report(0.05 + (0.8 * (fi + 1)) / fluxLen);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }
    }
    report(0.88);
    onsetsMs =
      externalOnsetsMs && externalOnsetsMs.length > 0
        ? externalOnsetsMs
        : pickOnsetsFromFlux(asyncFlux, sampleRate, hopSize);
    throwIfAborted(signal);
    spikeOnsetsMs = detectEnergySpikesMs(
      asyncFlux,
      sampleRate,
      hopSize,
      lowFluxArr,
      wideFluxArr,
    );
    const bpmHop = acfHopSize(hopSize, sampleRate);
    acfFlux = asyncFlux;
    if (bpmHop !== hopSize) {
      acfFlux = computeOnsetStrengthEnvelope(mono, bpmHop);
    }
    const acf = estimateBpmFromOnsetStrengthDetailed(
      acfFlux,
      sampleRate,
      bpmHop,
      seedBpm,
    );
    const refined = refineRawBpmWithOnsetEvidence(acf, onsetsMs, seedBpm);
    rawEstimate = refined.estimate;
    competitors = refined.competitors;
    const kickBarBpm = estimateBpmFromBarHarmonics(onsetsMs);
    if (
      kickBarBpm >= 90 &&
      kickBarBpm <= 155 &&
      (seedBpm == null || seedBpm <= 0) &&
      (!(rawEstimate > 0) || rawEstimate < 85 || rawEstimate > 160)
    ) {
      console.log(
        `[SMART TEMPO LOW-END LOCK] Refined rawEstimate ${rawEstimate?.toFixed(2) ?? "brak"} -> ${kickBarBpm.toFixed(2)} BPM from bar harmonics`,
      );
      rawEstimate = kickBarBpm;
    }
    report(0.94);
  }
  const periodHintBpm = reconcileEstimatedBpm(
    rawEstimate,
    seedBpm,
    onsetsMs.length,
    competitors,
  );
  const phaseAnchor = detectFirstMusicalDownbeatMs(
    mono,
    sampleRate,
    hopSize,
    onsetsMs,
  );
  const traceContainer: { trace?: ViterbiBeatTrace[] } = {};
  let beatMs = await buildBeatGridAsync(
    onsetsMs,
    periodHintBpm,
    gridDurationMs,
    maxBeats,
    signal,
    phaseAnchor,
    enableTrace,
    traceContainer,
    spikeOnsetsMs,
  );
  beatMs = selfConsistentScaleBeatGrid(beatMs, onsetsMs);
  beatMs = snapBeatGridToOnsets(beatMs, onsetsMs, 10);
  const ibiBpm = medianBpmFromBeatMs(beatMs);
  const ibiBpmDeviation =
    ibiBpm > 0 ? Math.abs(ibiBpm - periodHintBpm) / periodHintBpm : 1;
  const estimatedBpm = periodHintBpm > 0 ? periodHintBpm : ibiBpm;
  console.log(
    `[SMART TEMPO DIAGNOSTICS] po siatce -> medianBpmFromBeatMs: ${ibiBpm > 0 ? ibiBpm.toFixed(2) : "brak"}, periodHintBpm: ${periodHintBpm.toFixed(2)}, ibiBpmDeviation: ${(ibiBpmDeviation * 100).toFixed(1)}%, estimatedBpm (SSOT): ${estimatedBpm.toFixed(2)}`,
  );
  report(1);
  return { onsetsMs, beatMs, estimatedBpm, viterbiTrace: traceContainer.trace };
}
