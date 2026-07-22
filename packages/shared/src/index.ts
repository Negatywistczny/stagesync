export {
  DEFAULT_PPQ,
  assertValidTimeSignature,
  ticksPerBar,
  localTicksPerBeat,
  ticksPerMs,
  elapsedToTicks,
  ticksToMs,
  ticksToBbt,
  bbtToTicks,
  toDisplayBar,
  fromDisplayBar,
  quartersToTicks,
  ticksToQuarters,
  absBeatToTicks,
  type TimeSignature,
  type Bbt,
} from "./time.js";

export {
  LibrarySchema,
  LibraryProjectEntrySchema,
  BPM_MIN,
  BPM_MAX,
  BpmSchema,
  ProjectIdSchema,
  FormaClipKindSchema,
  FormaClipSchema,
  TempoEventSchema,
  MeterEventSchema,
  KeySignatureSchema,
  KeyEventSchema,
  ScoreBarAnchorSchema,
  ScoreBarMapSchema,
  ProjectAssetKindSchema,
  ProjectAssetSchema,
  AudioTrackSchema,
  AudioClipSchema,
  SetlistSchema,
  PutSetlistBodySchema,
  PatchSetlistAutoAdvanceBodySchema,
  ProjectSchemaV1,
  ProjectSchemaV2,
  ProjectSchemaV3,
  ProjectSchemaV4,
  ProjectSchemaV5,
  ProjectSchema,
  PutProjectBodySchema,
  CreateProjectBodySchema,
  BatchMidiPcBodySchema,
  UpdateProjectBodySchema,
  HealthResponseSchema,
  ApiErrorDetailSchema,
  ApiErrorSchema,
  StageMessageBodySchema,
  ClientHelloMessageSchema,
  TekstClipSchema,
  AkordClipSchema,
  CueClipSchema,
  type Library,
  type LibraryProjectEntry,
  type FormaClip,
  type TekstClip,
  type AkordClip,
  type CueClip,
  type ProjectAsset,
  type AudioTrack,
  type AudioClip,
  type Setlist,
  type PutSetlistBody,
  type PatchSetlistAutoAdvanceBody,
  type ProjectV1,
  type ProjectV2,
  type ProjectV3,
  type ProjectV4,
  type ProjectV5,
  type Project,
  type KeySignature,
  type KeyEvent,
  type ScoreBarAnchor,
  type ScoreBarMap,
  type PutProjectBody,
  type CreateProjectBody,
  type BatchMidiPcBody,
  type UpdateProjectBody,
  type HealthResponse,
  type ApiErrorDetail,
  type ApiError,
  type StageMessageBody,
  type ClientHelloMessage,
  UpdateStatusSchema,
  ApplyUpdateBodySchema,
  MidiPortSchema,
  MidiHostConfigSchema,
  PutMidiHostConfigBodySchema,
  MidiHostRatesSchema,
  MidiHostStatusSchema,
  type UpdateStatus,
  type ApplyUpdateBody,
  type MidiPort,
  type MidiHostConfig,
  type PutMidiHostConfigBody,
  type MidiHostRates,
  type MidiHostStatus,
} from "./schema.js";

export {
  MIDI_CLOCK_PPQN,
  MIDI_SPP_PER_QUARTER,
  ticksPerMidiClock,
  ticksToMidiClockIndex,
  midiClockIndexToTicks,
  ticksToSpp,
  sppToTicks,
  midiClockIntervalMs,
  elapsedMsToMidiClocks,
} from "./midi-clock.js";

export {
  createProjectV2Seed,
  createProjectV3Seed,
  createProjectV4Seed,
  createProjectV5Seed,
  createDefaultTemplateProject,
  DEFAULT_TEMPLATE_PROJECT_ID,
  createProjectSeed,
  upgradeProjectV1ToV2,
  upgradeProjectV2ToV3,
  upgradeProjectV3ToV4,
  upgradeProjectV4ToV5,
  nextMidiProgramId,
} from "./project-seed.js";

export {
  resolveTempoAt,
  resolveMeterAt,
  resolveKeyAt,
  formatKeySignature,
  resolveFormaClipAt,
} from "./project-resolve.js";


export {
  projectEndTicks,
  emptyProjectEndTicks,
} from "./project-bounds.js";

export {
  defaultSetlist,
  normalizeSetlist,
  pruneSetlistToLibrary,
  resolveSetlistNext,
  buildSetlistView,
  type SetlistEntry,
  type SetlistView,
} from "./setlist.js";

export { mergePreserveById } from "./merge-preserve.js";

