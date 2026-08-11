/**
 * Client chord grid — thin barrel (#834).
 * Implementation: `./clientGrid/*`.
 */

export type {
  GridCycleStep,
  ChordStepSpan,
  GridLiveContext,
} from "./clientGrid/types.js";

export {
  mergeAkordyWithCountdownDigits,
  compressBarChordsToProgression,
  detectCycleLength,
  progressionForBarChords,
  chordStepsForTickRange,
  mergeAdjacentChordSteps,
} from "./clientGrid/progression.js";

export {
  resolveActiveSubsection,
  sectionBarChords,
  resolveNextPhraseBand,
} from "./clientGrid/section-phrase.js";

export {
  cycleStepsWithActive,
  resolveHeroNextSymbol,
  cycleGridTemplateColumns,
  cycleTotalBars,
  buildGridLiveContext,
} from "./clientGrid/cycle-context.js";
