/**
 * Mixer routing — Master | Bus | HW (logical patch) destinations.
 * Pure helpers + Zod; WebAudio wiring lives in apps/web.
 * UI must not offer HW outs unless runtime `maxChannelCount` supports them.
 */

import { z } from "zod";

/** Max group busses per project. */
export const MAX_AUDIO_BUSSES = 16;

/** Max logical hardware output patches per project. */
export const MAX_AUDIO_HARDWARE_OUTPUTS = 32;

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
 * Logical HW patch row — tracks/busses reference `id`, not raw channel indices.
 * UI listing is gated by {@link hwOutputUiAllowed}.
 */
export const AudioHardwareOutputSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(80),
  /** 0-based channel index on the device (stereo pair uses offset + offset+1). */
  channelOffset: z.number().int().min(0).max(62),
  channelMode: ChannelModeSchema,
  gainDb: z.number().finite().min(-60).max(24).optional(),
  muted: z.boolean().optional(),
});

export type AudioHardwareOutput = z.infer<typeof AudioHardwareOutputSchema>;

/**
 * Mix destination for an audio track (and unified target for future HW).
 * Fake Out 3–4 in UI is forbidden until {@link hwOutputUiAllowed}.
 */
export const MixerOutputDestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("master") }),
  z.object({ kind: z.literal("bus"), busId: z.string().min(1).max(64) }),
  z.object({
    kind: z.literal("hw_out"),
    hwOutputId: z.string().min(1).max(64),
  }),
]);

export type MixerOutputDest = z.infer<typeof MixerOutputDestSchema>;

/**
 * Bus output — Master or another bus (DAG). HW on bus strips = Later
 * (same gate as track HW UI).
 */
export const BusOutputDestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("master") }),
  z.object({ kind: z.literal("bus"), busId: z.string().min(1).max(64) }),
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
  /** Omit = Master; bus→bus allowed when acyclic. */
  output: BusOutputDestSchema.optional(),
});

export type AudioBus = z.infer<typeof AudioBusSchema>;

export const MASTER_OUTPUT: MixerOutputDest = { kind: "master" };

export type BusEdge = {
  id: string;
  output?: BusOutputDest | null;
};

/** True if the directed bus-output graph contains a cycle. */
export function busGraphHasCycle(busses: readonly BusEdge[]): boolean {
  const edges = new Map<string, string | null>();
  for (const b of busses) {
    edges.set(
      b.id,
      b.output?.kind === "bus" ? b.output.busId : null,
    );
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  function dfs(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    const next = edges.get(id);
    if (next != null && dfs(next)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  }
  for (const id of edges.keys()) {
    if (dfs(id)) return true;
  }
  return false;
}

/**
 * Whether assigning `nextOutput` on `fromBusId` would introduce a cycle
 * (self-route or A→B→…→A).
 */
export function wouldCreateBusCycle(
  busses: readonly BusEdge[],
  fromBusId: string,
  nextOutput: BusOutputDest,
): boolean {
  if (nextOutput.kind !== "bus") return false;
  if (nextOutput.busId === fromBusId) return true;
  const hypothetical = busses.map((b) =>
    b.id === fromBusId ? { id: b.id, output: nextOutput } : b,
  );
  if (!hypothetical.some((b) => b.id === fromBusId)) {
    hypothetical.push({ id: fromBusId, output: nextOutput });
  }
  return busGraphHasCycle(hypothetical);
}

/**
 * UI may list HW outs only when the AudioContext destination has enough
 * discrete channels for at least one stereo pair beyond Master (chs 0–1).
 * Never invent fake Out 3–4 options without this.
 */
export function hwOutputUiAllowed(maxChannelCount: number): boolean {
  return Number.isFinite(maxChannelCount) && maxChannelCount >= 4;
}

/**
 * ADR 0017 §7 — physical HW out repatch blocked while transport is PLAYING.
 * Master ↔ Bus changes are allowed; any change involving `hw_out` is not.
 */
export function isHwOutRepatchBlockedWhilePlaying(
  playing: boolean,
  previous: MixerOutputDest | undefined | null,
  next: MixerOutputDest,
): boolean {
  if (!playing) return false;
  const prevHw =
    previous?.kind === "hw_out" ? previous.hwOutputId : null;
  const nextHw = next.kind === "hw_out" ? next.hwOutputId : null;
  if (prevHw == null && nextHw == null) return false;
  if (prevHw != null && nextHw != null && prevHw === nextHw) return false;
  return true;
}

/** Normalize omit / unknown → Master. Invalid bus / hw → Master. */
export function resolveTrackOutputDest(
  output: MixerOutputDest | undefined | null,
  busIds: ReadonlySet<string> | readonly string[],
  hwOutputIds?: ReadonlySet<string> | readonly string[],
): MixerOutputDest {
  if (output == null || output.kind === "master") return MASTER_OUTPUT;
  if (output.kind === "bus") {
    const set =
      busIds instanceof Set ? busIds : new Set(busIds);
    if (set.has(output.busId)) return output;
  }
  if (output.kind === "hw_out") {
    if (!hwOutputIds) return MASTER_OUTPUT;
    const set =
      hwOutputIds instanceof Set ? hwOutputIds : new Set(hwOutputIds);
    if (set.has(output.hwOutputId)) return output;
  }
  return MASTER_OUTPUT;
}

/**
 * Resolve bus output with fail-soft to Master on stale id / self / cycle.
 */
export function resolveBusOutputDest(
  output: BusOutputDest | undefined | null,
  opts?: {
    fromBusId: string;
    busIds: ReadonlySet<string> | readonly string[];
    busses?: readonly BusEdge[];
  },
): BusOutputDest {
  if (output == null || output.kind === "master") return { kind: "master" };
  if (!opts) return { kind: "master" };
  if (output.kind === "bus") {
    const set =
      opts.busIds instanceof Set ? opts.busIds : new Set(opts.busIds);
    if (!set.has(output.busId) || output.busId === opts.fromBusId) {
      return { kind: "master" };
    }
    if (
      opts.busses &&
      wouldCreateBusCycle(opts.busses, opts.fromBusId, output)
    ) {
      return { kind: "master" };
    }
    return output;
  }
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
