/**
 * Mixer routing — Master | Bus destinations (no physical multi-outs yet).
 * Pure helpers + Zod; WebAudio wiring lives in apps/web.
 */

import { z } from "zod";

/** Max group busses per project. */
export const MAX_AUDIO_BUSSES = 16;

/** Track / bus channel topology: mono uses pan; stereo uses True Balance. */
export const ChannelModeSchema = z.enum(["mono", "stereo"]);
export type ChannelMode = z.infer<typeof ChannelModeSchema>;

/** Omit / invalid → stereo (default for empty tracks). */
export function resolveChannelMode(
  mode: ChannelMode | undefined | null,
): ChannelMode {
  return mode === "mono" ? "mono" : "stereo";
}

/** From decoded AudioBuffer.numberOfChannels (1 → mono, ≥2 → stereo). */
export function channelModeFromChannelCount(count: number): ChannelMode {
  if (!Number.isFinite(count) || count <= 1) return "mono";
  return "stereo";
}

/**
 * Mix destination for an audio track.
 * Physical multi-channel outs are not in the project model yet (only whole-device
 * `setSinkId`) — ADR 0011: do not expose fake Out 3-4 options.
 */
export const MixerOutputDestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("master") }),
  z.object({ kind: z.literal("bus"), busId: z.string().min(1).max(64) }),
]);

export type MixerOutputDest = z.infer<typeof MixerOutputDestSchema>;

/**
 * Bus output — Master only until physical outs exist in the model.
 * Kept as a closed union so we can extend later without stubs.
 */
export const BusOutputDestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("master") }),
]);

export type BusOutputDest = z.infer<typeof BusOutputDestSchema>;

export const AudioBusSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  muted: z.boolean().optional(),
  gainDb: z.number().finite().min(-60).max(24).optional(),
  /** Stereo pan / balance −1…+1; omit = center. */
  pan: z.number().finite().min(-1).max(1).optional(),
  /**
   * Mono = StereoPanner; stereo = True Balance (L/R attenuate).
   * Omit → stereo at runtime ({@link resolveChannelMode}).
   */
  channelMode: ChannelModeSchema.optional(),
  /** Omit / master only (physical outs not supported yet). */
  output: BusOutputDestSchema.optional(),
});

export type AudioBus = z.infer<typeof AudioBusSchema>;

export const MASTER_OUTPUT: MixerOutputDest = { kind: "master" };

/** Normalize omit / unknown → Master. Invalid busId → Master. */
export function resolveTrackOutputDest(
  output: MixerOutputDest | undefined | null,
  busIds: ReadonlySet<string> | readonly string[],
): MixerOutputDest {
  if (output == null || output.kind === "master") return MASTER_OUTPUT;
  if (output.kind === "bus") {
    const set =
      busIds instanceof Set ? busIds : new Set(busIds);
    if (set.has(output.busId)) return output;
  }
  return MASTER_OUTPUT;
}

/** Bus always feeds Master until physical outs land. */
export function resolveBusOutputDest(
  output: BusOutputDest | undefined | null,
): BusOutputDest {
  void output;
  return { kind: "master" };
}

export function isTrackRoutedToBus(
  output: MixerOutputDest | undefined | null,
  busId: string,
  busIds: ReadonlySet<string> | readonly string[],
): boolean {
  const dest = resolveTrackOutputDest(output, busIds);
  return dest.kind === "bus" && dest.busId === busId;
}

/** Next default name: Bus 1, Bus 2… (max existing N + 1). */
export function nextBusName(existingNames: readonly string[]): string {
  let max = 0;
  for (const name of existingNames) {
    const m = /^Bus\s+(\d+)$/i.exec(name.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `Bus ${max + 1}`;
}
