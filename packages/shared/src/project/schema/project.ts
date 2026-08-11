import { z } from "zod";
import {
  assertValidTimeSignature,
  DEFAULT_PPQ,
} from "../../time-tempo/time.js";
import {
  AudioBusSchema,
  AudioHardwareOutputSchema,
  MasterOutputRoutingSchema,
  MAX_AUDIO_HARDWARE_OUTPUTS,
  busGraphHasCycle,
  masterOutputOverlapsHwPatches,
} from "../../mixer/mixer-routing.js";
import {
  FormaClipSchema,
  ScoreBarMapSchema,
  ProjectAssetSchema,
  AudioTrackSchema,
  AudioClipSchema,
  TekstClipLineSchema,
  TekstClipSchema,
  MelodyNoteClipSchema,
  AkordClipSchema,
  CueClipSchema,
} from "./clips.js";

export function refineMeterForPpq(
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

/** Historical formatVersion 1 project document (name only); upgrade path → v6. */
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
export const ProjectSchemaV5Object = z
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

export type ProjectRoutingFields = {
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
export function refineProjectRouting(
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
export const ProjectSchemaV6Object = ProjectSchemaV5Object.omit({
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

/** @deprecated Use PutProjectBodySchema for full-document PUT. */
export { PutProjectBodySchema as UpdateProjectBodySchema };

export type UpdateProjectBody = PutProjectBody;
