import { z } from "zod";
import { DEFAULT_PPQ } from "./time.js";

/** Skeleton library catalog — validated at every edge (API / disk). */
export const LibrarySchema = z.object({
  version: z.literal(1),
  projects: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      updatedAt: z.string().datetime().optional(),
    }),
  ),
});

export type Library = z.infer<typeof LibrarySchema>;

export const ProjectIdSchema = z.string().uuid();

export const FormaClipKindSchema = z.enum(["countdown", "section"]);

export const FormaClipSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  kind: FormaClipKindSchema.default("section"),
});

export type FormaClip = z.infer<typeof FormaClipSchema>;

export const TempoEventSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  bpm: z.number().positive().finite(),
});

export const MeterEventSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
});

export const DefaultMeterSchema = z.object({
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
});

export const ProjectAssetKindSchema = z.enum(["audio", "cover", "musicxml"]);

export const ProjectAssetSchema = z.object({
  id: z.string().min(1),
  storageName: z.string().min(1),
  originalName: z.string().min(1),
  kind: ProjectAssetKindSchema,
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  durationMs: z.number().positive().finite().optional(),
});

export type ProjectAsset = z.infer<typeof ProjectAssetSchema>;

export const AudioTrackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  muted: z.boolean().optional(),
  gainDb: z.number().finite().optional(),
});

export type AudioTrack = z.infer<typeof AudioTrackSchema>;

export const AudioClipSchema = z.object({
  id: z.string().min(1),
  trackId: z.string().min(1),
  assetId: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  trimInMs: z.number().nonnegative().finite().optional(),
  muted: z.boolean().optional(),
});

export type AudioClip = z.infer<typeof AudioClipSchema>;

/** Concert setlist — independent of library order (ADR 0009). */
export const SetlistSchema = z.object({
  version: z.literal(1),
  enabled: z.boolean(),
  projectIds: z.array(z.string().uuid()),
  autoAdvance: z.object({
    enabled: z.boolean(),
  }),
});

export type Setlist = z.infer<typeof SetlistSchema>;

export const PutSetlistBodySchema = z.object({
  enabled: z.boolean(),
  projectIds: z.array(z.string().uuid()),
});

export type PutSetlistBody = z.infer<typeof PutSetlistBodySchema>;

export const PatchSetlistAutoAdvanceBodySchema = z.object({
  enabled: z.boolean(),
});

export type PatchSetlistAutoAdvanceBody = z.infer<
  typeof PatchSetlistAutoAdvanceBodySchema
>;

/** Legacy alpha.2 project document (name only). */
export const ProjectSchemaV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  formatVersion: z.literal(1),
  updatedAt: z.string().datetime(),
});

export type ProjectV1 = z.infer<typeof ProjectSchemaV1>;

/** Alpha.3–α5 project document. */
export const ProjectSchemaV2 = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    formatVersion: z.literal(2),
    updatedAt: z.string().datetime(),
    ppq: z.literal(DEFAULT_PPQ),
    defaultBpm: z.number().positive().finite(),
    defaultMeter: DefaultMeterSchema,
    forma: z.object({
      clips: z.array(FormaClipSchema),
    }),
    tempoMap: z.array(TempoEventSchema),
    meterMap: z.array(MeterEventSchema),
  })
  .strict();

export type ProjectV2 = z.infer<typeof ProjectSchemaV2>;

/** Alpha.6+ project document — assets + audio refs (no playback engine). */
export const ProjectSchemaV3 = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    formatVersion: z.literal(3),
    updatedAt: z.string().datetime(),
    ppq: z.literal(DEFAULT_PPQ),
    defaultBpm: z.number().positive().finite(),
    defaultMeter: DefaultMeterSchema,
    forma: z.object({
      clips: z.array(FormaClipSchema),
    }),
    tempoMap: z.array(TempoEventSchema),
    meterMap: z.array(MeterEventSchema),
    assets: z.array(ProjectAssetSchema),
    audioTracks: z.array(AudioTrackSchema),
    audioClips: z.array(AudioClipSchema),
  })
  .strict();

export type ProjectV3 = z.infer<typeof ProjectSchemaV3>;

/** Content lane clip — Tekst (α7). */
export const TekstClipSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  text: z.string(),
});

export type TekstClip = z.infer<typeof TekstClipSchema>;

/** Content lane clip — Akordy (α7 schema; edit optional). */
export const AkordClipSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  symbol: z.string().min(1),
});

export type AkordClip = z.infer<typeof AkordClipSchema>;

/** Content lane clip — Cue (α7 schema; edit optional). */
export const CueClipSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  label: z.string().min(1),
});

export type CueClip = z.infer<typeof CueClipSchema>;

/** Alpha.7+ — content lanes Tekst / Akordy / Cue. */
export const ProjectSchemaV4 = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    formatVersion: z.literal(4),
    updatedAt: z.string().datetime(),
    ppq: z.literal(DEFAULT_PPQ),
    defaultBpm: z.number().positive().finite(),
    defaultMeter: DefaultMeterSchema,
    forma: z.object({
      clips: z.array(FormaClipSchema),
    }),
    tempoMap: z.array(TempoEventSchema),
    meterMap: z.array(MeterEventSchema),
    assets: z.array(ProjectAssetSchema),
    audioTracks: z.array(AudioTrackSchema),
    audioClips: z.array(AudioClipSchema),
    tekst: z.object({
      clips: z.array(TekstClipSchema),
    }),
    akordy: z.object({
      clips: z.array(AkordClipSchema),
    }),
    cue: z.object({
      clips: z.array(CueClipSchema),
    }),
  })
  .strict();

export type ProjectV4 = z.infer<typeof ProjectSchemaV4>;
export type Project = ProjectV4;

/** Canonical project schema (v4). */
export const ProjectSchema = ProjectSchemaV4;

export const PutProjectBodySchema = ProjectSchemaV4.omit({
  id: true,
  updatedAt: true,
}).strict();

export type PutProjectBody = z.infer<typeof PutProjectBodySchema>;

export const CreateProjectBodySchema = z.object({
  name: z.string().min(1),
});

export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;

/** @deprecated Use PutProjectBodySchema for full-document PUT. */
export const UpdateProjectBodySchema = PutProjectBodySchema;

export type UpdateProjectBody = PutProjectBody;

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("stagesync-server"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const StageMessageBodySchema = z.object({
  text: z.string().min(1).max(200),
  roles: z.array(z.enum(["karaoke", "grid", "score", "drums"])).optional(),
  ttlMs: z.number().int().positive().optional(),
});

export type StageMessageBody = z.infer<typeof StageMessageBodySchema>;