export {
  TimeSignatureSchema,
  TransportStateSchema,
  TransportSeekBodySchema,
  TransportPlayBodySchema,
  TransportLoadBodySchema,
  TransportLoopSchema,
  TransportLoopBodySchema,
  TransportTickMessageSchema,
  DEFAULT_TRANSPORT_BPM,
  DEFAULT_TRANSPORT_METER,
  TRANSPORT_TICK_INTERVAL_MS,
  defaultTransportState,
  transportHomeTicks,
  type TransportHomeSource,
  type TransportState,
  type TransportSeekBody,
  type TransportPlayBody,
  type TransportLoadBody,
  type TransportLoop,
  type TransportLoopBody,
  type TransportTickMessage,
} from "./transport.js";

export {
  isUsableLoop,
  normalizeLoop,
  loopWrapTicks,
} from "./transport-loop.js";

export {
  DEFAULT_SCORE_ANCHORS,
  normalizeAnchors,
  normalizeMap,
  songBarToScoreBar,
  logicBarToScoreBar,
  type ScoreBarMapLike,
  type NormalizedScoreAnchor,
} from "./score-bar-map.js";

export {
  chordLiteralToSymbolDisplay,
  formatChordForDisplay,
  formatHybridPolishB,
  type ChordDisplayOptions,
} from "./chord-display.js";

export {
  getDisplayTicks,
  wrapDisplayTicks,
  type TransportAnchor,
} from "./soft-clock.js";

export {
  quantizeTicks,
  snapTicksToBarStart,
  snapTicksToBeatGrid,
  snapTicksToSubdivision,
  DEFAULT_SNAP_MODE,
  type SnapMode,
  type SnapContext,
  type SnapSubdivisionParts,
} from "./snap-grid.js";

export {
  clampFormaSubsections,
  deleteClip,
  insertGapSectionAfterCountdown,
  insertSpanOverwrite,
  moveClipNoOverlap,
  moveClipsRigidDelta,
  moveSectionsFromId,
  placeClipNoOverlap,
  allocateUniqueClipId,
  resizeClipNoOverlap,
  splitClipAt,
  type ClipEdge,
  type CollisionOpts,
  type SplitClipOpts,
} from "./clip-collision.js";

export {
  audioClipAbutGapTicks,
  audioClipBufferOffsetSec,
  audioClipEndTicks,
  audioClipPlayableMs,
  audioClipRemainingSec,
  audioFadeGainAtMs,
  applyAbutCrossfade,
  clampAudioClipToAsset,
  clampAudioFades,
  fadeInMsOf,
  fadeOutMsOf,
  findAbutNeighbor,
  gainDbToLinear,
  lengthTicksFromAssetWindow,
  maxAudioLengthTicks,
  resizeAudioClipEnd,
  resizeAudioClipStart,
  trimInMsOf,
  trimOutMsOf,
  type AudioTempoCtx,
} from "./audio-clip.js";

export {
  importUgText,
  sealAkordyLengths,
  chordOnsetsInBar,
  type UgImportErr,
  type UgImportOk,
  type UgImportOptions,
  type UgImportResult,
} from "./ug-import.js";

export {
  wandContentToForma,
  type WandMode,
  type WandScope,
} from "./wand.js";

export {
  isCountdownDigitClipId,
  countdownDigitLabels,
  syntheticCountdownTekstClips,
  syntheticCountdownAkordClips,
  syntheticCountdownDisplayFromProject,
  scrubCountdownDigitClips,
  regenerateCountdownContent,
  buildCountdownDigitTekstClips,
  type CountdownDigitLabel,
} from "./countdown-content.js";

export {
  migrateLegacySong,
  migrateLegacyDatabase,
  isLegacyCountdownSection,
  parseLegacyMeter,
  legacySongIdToProjectId,
  mapLegacySubsectionOffsets,
  type LegacySong,
  type LegacyDatabase,
  type LegacySection,
  type MigrateLegacySongOptions,
  type MigrateLegacySongResult,
  type MigrateLegacyDatabaseResult,
} from "./legacy-migrate.js";

export {
  normalizeSubsectionOffsets,
  subsectionMaxChunkTicks,
  defaultSubsections4Bar,
  hasUsableFormaSubsections,
  ensureFormaSubsections,
} from "./forma-subsections.js";

export {
  detectLibraryImportFormat,
  normalizeLibraryImport,
  looksLikeZipBytes,
  ZIP_IMPORT_UNSUPPORTED_PL,
  type LibraryImportFormat,
  type DetectLibraryImportResult,
  type NormalizeLibraryImportResult,
} from "./library-import.js";
