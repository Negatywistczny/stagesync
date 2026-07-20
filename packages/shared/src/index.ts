export {
  DEFAULT_PPQ,
  assertValidTimeSignature,
  ticksPerBar,
  localTicksPerBeat,
  ticksPerMs,
  elapsedToTicks,
  ticksToBbt,
  bbtToTicks,
  toDisplayBar,
  fromDisplayBar,
  quartersToTicks,
  ticksToQuarters,
  type TimeSignature,
  type Bbt,
} from "./time.js";

export {
  LibrarySchema,
  ProjectIdSchema,
  FormaClipKindSchema,
  FormaClipSchema,
  TempoEventSchema,
  MeterEventSchema,
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
  ProjectSchema,
  PutProjectBodySchema,
  CreateProjectBodySchema,
  UpdateProjectBodySchema,
  HealthResponseSchema,
  ApiErrorSchema,
  StageMessageBodySchema,
  type Library,
  type FormaClip,
  type ProjectAsset,
  type AudioTrack,
  type AudioClip,
  type Setlist,
  type PutSetlistBody,
  type PatchSetlistAutoAdvanceBody,
  type ProjectV1,
  type ProjectV2,
  type ProjectV3,
  type Project,
  type PutProjectBody,
  type CreateProjectBody,
  type UpdateProjectBody,
  type HealthResponse,
  type ApiError,
  type StageMessageBody,
} from "./schema.js";

export {
  createProjectV2Seed,
  createProjectV3Seed,
  createProjectSeed,
  upgradeProjectV1ToV2,
  upgradeProjectV2ToV3,
} from "./project-seed.js";

export {
  resolveTempoAt,
  resolveMeterAt,
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
  TransportTickMessageSchema,
  DEFAULT_TRANSPORT_BPM,
  DEFAULT_TRANSPORT_METER,
  TRANSPORT_TICK_INTERVAL_MS,
  defaultTransportState,
  type TransportState,
  type TransportSeekBody,
  type TransportPlayBody,
  type TransportLoadBody,
  type TransportTickMessage,
} from "./transport.js";

export {
  getDisplayTicks,
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
