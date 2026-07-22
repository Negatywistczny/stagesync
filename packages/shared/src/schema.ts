import { z } from "zod";
import { DEFAULT_PPQ } from "./time.js";

/** Catalog entry — denormalized fields for Admin list / Batch PC / Ostrzeżenia. */
export const LibraryProjectEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  updatedAt: z.string().datetime().optional(),
  midiProgramId: z.number().int().min(0).max(127).optional(),
  isTemplate: z.boolean().optional(),
  artist: z.string().optional(),
  genre: z.string().optional(),
  hasMusicXml: z.boolean().optional(),
});

export type LibraryProjectEntry = z.infer<typeof LibraryProjectEntrySchema>;

/** Skeleton library catalog — validated at every edge (API / disk). */
export const LibrarySchema = z.object({
  version: z.literal(1),
  projects: z.array(LibraryProjectEntrySchema),
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
  /** Optional per-section note (Client Forma / drums). */
  note: z.string().optional(),
  /**
   * Interior subsection boundaries as offsets from clip.startTicks (v4 scissors).
   * Relative so move keeps cuts; resize clamps via helpers.
   */
  subsections: z.array(z.number().int().positive()).optional(),
});

export type FormaClip = z.infer<typeof FormaClipSchema>;

/** MusicXML measure map — Kotwice (logicBar → scoreBar). */
export const ScoreBarAnchorSchema = z.object({
  id: z.string().min(1),
  logicBar: z.number().int().positive(),
  scoreBar: z.number().int().positive(),
});

export type ScoreBarAnchor = z.infer<typeof ScoreBarAnchorSchema>;

export const ScoreBarMapSchema = z.object({
  anchors: z.array(ScoreBarAnchorSchema),
});

export type ScoreBarMap = z.infer<typeof ScoreBarMapSchema>;

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
  /** Static peak envelope for Timeline waveform (0…1); max 512 bins. */
  waveformPeaks: z.array(z.number().min(0).max(1)).max(512).optional(),
  /** Optional mean RMS of the full file (0…1). */
  waveformRms: z.number().min(0).max(1).optional(),
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
  /** Trim from source file end (ms); with trimInMs bounds playable window. */
  trimOutMs: z.number().nonnegative().finite().optional(),
  muted: z.boolean().optional(),
  gainDb: z.number().finite().optional(),
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

export const KEY_TONICS = [
  "C",
  "C#",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "F#",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
] as const;

export type KeyTonic = (typeof KEY_TONICS)[number];

export function normalizeKeyTonic(
  raw: unknown,
  fallback: KeyTonic = "C",
): KeyTonic {
  if (typeof raw === "string" && (KEY_TONICS as readonly string[]).includes(raw)) {
    return raw as KeyTonic;
  }
  return fallback;
}

export const KeySignatureSchema = z.object({
  tonic: z.enum(KEY_TONICS),
  mode: z.enum(["major", "minor"]),
});

export type KeySignature = z.infer<typeof KeySignatureSchema>;

export const KeyEventSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  key: KeySignatureSchema,
});

export type KeyEvent = z.infer<typeof KeyEventSchema>;

/**
 * Alpha.8+ parity — keyMap, MIDI PC, metadata, templates (v4 lanes kept).
 */
const ProjectSchemaV5Object = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    formatVersion: z.literal(5),
    updatedAt: z.string().datetime(),
    ppq: z.literal(DEFAULT_PPQ),
    defaultBpm: z.number().positive().finite(),
    defaultMeter: DefaultMeterSchema,
    forma: z.object({
      clips: z.array(FormaClipSchema),
    }),
    tempoMap: z.array(TempoEventSchema),
    meterMap: z.array(MeterEventSchema),
    keyMap: z.array(KeyEventSchema),
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
    scoreBarMap: ScoreBarMapSchema.default({ anchors: [] }),
    midiProgramId: z.number().int().min(0).max(127).optional(),
    isTemplate: z.boolean().optional(),
    artist: z.string().optional(),
    genre: z.string().optional(),
    year: z.number().int().optional(),
  })
  .strict();

export const ProjectSchemaV5 = ProjectSchemaV5Object.superRefine(
  (project, ctx) => {
    if (project.isTemplate === true && project.midiProgramId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Template must not have midiProgramId",
        path: ["midiProgramId"],
      });
    }
  },
);

