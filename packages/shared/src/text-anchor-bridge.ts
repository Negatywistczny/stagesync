/**
 * Text-Anchor Bridging — Różdżka 2.0 + Smart Tempo (audio SSOT).
 *
 * Thin barrel: public API re-exports. Implementation lives in `./text-anchor-bridge/`.
 */

export {
  TEXT_ANCHOR_WEAK_ALIGN,
  DEFAULT_BARS_PER_CHORD,
  DEFAULT_BARS_PER_LINE,
} from "./text-anchor-bridge/constants.js";

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
} from "./text-anchor-bridge/types.js";

export {
  normalizeLyricToken,
  tokenizeLyrics,
} from "./text-anchor-bridge/tokenize.js";

export {
  timedWordsFromUltrastar,
  timedSyllablesFromUltrastar,
} from "./text-anchor-bridge/ultrastar-words.js";

export {
  parseChordProLyricLine,
  isUgBridgeNoiseLine,
  parseUgBridgeSections,
} from "./text-anchor-bridge/ug-parse.js";

export { alignWordSequences } from "./text-anchor-bridge/align.js";

export {
  evenlySpaceOnsetsOnBarGrid,
  interpolateMissingOnsets,
  sectionHasUsSyllables,
  phraseIndicesInSectionWindow,
  chordLineGridOnset,
  mapOnsetsIntoContainer,
  fitOnsetsInContainer,
  enforceMinChordGap,
  barsPerChordForSection,
  sectionLengthBarsFromUg,
  structuralBarsFromUsWalls,
  quantizeChordOnsets,
  structuralBarOffsetsForChordLines,
  chordTickFromSyllableMs,
} from "./text-anchor-bridge/onset-grid.js";

export { freezeFormaContainers } from "./text-anchor-bridge/forma-freeze.js";

export { buildPristineSectionGrid } from "./text-anchor-bridge/pristine-grid.js";

export {
  normalizeTekstBlockTimings,
  remapTekstClipsAlongSolverMap,
  remapMelodyClipsAlongSolverMap,
  annotateTekstSourceSectionsFromAlign,
} from "./text-anchor-bridge/clip-remap.js";

export { bridgeUsUgImport } from "./text-anchor-bridge/bridge-orchestrator.js";

export {
  suggestGridBpmFromUsUgTexts,
  bridgeUsUgFromTexts,
  applyUsUgBridgeToProject,
  annotateTekstSourceSections,
} from "./text-anchor-bridge/bridge-api.js";
