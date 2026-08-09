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
 * Supports {@link ChannelMode} mono (1 ch) and stereo (2 ch from `channelOffset`).
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
 * Canonical name for a logical HW patch (mono or stereo).
 * Same Zod shape as {@link AudioHardwareOutputSchema}.
 */
export { AudioHardwareOutputSchema as HwOutputPatchSchema };
export type HwOutputPatch = AudioHardwareOutput;

/**
 * Physical destination for the Master / Stereo Out sum.
 * Omit / default → CH 1–2 (`channelOffset: 0`, stereo).
 */
export const MasterOutputRoutingSchema = z
  .object({
    /** 0-based device channel; stereo uses offset + offset+1. */
    channelOffset: z.number().int().min(0).max(62).optional(),
    /**
     * Master sum is stereo today; mono reserved for future Direct Out–style maps.
     * Omit → stereo.
     */
    channelMode: ChannelModeSchema.optional(),
  })
  .strict();

export type MasterOutputRouting = z.infer<typeof MasterOutputRoutingSchema>;

export function hardwarePatchChannelWidth(mode: ChannelMode): number {
  return mode === "mono" ? 1 : 2;
}

/** Resolved Master physical map (defaults CH 1–2 stereo). */
export function resolveMasterOutputRouting(
  routing: MasterOutputRouting | undefined | null,
): { channelOffset: number; channelMode: ChannelMode } {
  const channelMode = resolveChannelMode(routing?.channelMode);
  let channelOffset = 0;
  if (
    routing?.channelOffset != null &&
    Number.isFinite(routing.channelOffset)
  ) {
    channelOffset = Math.max(
      0,
      Math.min(62, Math.floor(routing.channelOffset)),
    );
  }
  // Prefer even start for stereo pairs (device CH 1–2, 3–4, …).
  if (channelMode === "stereo" && channelOffset % 2 === 1) {
    channelOffset = Math.max(0, channelOffset - 1);
  }
  return { channelOffset, channelMode };
}

/** Inclusive channel indices occupied by a patch / Master map. */
export function channelRangeOccupied(
  channelOffset: number,
  mode: ChannelMode,
): { start: number; end: number } {
  const width = hardwarePatchChannelWidth(mode);
  return { start: channelOffset, end: channelOffset + width - 1 };
}

export function channelRangesOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/**
 * True when Master physical map overlaps any HW patch (invalid project state).
 */
export function masterOutputOverlapsHwPatches(
  master: MasterOutputRouting | undefined | null,
  hwPatches: readonly HwOutputPatch[],
): boolean {
  const m = resolveMasterOutputRouting(master);
  const masterRange = channelRangeOccupied(m.channelOffset, m.channelMode);
  for (const row of hwPatches) {
    const mode = resolveChannelMode(row.channelMode);
    const range = channelRangeOccupied(row.channelOffset, mode);
    if (channelRangesOverlap(masterRange, range)) return true;
  }
  return false;
}

/**
 * Stereo pair options for Master Out selector (labels are 1-based CH).
 * Options that collide with existing HW patches are marked `blocked`.
 */
export function listMasterStereoPairOptions(
  maxChannelCount: number,
  hwPatches: readonly HwOutputPatch[] = [],
): readonly {
  channelOffset: number;
  label: string;
  blocked: boolean;
}[] {
  const n = Number.isFinite(maxChannelCount)
    ? Math.max(0, Math.floor(maxChannelCount))
    : 0;
  const out: {
    channelOffset: number;
    label: string;
    blocked: boolean;
  }[] = [];
  for (let offset = 0; offset + 1 < n; offset += 2) {
    const range = channelRangeOccupied(offset, "stereo");
    let blocked = false;
    for (const row of hwPatches) {
      const mode = resolveChannelMode(row.channelMode);
      if (
        channelRangesOverlap(
          range,
          channelRangeOccupied(row.channelOffset, mode),
        )
      ) {
        blocked = true;
        break;
      }
    }
    out.push({
      channelOffset: offset,
      label: `CH ${offset + 1}–${offset + 2}`,
      blocked,
    });
  }
  return out;
}
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
 * Bus output — Master, another bus (DAG), or HW (same gate as track HW UI).
 */
export const BusOutputDestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("master") }),
  z.object({ kind: z.literal("bus"), busId: z.string().min(1).max(64) }),
  z.object({
    kind: z.literal("hw_out"),
    hwOutputId: z.string().min(1).max(64),
  }),
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
    edges.set(b.id, b.output?.kind === "bus" ? b.output.busId : null);
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
  const prevHw = previous?.kind === "hw_out" ? previous.hwOutputId : null;
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
    const set = busIds instanceof Set ? busIds : new Set(busIds);
    if (set.has(output.busId)) return output;
  }
  if (output.kind === "hw_out") {
    if (!hwOutputIds) return MASTER_OUTPUT;
    const set = hwOutputIds instanceof Set ? hwOutputIds : new Set(hwOutputIds);
    if (set.has(output.hwOutputId)) return output;
  }
  return MASTER_OUTPUT;
}

/**
 * Resolve bus output with fail-soft to Master on stale id / self / cycle / hw.
 */
export function resolveBusOutputDest(
  output: BusOutputDest | undefined | null,
  opts?: {
    fromBusId: string;
    busIds: ReadonlySet<string> | readonly string[];
    busses?: readonly BusEdge[];
    hwOutputIds?: ReadonlySet<string> | readonly string[];
  },
): BusOutputDest {
  if (output == null || output.kind === "master") return { kind: "master" };
  if (!opts) return { kind: "master" };
  if (output.kind === "hw_out") {
    if (!opts.hwOutputIds) return { kind: "master" };
    const set =
      opts.hwOutputIds instanceof Set
        ? opts.hwOutputIds
        : new Set(opts.hwOutputIds);
    if (set.has(output.hwOutputId)) return output;
    return { kind: "master" };
  }
  if (output.kind === "bus") {
    const set = opts.busIds instanceof Set ? opts.busIds : new Set(opts.busIds);
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
