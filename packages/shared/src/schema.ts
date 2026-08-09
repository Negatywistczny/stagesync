import { z } from "zod";
import { assertValidTimeSignature, DEFAULT_PPQ } from "./time.js";
import { TrackColorSchema, TrackIconSchema } from "./track-appearance.js";
import {
  AudioBusSchema,
  AudioHardwareOutputSchema,
  ChannelModeSchema,
  MasterOutputRoutingSchema,
  MixerOutputDestSchema,
  MAX_AUDIO_HARDWARE_OUTPUTS,
  busGraphHasCycle,
  masterOutputOverlapsHwPatches,
} from "./mixer-routing.js";
import {
  AppearanceProfileIdSchema,
  normalizeAppearanceProfile,
} from "./theme-default.js";

function refineMeterForPpq(
  ts: { numerator: number; denominator: number },
  ctx: z.RefinementCtx,
) {
  try {
    assertValidTimeSignature(ts, DEFAULT_PPQ);
  } catch (err) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        err instanceof Error
          ? err.message
          : "Invalid meter for default PPQ (ticksPerBar must be integer)",
    });
  }
}

/** UI + API range for tempo (Timeline inputs use 20…400). */
export const BPM_MIN = 20;
export const BPM_MAX = 400;
export const BpmSchema = z.number().finite().min(BPM_MIN).max(BPM_MAX);

/** Catalog entry — denormalized fields for Admin list / Batch PC / Ostrzeżenia. */
export const LibraryProjectEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  updatedAt: z.string().datetime().optional(),
  midiProgramId: z.number().int().min(0).max(127).optional(),
  isTemplate: z.boolean().optional(),
  artist: z.string().max(200).optional(),
  genre: z.string().max(200).optional(),
  hasMusicXml: z.boolean().optional(),
  /** From project.defaultBpm (Admin list badges / inspector). */
  defaultBpm: BpmSchema.optional(),
  /** Starting key at tick 0 (`formatKeySignature`); omit when keyMap empty. */
  keyLabel: z.string().min(1).max(16).optional(),
  /** Song length from project bounds + tempo map (ms). */
  durationMs: z.number().finite().nonnegative().optional(),
});

export type LibraryProjectEntry = z.infer<typeof LibraryProjectEntrySchema>;

/** Skeleton library catalog — validated at every edge (API / disk). */
export const LibrarySchema = z
  .object({
    version: z.literal(1),
    projects: z.array(LibraryProjectEntrySchema).max(1024),
  })
  .strict();

export type Library = z.infer<typeof LibrarySchema>;

export const ProjectIdSchema = z.string().uuid();

export const FormaClipKindSchema = z.enum(["countdown", "section"]);

export const FormaClipSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(120),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  kind: FormaClipKindSchema.default("section"),
  /** Optional per-section note (Client Forma / drums). */
  note: z.string().max(500).optional(),
  /**
   * Interior subsection boundaries as offsets from clip.startTicks (v4 scissors).
   * Relative so move keeps cuts; resize clamps via helpers.
   */
  subsections: z.array(z.number().int().positive()).max(64).optional(),
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
  anchors: z.array(ScoreBarAnchorSchema).max(512),
});

export type ScoreBarMap = z.infer<typeof ScoreBarMapSchema>;

export const TempoEventSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  bpm: BpmSchema,
});

export type TempoEvent = z.infer<typeof TempoEventSchema>;

export const MeterEventSchema = z
  .object({
    id: z.string().min(1),
    startTicks: z.number().int(),
    numerator: z.number().int().positive(),
    denominator: z.number().int().positive(),
  })
  .superRefine((m, ctx) =>
    refineMeterForPpq(
      { numerator: m.numerator, denominator: m.denominator },
      ctx,
    ),
  );

export type MeterEvent = z.infer<typeof MeterEventSchema>;

export const DefaultMeterSchema = z
  .object({
    numerator: z.number().int().positive(),
    denominator: z.number().int().positive(),
  })
  .superRefine(refineMeterForPpq);

export const ProjectAssetKindSchema = z.enum(["audio", "cover", "musicxml"]);

