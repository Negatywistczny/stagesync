/**
 * @stagesync/shared — Project seed, resolve, bounds, countdown, Forma subsections, library import.
 *
 * Explicit named re-exports only (no `export *` from source modules).
 */

export {
  createProjectV2Seed,
  createProjectV3Seed,
  createProjectV4Seed,
  createProjectV5Seed,
  createProjectV6Seed,
  createDefaultTemplateProject,
  DEFAULT_TEMPLATE_PROJECT_ID,
  createProjectSeed,
  upgradeProjectV1ToV2,
  upgradeProjectV2ToV3,
  upgradeProjectV3ToV4,
  upgradeProjectV4ToV5,
  upgradeProjectV5ToV6,
  wholeLineTekstBlock,
  withWholeLineTekstBlocks,
  nextMidiProgramId,
} from "../project-seed.js";

export {
  joinTekstBlockTexts,
  withTekstBlockWordSpaces,
} from "../tekst-block-text.js";

export {
  resolveTempoAt,
  resolveMeterAt,
  resolveKeyAt,
  formatKeySignature,
  resolveFormaClipAt,
} from "../project-resolve.js";

export { projectEndTicks, emptyProjectEndTicks } from "../project-bounds.js";

export {
  isCountdownDigitClipId,
  countdownDigitLabels,
  syntheticCountdownTekstClips,
  syntheticCountdownAkordClips,
  syntheticCountdownDisplayFromProject,
  scrubCountdownDigitClips,
  type CountdownDigitLabel,
} from "../countdown-content.js";

export {
  normalizeSubsectionOffsets,
  subsectionMaxChunkTicks,
  defaultSubsections4Bar,
  hasUsableFormaSubsections,
  ensureFormaSubsections,
} from "../forma-subsections.js";

export {
  detectLibraryImportFormat,
  normalizeLibraryImport,
  looksLikeZipBytes,
  ZIP_IMPORT_UNSUPPORTED_PL,
  type LibraryImportFormat,
  type DetectLibraryImportResult,
  type NormalizeLibraryImportResult,
} from "../library-import.js";
