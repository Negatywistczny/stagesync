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
  ProjectSchemaV1,
  ProjectSchemaV2,
  ProjectSchema,
  PutProjectBodySchema,
  CreateProjectBodySchema,
  UpdateProjectBodySchema,
  HealthResponseSchema,
  ApiErrorSchema,
  type Library,
  type FormaClip,
  type ProjectV1,
  type ProjectV2,
  type Project,
  type PutProjectBody,
  type CreateProjectBody,
  type UpdateProjectBody,
  type HealthResponse,
  type ApiError,
} from "./schema.js";

export {
  createProjectV2Seed,
  upgradeProjectV1ToV2,
} from "./project-seed.js";

export {
  resolveTempoAt,
  resolveMeterAt,
  resolveFormaClipAt,
} from "./project-resolve.js";

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