export const ProjectAssetSchema = z.object({
  id: z.string().min(1),
  storageName: z.string().min(1).max(200),
  originalName: z.string().min(1).max(512),
  kind: ProjectAssetKindSchema,
  mimeType: z.string().min(1).max(128),
  sizeBytes: z
    .number()
    .int()
    .nonnegative()
    .max(100 * 1024 * 1024),
  durationMs: z
    .number()
    .positive()
    .finite()
    .max(24 * 60 * 60 * 1000)
    .optional(),
  /** Static peak envelope for Timeline waveform (0…1); max 512 bins. */
  waveformPeaks: z.array(z.number().min(0).max(1)).max(512).optional(),
  /** Optional mean RMS of the full file (0…1). */
  waveformRms: z.number().min(0).max(1).optional(),
});

export type ProjectAsset = z.infer<typeof ProjectAssetSchema>;

export const AudioTrackSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  muted: z.boolean().optional(),
  gainDb: z.number().finite().min(-60).max(24).optional(),
  /** Stereo pan / balance −1 (L) … +1 (R); omit / undefined = center. */
  pan: z.number().finite().min(-1).max(1).optional(),
  /**
   * Mono = StereoPanner; stereo = True Balance (not pan law).
   * Omit → stereo (empty tracks); set from file channel count on import.
   */
  channelMode: ChannelModeSchema.optional(),
  /** Closed DAW palette — Mixer banner + Timeline dock / waveform. */
  color: TrackColorSchema.optional(),
  /** Closed instrument badge enum — Mixer + dock. */
  icon: TrackIconSchema.optional(),
  /**
   * Mix destination: Master (omit) or a project bus.
   * Physical multi-outs are not in the model yet — no fake Out N–M.
   */
  output: MixerOutputDestSchema.optional(),
});

export type AudioTrack = z.infer<typeof AudioTrackSchema>;

export const AudioClipSchema = z.object({
  id: z.string().min(1),
  trackId: z.string().min(1),
  assetId: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  trimInMs: z
    .number()
    .nonnegative()
    .finite()
    .max(24 * 60 * 60 * 1000)
    .optional(),
  /** Trim from source file end (ms); with trimInMs bounds playable window. */
  trimOutMs: z
    .number()
    .nonnegative()
    .finite()
    .max(24 * 60 * 60 * 1000)
    .optional(),
  muted: z.boolean().optional(),
  gainDb: z.number().finite().min(-60).max(24).optional(),
  /** Fade-in length from clip start (ms of playable window). */
  fadeInMs: z.number().nonnegative().finite().optional(),
  /** Fade-out length ending at clip end (ms of playable window). */
  fadeOutMs: z.number().nonnegative().finite().optional(),
  /** Loop source within clip span while playhead is inside ([ADR 0008]). */
  loop: z.boolean().optional(),
});

export type AudioClip = z.infer<typeof AudioClipSchema>;

/** Setlist break / announcement — counts toward duration, not a playable song. */
export const SetlistBreakItemSchema = z
  .object({
    type: z.literal("break"),
    id: z.string().uuid(),
    label: z.string().trim().min(1).max(120),
    durationMinutes: z.number().int().min(1).max(180),
  })
  .strict();

export type SetlistBreakItem = z.infer<typeof SetlistBreakItemSchema>;

export const SetlistProjectItemSchema = z
  .object({
    type: z.literal("project"),
    projectId: z.string().uuid(),
  })
  .strict();

export type SetlistProjectItem = z.infer<typeof SetlistProjectItemSchema>;

export const SetlistItemSchema = z.discriminatedUnion("type", [
  SetlistProjectItemSchema,
  SetlistBreakItemSchema,
]);

export type SetlistItem = z.infer<typeof SetlistItemSchema>;

/** Default concert time-budget target for Admin Set summary bar (minutes). */
export const SETLIST_DEFAULT_TIME_BUDGET_MINUTES = 45;

/**
 * Concert setlist — independent of library order (ADR 0009).
 * `items` is canonical (projects + breaks); `projectIds` is derived for
 * auto-advance / legacy readers and always rewritten on normalize.
 */
const SetlistObjectSchema = z
  .object({
    version: z.literal(1),
    enabled: z.boolean(),
    items: z.array(SetlistItemSchema).max(256),
    projectIds: z.array(z.string().uuid()).max(256),
    autoAdvance: z
      .object({
        enabled: z.boolean(),
      })
      .strict(),
    timeBudgetMinutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional(),
  })
  .strict();

function coerceSetlistInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const hasItems = Array.isArray(o.items);
  const hasProjectIds = Array.isArray(o.projectIds);
  if (!hasItems && hasProjectIds) {
    const projectIds = o.projectIds as unknown[];
    return {
      ...o,
      items: projectIds
        .filter((id): id is string => typeof id === "string")
        .map((projectId) => ({ type: "project" as const, projectId })),
    };
  }
  if (hasItems && !hasProjectIds) {
    const items = o.items as unknown[];
    const projectIds: string[] = [];
    for (const item of items) {
      if (
        item &&
        typeof item === "object" &&
        (item as { type?: unknown }).type === "project" &&
        typeof (item as { projectId?: unknown }).projectId === "string"
      ) {
        projectIds.push((item as { projectId: string }).projectId);
      }
    }
    return { ...o, projectIds };
  }
  return o;
}

export const SetlistSchema = z.preprocess(
  coerceSetlistInput,
  SetlistObjectSchema,
);

export type Setlist = z.infer<typeof SetlistObjectSchema>;

export const PutSetlistBodySchema = z
  .object({
    enabled: z.boolean(),
    items: z.array(SetlistItemSchema).max(256).optional(),
    /** Legacy body — converted to project items when `items` omitted. */
    projectIds: z.array(z.string().uuid()).max(256).optional(),
    timeBudgetMinutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.items === undefined && body.projectIds === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide items or projectIds",
        path: ["items"],
      });
    }
  });

export type PutSetlistBody = z.infer<typeof PutSetlistBodySchema>;

export const PatchSetlistAutoAdvanceBodySchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

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
    defaultBpm: BpmSchema,
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
    defaultBpm: BpmSchema,
    defaultMeter: DefaultMeterSchema,
    forma: z.object({
      clips: z.array(FormaClipSchema),
    }),
    tempoMap: z.array(TempoEventSchema),
    meterMap: z.array(MeterEventSchema),
    assets: z.array(ProjectAssetSchema).max(256),
    audioTracks: z.array(AudioTrackSchema).max(64),
    audioClips: z.array(AudioClipSchema).max(512),
  })
  .strict();

export type ProjectV3 = z.infer<typeof ProjectSchemaV3>;

/** V4/V5 line clip — no syllable blocks. */
export const TekstClipLineSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  text: z.string().max(2000),
  /** UG / legacy: Forma section name affinity for Różdżka membership. */
  sourceSection: z.string().max(200).optional(),
});

export type TekstClipLine = z.infer<typeof TekstClipLineSchema>;

/** Optional vocal role on a timed tekst block (Client filter / future). */
export const TekstBlockRoleSchema = z.enum([
  "vocal_1",
  "vocal_2",
  "backing",
  "all",
]);

export type TekstBlockRole = z.infer<typeof TekstBlockRoleSchema>;

/**
 * Timed tekst block (syllable / word) — positions are clip-absolute ticks
 * (same coordinate system as the parent line clip).
 */
export const TekstBlockSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  text: z.string().max(2000),
  role: TekstBlockRoleSchema.optional(),
});

export type TekstBlock = z.infer<typeof TekstBlockSchema>;

/** Content lane clip — Tekst (V6+): line + required blocks (min 1). */
export const TekstClipSchema = TekstClipLineSchema.extend({
  blocks: z.array(TekstBlockSchema).min(1),
});

export type TekstClip = z.infer<typeof TekstClipSchema>;

/** Thin melody note clip (schema-only in 5.4 — no Timeline editor). */
export const MelodyNoteClipSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  pitchMidi: z.number().int().min(0).max(127),
});

export type MelodyNoteClip = z.infer<typeof MelodyNoteClipSchema>;

/** Content lane clip — Akordy (α7 schema; edit optional). */
export const AkordClipSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  symbol: z.string().min(1).max(64),
  /** UG / legacy: vocal line id this chord row belongs to (Różdżka layer L). */
  sourceLineId: z.string().min(1).max(128).optional(),
});

export type AkordClip = z.infer<typeof AkordClipSchema>;

