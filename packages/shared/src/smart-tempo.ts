/**
 * Smart Tempo (5.4.2): audio wall-clock ground truth → granular TempoMap on ticks.
 * No Flex Time / audio warp (ADR 0015) — map follows the recording.
 * UltraStar / UG timings are passive events snapped to the audio grid.
 *
 * Thin barrel: public API re-exports. Implementation lives in `./smart-tempo/`.
 */

export {
  SMART_TEMPO_SPARSE_MIN_BPM_DELTA,
  SMART_TEMPO_SPARSE_WINDOW_BEATS,
  SMART_TEMPO_SPARSE_MIN_BAR_GAP,
  SMART_TEMPO_SPARSE_MAX_BPM_STEP,
  US_UG_BACKING_TRACK_NAME,
  US_UG_BACKING_TRACK_ID,
  US_UG_BACKING_CLIP_ID,
  SMART_TEMPO_MAX_BEATS,
  SMART_TEMPO_MAX_UI_NODES,
  SMART_TEMPO_MAX_GRID_MS,
  YOUTUBE_VIDEO_ID_RE,
} from "./smart-tempo/constants.js";

export type {
  SmartTempoAudioRef,
  ViterbiBeatTraceCandidate,
  ViterbiBeatTrace,
  AudioAnalysisResult,
  TempoNode,
  DriftGateResult,
  ApplyDriftGateOptions,
  AudioSmartTempoInput,
  AudioSmartTempoResult,
  UgFormaSectionInput,
  LayoutFormaFromUgBarCountsOpts,
  SparsifyTempoNodesOptions,
  AlignedWordFormaSection,
  PlaceUsUgBackingAudioOpts,
} from "./smart-tempo/types.js";

export {
  beatGridToContentEpoch,
  tempoNodesToContentEpoch,
  tempoNodesToFileEpoch,
  ticksAtConstantBpmFromMs,
} from "./smart-tempo/epoch-shims.js";

export {
  extractYoutubeVideoId,
  msPerBarAtBpm,
  suggestBeat1MsFromPipeAndGap,
  snapBeat1MsToOnset,
  alignBeat1ToChordSyllable,
} from "./smart-tempo/beat1-align.js";

export { evaluateDriftGate } from "./smart-tempo/drift-gate.js";

export {
  snapMsToNearestBeat,
  extendBeatGridToDuration,
  refineBeatGridWithOnsets,
  closestBeatIndex,
  medianBpmFromBeatMs,
  sanitizeBeatGridIbis,
  rescaleBeatGridToBpm,
  selfConsistentScaleBeatGrid,
  preferAudioTempoSeed,
  preferEditorialTempoSeed,
} from "./smart-tempo/beat-grid.js";

export {
  interpolateTickAtWallMs,
  sparsifyTempoNodesFromBeatGrid,
  pruneTempoMapByBpmDelta,
  tempoNodesFromBeatGrid,
  tempoNodesAtBarBoundaries,
} from "./smart-tempo/tempo-nodes.js";

export { runAudioDrivenSmartTempo } from "./smart-tempo/run-audio-smart-tempo.js";

export {
  layoutFormaFromUgBarCounts,
  layoutFormaFromAlignedWords,
} from "./smart-tempo/forma-layout.js";

export {
  filterAnchorsForSmartTempo,
  tempoMapFromTempoNodes,
  tempoNodesFromSectionPlans,
} from "./smart-tempo/tempo-map.js";

export {
  placeUsUgBackingAudioClip,
  audioDurationOverflowWarning,
} from "./smart-tempo/backing-clip.js";
