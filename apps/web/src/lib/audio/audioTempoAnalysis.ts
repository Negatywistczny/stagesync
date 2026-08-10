/**
 * Offline audio tempo analysis — onset / beat grid for Smart Tempo.
 * Lives in apps/web (uses AudioBuffer); shared receives {@link AudioAnalysisResult}.
 *
 * Thin barrel: public API re-exports. Implementation lives in `./audio-tempo-analysis/`.
 * UI import path is aggressively bounded so the wizard never hangs.
 */

export {
  DEFAULT_ANALYSIS_TIMEOUT_MS,
  DEFAULT_MAX_ANALYSIS_SEC,
} from "./audio-tempo-analysis/constants.js";

export type {
  AcfEstimateResult,
  AcfPeakCandidate,
  AnalyzeAudioTempoOptions,
  AnalyzeAudioTempoOutcome,
  ViterbiBeatTrace,
  WindowedBpmPoint,
} from "./audio-tempo-analysis/types.js";

export {
  UI_TEMPO_ANALYSIS_OPTIONS,
  buildImportTempoAnalysisOptions,
} from "./audio-tempo-analysis/types.js";

export { yieldToUi } from "./audio-tempo-analysis/helpers.js";

export {
  computeFullSampleRateOnsets,
  computeOnsetStrengthEnvelope,
  detectEnergySpikesMs,
} from "./audio-tempo-analysis/onset-envelope.js";

export {
  estimateBpmFromOnsetStrength,
  estimateWindowedBpmMap,
  pickBestAcfBpm,
} from "./audio-tempo-analysis/bpm-acf.js";

export {
  estimateBpmFromOnsetPeriodHistogram,
  foldHistogramBpmToMusicalOctave,
  reconcileEstimatedBpm,
} from "./audio-tempo-analysis/bpm-estimate.js";

export { detectFirstMusicalDownbeatMs } from "./audio-tempo-analysis/downbeat-detect.js";

export { buildBeatGrid } from "./audio-tempo-analysis/build-beat-grid.js";

export {
  analyzeFromMono,
  analyzeFromMonoAsync,
} from "./audio-tempo-analysis/analyze-mono.js";

export {
  analyzeAudioTempo,
  analyzeAudioTempoAsync,
} from "./audio-tempo-analysis/analyze-buffer.js";
