/**
 * Text-Anchor Bridging — Różdżka 2.0 + Smart Tempo (audio SSOT).
 *
 * Thin barrel: public API re-exports. Implementation lives in `./text-anchor-bridge/`.
 */

export {
  TEXT_ANCHOR_WEAK_ALIGN,
  DEFAULT_BARS_PER_CHORD,
  DEFAULT_BARS_PER_LINE,
} from "./constants.js";

export type {
  TimedWord,
  UgBridgeWord,
  UgBridgeChord,
  TextAnchorBridgeOk,
  TextAnchorBridgeErr,
  TextAnchorBridgeResult,
  TextAnchorBridgeOptions,
  SectionContainer,
  FreezeFormaContainersInput,
  FreezeFormaContainersResult,
  PristineSectionChord,
  BuildPristineSectionGridInput,
  BuildPristineSectionGridResult,
  ApplyUsUgBridgeOptions,
} from "./types.js";

export { normalizeLyricToken, tokenizeLyrics } from "./tokenize.js";

export {
  timedWordsFromUltrastar,
  timedSyllablesFromUltrastar,
} from "./ultrastar-words.js";

export {
  parseChordProLyricLine,
  isUgBridgeNoiseLine,
  parseUgBridgeSections,
} from "./ug-parse.js";

export { alignWordSequences } from "./align.js";

export {
  evenlySpaceOnsetsOnBarGrid,
  interpolateMissingOnsets,
  sectionHasUsSyllables,
  phraseIndicesInSectionWindow,
  chordLineGridOnset,
  mapOnsetsIntoContainer,
  fitOnsetsInContainer,
  enforceMinChordGap,
  placeChordsWithMinGap,
  sealChordLengths,
  barsPerChordForSection,
  sectionLengthBarsFromUg,
  structuralBarsFromUsWalls,
  quantizeChordOnsets,
  structuralBarOffsetsForChordLines,
  chordTickFromSyllableMs,
} from "./onset-grid.js";

export { freezeFormaContainers } from "./forma-freeze.js";

export { buildPristineSectionGrid } from "./pristine-grid.js";

export {
  normalizeTekstBlockTimings,
  remapTekstClipsAlongSolverMap,
  remapMelodyClipsAlongSolverMap,
  annotateTekstSourceSectionsFromAlign,
} from "./clip-remap.js";

export { bridgeUsUgImport } from "./bridge-orchestrator.js";

export {
  suggestGridBpmFromUsUgTexts,
  bridgeUsUgFromTexts,
  applyUsUgBridgeToProject,
  annotateTekstSourceSections,
} from "./bridge-api.js";
