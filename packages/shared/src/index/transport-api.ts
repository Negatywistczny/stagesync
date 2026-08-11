/**
 * @stagesync/shared — Transport WS, loop, setlist, stage cue banner.
 *
 * Explicit named re-exports only (no `export *` from source modules).
 */

export {
  STAGE_CUE_DEFAULT_LOOKAHEAD_MS,
  resolveStageCueBanner,
  stageCueBannerLabel,
  type StageCueBannerClip,
  type StageCueBannerItem,
  type StageCueBannerPriority,
  type StageCueBannerRole,
  type StageCueBannerSession,
} from "../stage-cue-banner.js";

export {
  defaultSetlist,
  normalizeSetlist,
  pruneSetlistToLibrary,
  resolveSetlistNext,
  buildSetlistView,
  projectIdsFromItems,
  itemsFromProjectIds,
  formatSetDurationMs,
  sumSetlistDurationMs,
  SETLIST_SONG_DURATION_ESTIMATE_MS,
  type SetlistEntry,
  type SetlistView,
  type SetlistViewItem,
} from "../setlist.js";

export { mergePreserveById } from "../merge-preserve.js";

export {
  TimeSignatureSchema,
  TransportStateSchema,
  TransportSeekBodySchema,
  TransportPlayBodySchema,
  TransportLoadBodySchema,
  TransportLoopSchema,
  TransportLoopBodySchema,
  TransportTickMessageSchema,
  StageCueMessageSchema,
  StageCueDismissMessageSchema,
  SessionStageMessageSchema,
  LiveDeskSettingsSchema,
  LiveDeskPatchBodySchema,
  LiveDeskMessageSchema,
  SetlistSnapshotMessageSchema,
  TransportWsServerMessageSchema,
  parseTransportTickPayload,
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
  type StageCueMessage,
  type StageCueDismissMessage,
  type SessionStageMessage,
  type LiveDeskSettings,
  type LiveDeskPatchBody,
  type LiveDeskMessage,
  type SetlistSnapshotMessage,
  type TransportWsServerMessage,
} from "../transport.js";

export {
  isUsableLoop,
  normalizeLoop,
  loopWrapTicks,
} from "../transport-loop.js";