/** Performance roles that can receive a Timeline cue (v4 cue-model). */
export const CueClipRoleSchema = z.enum(["karaoke", "grid", "score", "drums"]);

export type CueClipRole = z.infer<typeof CueClipRoleSchema>;

/** Cue sample routing — Master | Bus | HW (HW gated at UI/runtime). */
export const CueSampleOutputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("master") }),
  z.object({ kind: z.literal("bus"), busId: z.string().min(1).max(64) }),
  z.object({
    kind: z.literal("hw_out"),
    hwOutputId: z.string().min(1).max(64),
  }),
]);

export type CueSampleOutput = z.infer<typeof CueSampleOutputSchema>;

/**
 * Optional audio sample on a Cue clip (#430).
 * Omit `sample` → text banner only (v5.1 behavior).
 */
export const CueSampleConfigSchema = z
  .object({
    assetId: z.string().min(1),
    /** Default one-shot (plays full file). Gated = stop at clip end. */
    mode: z.enum(["one-shot", "gated"]).optional(),
    /** Default tick (SSOT startTicks). next-beat / immediate for GO pad. */
    quantization: z.enum(["tick", "next-beat", "immediate"]).optional(),
    gainDb: z.number().finite().min(-60).max(24).optional(),
    pan: z.number().finite().min(-1).max(1).optional(),
    output: CueSampleOutputSchema.optional(),
    /** Continue after transport Stop when true. */
    playPostStop: z.boolean().optional(),
    /** Retrigger restarts; choke stops previous instance. Default retrigger. */
    polyphony: z.enum(["retrigger", "choke"]).optional(),
  })
  .strict();

export type CueSampleConfig = z.infer<typeof CueSampleConfigSchema>;