export type ProjectV5 = z.infer<typeof ProjectSchemaV5>;
export type Project = ProjectV5;

/** Canonical project schema (v5). */
export const ProjectSchema = ProjectSchemaV5;

/**
 * Full-document PUT. `updatedAt` is the client's known version (OCC token);
 * server compares to disk and returns 409 on mismatch, then assigns a new stamp.
 */
export const PutProjectBodySchema = ProjectSchemaV5Object.omit({
  id: true,
}).strict();

export type PutProjectBody = z.infer<typeof PutProjectBodySchema>;

export const CreateProjectBodySchema = z.object({
  name: z.string().min(1),
  fromTemplateId: z.string().min(1).optional(),
  isTemplate: z.boolean().optional(),
});

export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;

export const BatchMidiPcBodySchema = z.object({
  assignments: z.array(
    z.object({
      id: z.string().min(1),
      midiProgramId: z.number().int().min(0).max(127),
    }),
  ),
});

export type BatchMidiPcBody = z.infer<typeof BatchMidiPcBodySchema>;

/** @deprecated Use PutProjectBodySchema for full-document PUT. */
export const UpdateProjectBodySchema = PutProjectBodySchema;

export type UpdateProjectBody = PutProjectBody;

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("stagesync-server"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorDetailSchema = z.object({
  path: z.string(),
  message: z.string(),
  code: z.string().optional(),
});

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.array(ApiErrorDetailSchema).optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export const StageMessageBodySchema = z.object({
  text: z.string().min(1).max(200),
  roles: z.array(z.enum(["karaoke", "grid", "score", "drums"])).optional(),
  ttlMs: z.number().int().positive().optional(),
});

export type StageMessageBody = z.infer<typeof StageMessageBodySchema>;

/** GET /api/system/update-status response */
export const UpdateStatusSchema = z.object({
  current: z.string(),
  latest: z.string().nullable(),
  updateAvailable: z.boolean(),
  /** null when check succeeded; otherwise operator-facing reason (auth / network / empty) */
  error: z.string().nullable().optional(),
});

export type UpdateStatus = z.infer<typeof UpdateStatusSchema>;

/** POST /api/system/apply-update body */
export const ApplyUpdateBodySchema = z.object({
  target: z.enum(["host"]),
});

export type ApplyUpdateBody = z.infer<typeof ApplyUpdateBodySchema>;


/** MIDI port listed by the host (apps/server). */
export const MidiPortSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  direction: z.enum(["input", "output"]),
});

export type MidiPort = z.infer<typeof MidiPortSchema>;

/** Runtime selection + feature flags for Host MIDI. */
export const MidiHostConfigSchema = z.object({
  inputId: z.string().min(1).nullable(),
  outputId: z.string().min(1).nullable(),
  /** Emit MIDI clock / start / stop / SPP on the selected output from transport SSOT. */
  clockOutEnabled: z.boolean(),
});

export type MidiHostConfig = z.infer<typeof MidiHostConfigSchema>;

export const PutMidiHostConfigBodySchema = z
  .object({
    inputId: z.string().min(1).nullable().optional(),
    outputId: z.string().min(1).nullable().optional(),
    clockOutEnabled: z.boolean().optional(),
  })
  .strict();

export type PutMidiHostConfigBody = z.infer<typeof PutMidiHostConfigBodySchema>;

/** Rates are approximate messages (or beats) in the last ~1s. */
export const MidiHostRatesSchema = z.object({
  clockPerSec: z.number().nonnegative(),
  sppPerSec: z.number().nonnegative(),
  pcPerSec: z.number().nonnegative(),
  beatToWsPerSec: z.number().nonnegative(),
});

export type MidiHostRates = z.infer<typeof MidiHostRatesSchema>;

/** GET /api/midi — Admin Host status. */
export const MidiHostStatusSchema = z.object({
  available: z.boolean(),
  backend: z.enum(["native", "mock", "none"]),
  config: MidiHostConfigSchema,
  inputs: z.array(MidiPortSchema),
  outputs: z.array(MidiPortSchema),
  rates: MidiHostRatesSchema,
  /** True while transport is playing and clock-out timer is armed. */
  clockOutActive: z.boolean(),
  lastError: z.string().nullable(),
});

export type MidiHostStatus = z.infer<typeof MidiHostStatusSchema>;
