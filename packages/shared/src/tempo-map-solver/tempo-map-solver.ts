/**
 * MultiPassTempoSolver — builds a sparse variable TempoMap (E2 pruning) from
 * (ms, targetTick) anchors. Does **not** move Forma walls (S3): only emits
 * TempoEvent[].
 *
 * Thin barrel: public API re-exports. Implementation lives in `./tempo-map-solver/`.
 */

export {
  TEMPO_SOLVER_HIGH_WEIGHT,
  TEMPO_SOLVER_SECTION_WEIGHT,
  TEMPO_SOLVER_CHORD_WEIGHT,
  TEMPO_SOLVER_SYLLABLE_WEIGHT,
  TEMPO_SOLVER_PRUNE_DELTA_BPM,
  TEMPO_SOLVER_MAX_STEP_RATIO,
  TEMPO_SOLVER_SEED_METRO_MAX_RATIO,
  TEMPO_SOLVER_ANACRUSIS_MAX_BARS,
  TEMPO_MAP_MIN_BPM,
  TEMPO_MAP_MAX_BPM,
} from "./constants.js";

export type {
  TempoAnchorKind,
  TempoSolverAnchor,
  TempoSolverSectionPlan,
  MultiPassTempoSolverInput,
  MultiPassTempoSolverResult,
  AnacrusisGapInput,
  MsTickAnchor,
} from "./types.js";

export {
  weightForTempoAnchorKind,
  computeSeedBpmFromAnchors,
  applySeedMetronomeFallback,
} from "./seed.js";

export {
  isAnacrusisMs,
  sectionBeat1Ms,
  sectionBeat1MsFromVocalMs,
  anacrusisPickupBarsBeforeSection,
  layoutContiguousFormaPlans,
  pristineBarsFromMsSpan,
} from "./anacrusis.js";

export {
  isTickOnBarOrHalf,
  softClampBpmToSeed,
  softClampBpmAdjacent,
  thinMsTickAnchors,
  resolveAnchorTargetTicks,
  tempoEventsFromMsTickAnchors,
} from "./anchors.js";

export { runMultiPassTempoSolver } from "./multipass.js";