/** Content lane clip — Cue (α7+; roles/priority = v4 parity; sample = 5.2+). */
export const CueClipSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  label: z.string().min(1).max(200),
  /** Empty / omitted = all roles. */
  roles: z.array(CueClipRoleSchema).max(4).optional(),
  /** Omit or `normal`; persist `alert` when highlighted. */
  priority: z.enum(["normal", "alert"]).optional(),
  /** Optional sampler config — same startTicks as the banner. */
  sample: CueSampleConfigSchema.optional(),
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
    defaultBpm: BpmSchema,
    defaultMeter: DefaultMeterSchema,
    forma: z.object({
      clips: z.array(FormaClipSchema).max(256),
    }),
    tempoMap: z.array(TempoEventSchema),
    meterMap: z.array(MeterEventSchema),
    assets: z.array(ProjectAssetSchema).max(256),
    audioTracks: z.array(AudioTrackSchema).max(64),
    audioClips: z.array(AudioClipSchema).max(512),
    tekst: z.object({
      clips: z.array(TekstClipLineSchema),
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
  if (
    typeof raw === "string" &&
    (KEY_TONICS as readonly string[]).includes(raw)
  ) {
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
    name: z.string().trim().min(1).max(200),
    formatVersion: z.literal(5),
    updatedAt: z.string().datetime(),
    ppq: z.literal(DEFAULT_PPQ),
    defaultBpm: BpmSchema,
    defaultMeter: DefaultMeterSchema,
    forma: z.object({
      clips: z.array(FormaClipSchema).max(256),
    }),
    /**
     * Smart Tempo (US+UG) may emit one event per beat for long songs
     * (`SMART_TEMPO_MAX_BEATS` = 2048). Keep in sync with that ceiling.
     */
    tempoMap: z.array(TempoEventSchema).max(2048),
    meterMap: z.array(MeterEventSchema).max(256),
    keyMap: z.array(KeyEventSchema).max(256),
    assets: z.array(ProjectAssetSchema).max(256),
    audioTracks: z.array(AudioTrackSchema).max(64),
    /** Group busses (Mixer zone); omit / [] = none. */
    audioBusses: z.array(AudioBusSchema).max(16).optional(),
    /**
     * Logical HW output patches (Out 3–4…). UI must gate on runtime
     * `maxChannelCount` — never list fake outs.
     */
    audioHardwareOutputs: z
      .array(AudioHardwareOutputSchema)
      .max(MAX_AUDIO_HARDWARE_OUTPUTS)
      .optional(),
    audioClips: z.array(AudioClipSchema).max(512),
    /** Project sum / Stereo Out fader (dB); omit = 0 dB. */
    masterGainDb: z.number().finite().min(-60).max(24).optional(),
    /**
     * Physical device map for Master / Stereo Out (default CH 1–2).
     * Remap to another stereo pair when the interface has ≥4 channels.
     */
    masterOutput: MasterOutputRoutingSchema.optional(),
    tekst: z.object({
      clips: z.array(TekstClipLineSchema),
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
    artist: z.string().max(200).optional(),
    genre: z.string().max(200).optional(),
    year: z.number().int().min(1000).max(9999).optional(),
    /** Remote / absolute cover URL (legacy v4 `coverUrl`); local covers use `assets` kind cover. */
    coverUrl: z.string().max(500).optional(),
  })
  .strict();

type ProjectRoutingFields = {
  isTemplate?: boolean;
  midiProgramId?: number;
  audioTracks: z.infer<typeof AudioTrackSchema>[];
  audioBusses?: z.infer<typeof AudioBusSchema>[];
  audioHardwareOutputs?: z.infer<typeof AudioHardwareOutputSchema>[];
  masterOutput?: z.infer<typeof MasterOutputRoutingSchema>;
  assets: z.infer<typeof ProjectAssetSchema>[];
  cue: { clips: z.infer<typeof CueClipSchema>[] };
};

/** Shared mixer / cue sample ACL for V5+ project documents and PUT bodies. */
function refineProjectRouting(
  project: ProjectRoutingFields,
  ctx: z.RefinementCtx,
): void {
  if (project.isTemplate === true && project.midiProgramId != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Template must not have midiProgramId",
      path: ["midiProgramId"],
    });
  }
  const busIds = new Set((project.audioBusses ?? []).map((b) => b.id));
  const hwIds = new Set((project.audioHardwareOutputs ?? []).map((h) => h.id));
  project.audioTracks.forEach((track, i) => {
    if (track.output?.kind === "bus" && !busIds.has(track.output.busId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Track output busId not found: ${track.output.busId}`,
        path: ["audioTracks", i, "output", "busId"],
      });
    }
    if (
      track.output?.kind === "hw_out" &&
      !hwIds.has(track.output.hwOutputId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Track output hwOutputId not found: ${track.output.hwOutputId}`,
        path: ["audioTracks", i, "output", "hwOutputId"],
      });
    }
  });
  (project.audioBusses ?? []).forEach((bus, i) => {
    if (bus.output?.kind === "hw_out") {
      if (!hwIds.has(bus.output.hwOutputId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Bus output hwOutputId not found: ${bus.output.hwOutputId}`,
          path: ["audioBusses", i, "output", "hwOutputId"],
        });
      }
      return;
    }
    if (bus.output?.kind !== "bus") return;
    if (!busIds.has(bus.output.busId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Bus output busId not found: ${bus.output.busId}`,
        path: ["audioBusses", i, "output", "busId"],
      });
    }
    if (bus.output.busId === bus.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bus cannot route to itself",
        path: ["audioBusses", i, "output", "busId"],
      });
    }
  });
  if (busGraphHasCycle(project.audioBusses ?? [])) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bus routing graph must be acyclic (bus→bus cycle)",
      path: ["audioBusses"],
    });
  }
  if (
    masterOutputOverlapsHwPatches(
      project.masterOutput,
      project.audioHardwareOutputs ?? [],
    )
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Master output channels overlap a hardware output patch",
      path: ["masterOutput", "channelOffset"],
    });
  }
  const assetById = new Map(project.assets.map((a) => [a.id, a]));
  project.cue.clips.forEach((clip, i) => {
    const sample = clip.sample;
    if (!sample) return;
    const asset = assetById.get(sample.assetId);
    if (!asset || asset.kind !== "audio") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cue sample assetId must reference an audio asset: ${sample.assetId}`,
        path: ["cue", "clips", i, "sample", "assetId"],
      });
    }
    if (sample.output?.kind === "bus" && !busIds.has(sample.output.busId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cue sample busId not found: ${sample.output.busId}`,
        path: ["cue", "clips", i, "sample", "output", "busId"],
      });
    }
    if (
      sample.output?.kind === "hw_out" &&
      !hwIds.has(sample.output.hwOutputId)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Cue sample hwOutputId not found: ${sample.output.hwOutputId}`,
        path: ["cue", "clips", i, "sample", "output", "hwOutputId"],
      });
    }
  });
}

export const ProjectSchemaV5 =
  ProjectSchemaV5Object.superRefine(refineProjectRouting);

export type ProjectV5 = z.infer<typeof ProjectSchemaV5>;

/**
 * V6 — Content Model: tekst blocks (timed lyrics) + thin melody lane.
 * Line `text` remains SSOT for Timeline; `blocks` carry timing / split.
 */
const ProjectSchemaV6Object = ProjectSchemaV5Object.omit({
  formatVersion: true,
  tekst: true,
})
  .extend({
    formatVersion: z.literal(6),
    tekst: z.object({
      clips: z.array(TekstClipSchema),
    }),
    melody: z.object({
      clips: z.array(MelodyNoteClipSchema),
    }),
  })
  .strict();

export const ProjectSchemaV6 =
  ProjectSchemaV6Object.superRefine(refineProjectRouting);

export type ProjectV6 = z.infer<typeof ProjectSchemaV6>;
export type Project = ProjectV6;

/** Canonical project schema (v6). */
export { ProjectSchemaV6 as ProjectSchema };

/**
 * Full-document PUT. `updatedAt` is the client's known version (OCC token);
 * server compares to disk and returns 409 on mismatch, then assigns a new stamp.
 */
export const PutProjectBodySchema = ProjectSchemaV6Object.omit({
  id: true,
})
  .strict()
  .superRefine(refineProjectRouting);

export type PutProjectBody = z.infer<typeof PutProjectBodySchema>;

export const CreateProjectBodySchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    fromTemplateId: z.string().min(1).optional(),
    isTemplate: z.boolean().optional(),
  })
  .strict();

export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;

export const BatchMidiPcBodySchema = z
  .object({
    assignments: z
      .array(
        z
          .object({
            id: z.string().min(1),
            midiProgramId: z.number().int().min(0).max(127),
          })
          .strict(),
      )
      .max(1024),
  })
  .strict();

export type BatchMidiPcBody = z.infer<typeof BatchMidiPcBodySchema>;

/** Optional selection for POST /api/library/export — omit / empty → all non-template. */
export const ExportLibraryBodySchema = z.object({
  projectIds: z.array(z.string().uuid()).max(1024).optional(),
});

export type ExportLibraryBody = z.infer<typeof ExportLibraryBodySchema>;

/** @deprecated Use PutProjectBodySchema for full-document PUT. */
export { PutProjectBodySchema as UpdateProjectBodySchema };

export type UpdateProjectBody = PutProjectBody;

/**
 * Wire / WebSocket frame compatibility for Offline-First shells ([#692](https://github.com/Negatywistczny/stagesync/issues/692)).
 * Bump only on breaking transport/API frame changes — not on CSS/JS UI refreshes.
 */
export const PROTOCOL_VERSION = 1 as const;

export const HealthResponseSchema = z
  .object({
    ok: z.literal(true),
    service: z.literal("stagesync-server"),
    version: z.string(),
    /** LAN discovery title advertised via mDNS TXT / Admin Host. */
    hostname: z.string().min(1).optional(),
    /** WS/API frame compatibility; shells hard-fallback to Remote Mode on mismatch. */
    protocolVersion: z.number().int().positive(),
    /** Content hash of served full `apps/web` dist (`none` when host has no static UI). */
    uiHash: z.string().min(1),
    /** Performer (Client-only) UI hash; optional when host has no role bundle. */
    uiHashPerformer: z.string().min(1).optional(),
    /** Console (Admin+Timeline) UI hash; optional when host has no role bundle. */
    uiHashConsole: z.string().min(1).optional(),
    /**
     * Host default theme when the client has no localStorage theme yet
     * (`STAGESYNC_THEME_DEFAULT`). Accepts new profile IDs and legacy
     * dark/light/*-high aliases (normalized). Omitted when unset.
     */
    themeDefault: z.preprocess((v) => {
      if (v == null || v === "") return undefined;
      return normalizeAppearanceProfile(String(v)) ?? v;
    }, AppearanceProfileIdSchema.optional()),
  })
  .strict();

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/** One hashed file in the UI asset tree (paths start with `/`). */
export const UiManifestAssetSchema = z
  .object({
    path: z.string().min(1),
    hash: z.string().min(1),
    size: z.number().int().nonnegative(),
  })
  .strict();

export type UiManifestAsset = z.infer<typeof UiManifestAssetSchema>;

/** `GET /api/ui-manifest` — enough for full UI sync / verify after zip apply. */
export const UiManifestSchema = z
  .object({
    protocolVersion: z.number().int().positive(),
    uiHash: z.string().min(1),
    assets: z.array(UiManifestAssetSchema),
  })
  .strict();

export type UiManifest = z.infer<typeof UiManifestSchema>;

/** Emitted by web build as `dist/ui-hash.json` (subset of manifest). */
export const UiHashFileSchema = z
  .object({
    protocolVersion: z.number().int().positive(),
    uiHash: z.string().min(1),
  })
  .strict();

export type UiHashFile = z.infer<typeof UiHashFileSchema>;

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

export const StageMessageBodySchema = z
  .object({
    text: z.string().min(1).max(200),
    roles: z
      .array(z.enum(["karaoke", "grid", "score", "drums"]))
      .max(4)
      .optional(),
    /** Wall-clock TTL; `0` = infinite (UI ∞). Omit → server default 6 s. */
    ttlMs: z.number().int().nonnegative().max(86_400_000).optional(),
    priority: z.enum(["normal", "alert"]).optional(),
  })
  .strict();

export type StageMessageBody = z.infer<typeof StageMessageBodySchema>;

/** Inbound WS presence hello from Client shells (`/ws/transport`). */
export const ClientHelloMessageSchema = z
  .object({
    type: z.literal("client_hello"),
    displayName: z.string().max(80).optional(),
    roles: z
      .array(z.enum(["karaoke", "grid", "score", "drums", "timeline"]))
      .max(2)
      .optional(),
    latencyMs: z.number().finite().nonnegative().nullable().optional(),
  })
  .strict();

export type ClientHelloMessage = z.infer<typeof ClientHelloMessageSchema>;

/** GET /api/system/update-status response */
export const UpdateStatusSchema = z
  .object({
    current: z.string(),
    latest: z.string().nullable(),
    updateAvailable: z.boolean(),
    /** null when check succeeded; otherwise operator-facing reason (auth / network / empty) */
    error: z.string().max(500).nullable().optional(),
    /** True only when Watchtower env is set — UI must not offer apply otherwise. */
    applyAvailable: z.boolean().optional(),
    updateChannel: z.string().optional(),
    updateMode: z.enum(["desktop", "apk", "docker", "manual"]).optional(),
    autoUpdateDisabled: z.boolean().optional(),
  })
  .strict();

export type UpdateStatus = z.infer<typeof UpdateStatusSchema>;

/** POST /api/system/apply-update body */
export const ApplyUpdateBodySchema = z
  .object({
    target: z.enum(["host"]),
  })
  .strict();

export type ApplyUpdateBody = z.infer<typeof ApplyUpdateBodySchema>;

/** POST /api/system/restore — single `.bak` / `.zip`, or bulk `.bak` paths. */
export const RestoreBackupBodySchema = z.union([
  z
    .object({
      path: z.string().min(1).max(1024),
      /** Must be true — destructive overwrite of live file(s). */
      confirm: z.literal(true),
    })
    .strict(),
  z
    .object({
      paths: z.array(z.string().min(1).max(1024)).min(1).max(64),
      confirm: z.literal(true),
    })
    .strict(),
]);

export type RestoreBackupBody = z.infer<typeof RestoreBackupBodySchema>;

/** PUT /api/system/settings — managed .env values from Admin Ustawienia. */
export const PutServerSettingsBodySchema = z
  .object({
    values: z.record(
      z.string().min(1).max(64),
      z.union([z.string().max(500), z.boolean(), z.number(), z.null()]),
    ),
  })
  .strict();

export type PutServerSettingsBody = z.infer<typeof PutServerSettingsBodySchema>;

/** MIDI port listed by the host (apps/server). */
export const MidiPortSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  direction: z.enum(["input", "output"]),
});

export type MidiPort = z.infer<typeof MidiPortSchema>;

/** MIDI channel 0–15 (API / wire); UI shows 1–16. */
export const MidiChannelSchema = z.number().int().min(0).max(15);

/** Runtime selection + feature flags for Host MIDI. */
export const MidiHostConfigSchema = z
  .object({
    inputId: z.string().min(1).nullable(),
    outputId: z.string().min(1).nullable(),
    /** Emit MIDI clock / start / stop / SPP on the selected output from transport SSOT. */
    clockOutEnabled: z.boolean(),
    /**
     * Program Change IN filter. `null` = Omni (all channels); `0…15` = single channel.
     * Missing in legacy files → Omni (back-compat).
     */
    inputChannel: MidiChannelSchema.nullable().default(null),
    /**
     * Program Change OUT channel (`0` = Channel 1 in UI).
     * Missing in legacy files → 0.
     */
    outputChannel: MidiChannelSchema.default(0),
  })
  .strict();

export type MidiHostConfig = z.infer<typeof MidiHostConfigSchema>;

export const PutMidiHostConfigBodySchema = z
  .object({
    inputId: z.string().min(1).nullable().optional(),
    outputId: z.string().min(1).nullable().optional(),
    clockOutEnabled: z.boolean().optional(),
    inputChannel: MidiChannelSchema.nullable().optional(),
    outputChannel: MidiChannelSchema.optional(),
  })
  .strict();

export type PutMidiHostConfigBody = z.infer<typeof PutMidiHostConfigBodySchema>;

/** Rates are approximate messages (or beats) in the last ~1s. */
export const MidiHostRatesSchema = z
  .object({
    clockPerSec: z.number().nonnegative(),
    sppPerSec: z.number().nonnegative(),
    pcPerSec: z.number().nonnegative(),
    beatToWsPerSec: z.number().nonnegative(),
  })
  .strict();

export type MidiHostRates = z.infer<typeof MidiHostRatesSchema>;

/** GET /api/midi — Admin Host status. */
export const MidiHostStatusSchema = z
  .object({
    available: z.boolean(),
    backend: z.enum(["native", "mock", "none"]),
    config: MidiHostConfigSchema,
    inputs: z.array(MidiPortSchema).max(128),
    outputs: z.array(MidiPortSchema).max(128),
    rates: MidiHostRatesSchema,
    /** True while transport is playing and clock-out timer is armed. */
    clockOutActive: z.boolean(),
    lastError: z.string().nullable(),
  })
  .strict();

export type MidiHostStatus = z.infer<typeof MidiHostStatusSchema>;

/** Push surface: where the token was registered (#810). */
export const PushPlatformSchema = z.enum([
  "android-performer",
  "android-console",
  "web",
  "desktop",
]);

export type PushPlatform = z.infer<typeof PushPlatformSchema>;

/** Android / WebPush channel ids (must match native channel strings). */
export const PushChannelSchema = z.enum(["critical_updates", "announcements"]);

export type PushChannel = z.infer<typeof PushChannelSchema>;

/** Client → host: register FCM / WebPush token for this device. */
export const PushTokenRegisterBodySchema = z
  .object({
    token: z.string().min(8).max(4096),
    platform: PushPlatformSchema,
    /** Optional stable device label (not a secret). */
    deviceLabel: z.string().max(120).optional(),
  })
  .strict();

export type PushTokenRegisterBody = z.infer<typeof PushTokenRegisterBodySchema>;

/** Client → host: remove a previously registered token. */
export const PushTokenUnregisterBodySchema = z
  .object({
    token: z.string().min(8).max(4096),
  })
  .strict();

export type PushTokenUnregisterBody = z.infer<
  typeof PushTokenUnregisterBodySchema
>;

/** Public push config for clients (no private keys). */
export const PushPublicConfigSchema = z
  .object({
    /** WebPush VAPID public key (base64url), when host can accept web subscriptions. */
    vapidPublicKey: z.string().min(1).optional(),
    /** True when Android FCM is expected (operator docs / build with google-services). */
    fcmAvailable: z.boolean(),
  })
  .strict();

export type PushPublicConfig = z.infer<typeof PushPublicConfigSchema>;
