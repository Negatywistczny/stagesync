import { z } from "zod";
import {
  TrackColorSchema,
  TrackIconSchema,
} from "../../ui-helpers/track-appearance.js";
import {
  ChannelModeSchema,
  MixerOutputDestSchema,
} from "../../mixer/mixer-routing.js";

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
