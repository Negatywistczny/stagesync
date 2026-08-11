/**
 * @stagesync/shared — Score bar map, chords, sections, transpose, clip collision, audio clips.
 *
 * Explicit named re-exports only (no `export *` from source modules).
 */

export {
  DEFAULT_SCORE_ANCHORS,
  normalizeAnchors,
  normalizeMap,
  songBarToScoreBar,
  scoreBarToSongBar,
  ticksFromScoreBar,
  type ScoreBarMapLike,
  type ScoreBarToSongBarOptions,
  type NormalizedScoreAnchor,
} from "../score-bar-map.js";

export {
  toLiteralStorage,
  formatChordParts,
  parseAndFormat,
  parseAndFormatParts,
  formatHybridPolishB,
  formatMusicalAccidentals,
  resolveChordNameParts,
  type ChordDisplayOptions,
  type ChordNameParts,
} from "../chord-display.js";

export {
  COUNTDOWN_NAME,
  formatSectionNameForDisplay,
  normalizeSectionName,
  type FormatSectionNameOptions,
} from "../section-names.js";

export {
  INSTRUMENT_PITCH_MANUAL_MAX,
  INSTRUMENT_PITCH_MANUAL_MIN,
  INSTRUMENT_PITCH_PRESETS,
  applyInstrumentPitchToChord,
  clampManualInstrumentPitch,
  clampSemitoneOffset,
  isInstrumentPitchMode,
  parseTonicSymbol,
  resolveInstrumentPitchOffset,
  resolveTranspose,
  transposeChord,
  type InstrumentPitchMode,
  type TransposeResolve,
} from "../transpose.js";

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
} from "../clip-collision.js";

export {
  audioClipAbutGapTicks,
  audioClipBufferOffsetSec,
  audioClipBufferOffsetSecAlongMaps,
  audioClipEndTicks,
  audioClipPlayableMs,
  audioClipRemainingSec,
  audioClipRemainingSecAlongMaps,
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
} from "../audio-clip.js";
