import { z } from "zod";
import { BpmSchema } from "./schema.js";
import { DEFAULT_PPQ } from "./time.js";

export const TimeSignatureSchema = z.object({
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
});

export const TransportLoopSchema = z.object({
  enabled: z.boolean(),
  startTicks: z.number().int(),
  endTicks: z.number().int(),
});

export type TransportLoop = z.infer<typeof TransportLoopSchema>;

export const TransportStateSchema = z.object({
  playing: z.boolean(),
  positionTicks: z.number().int(),
  bpm: BpmSchema,
  timeSignature: TimeSignatureSchema,
  ppq: z.number().int().positive(),
  activeProjectId: z.string().uuid().nullable().optional(),
  loop: TransportLoopSchema.nullable().optional(),
});

export type TransportState = z.infer<typeof TransportStateSchema>;

export const TransportSeekBodySchema = z.object({
  positionTicks: z.number().int(),
});

export type TransportSeekBody = z.infer<typeof TransportSeekBodySchema>;

/** POST /api/transport/loop — set range and/or toggle. */
export const TransportLoopBodySchema = z
  .object({
    enabled: z.boolean(),
    startTicks: z.number().int().optional(),
    endTicks: z.number().int().optional(),
  })
  .strict();

export type TransportLoopBody = z.infer<typeof TransportLoopBodySchema>;

export const TransportPlayBodySchema = z
  .object({
    bpm: BpmSchema.optional(),
    timeSignature: TimeSignatureSchema.optional(),
    projectId: z.string().uuid().optional(),
  })
  .strict();

export type TransportPlayBody = z.infer<typeof TransportPlayBodySchema>;

export const TransportLoadBodySchema = z
  .object({
    projectId: z.string().uuid(),
  })
  .strict();

export type TransportLoadBody = z.infer<typeof TransportLoadBodySchema>;

export const TransportTickMessageSchema = TransportStateSchema.extend({
  type: z.literal("transport_tick"),
  /** Monotonic engine clock (ordering / staleness). */
  serverTimeMs: z.number().finite(),
  /**
   * Wall-clock send time (`Date.now()` on host) for client one-way latency EMA.
   * Optional for older payloads; new ticks always include it.
   */
  sentAtMs: z.number().finite().optional(),
});

export type TransportTickMessage = z.infer<typeof TransportTickMessageSchema>;

/** Outbound WS cue on `/ws/transport` (multiplexed with ticks). */
export const StageCueMessageSchema = z.object({
  type: z.literal("stage_cue"),
  text: z.string().min(1).max(200),
  roles: z
    .array(z.enum(["karaoke", "grid", "score", "drums"]))
    .max(4)
    .optional(),
  ttlMs: z.number().finite().positive(),
  sentAtMs: z.number().finite(),
});

export type StageCueMessage = z.infer<typeof StageCueMessageSchema>;

/** Server → client frames on `/ws/transport`. */
export const TransportWsServerMessageSchema = z.discriminatedUnion("type", [
  TransportTickMessageSchema,
  StageCueMessageSchema,
]);

export type TransportWsServerMessage = z.infer<
  typeof TransportWsServerMessageSchema
>;

/**
 * Parse REST/WS tick payloads. Accepts a full tick, or a legacy bare
 * `TransportState` (pre-envelope hosts) coerced to a tick with `serverTimeMs: 0`.
 */
export function parseTransportTickPayload(data: unknown): TransportTickMessage {
  const asTick = TransportTickMessageSchema.safeParse(data);
  if (asTick.success) return asTick.data;
  const asState = TransportStateSchema.safeParse(data);
  if (asState.success) {
    return {
      type: "transport_tick",
      ...asState.data,
      serverTimeMs: 0,
    };
  }
  throw asTick.error;
}

export const DEFAULT_TRANSPORT_BPM = 120;
export const DEFAULT_TRANSPORT_METER = {
  numerator: 4,
  denominator: 4,
} as const;
export const TRANSPORT_TICK_INTERVAL_MS = 40;

export function defaultTransportState(): TransportState {
  return {
    playing: false,
    positionTicks: 0,
    bpm: DEFAULT_TRANSPORT_BPM,
    timeSignature: { ...DEFAULT_TRANSPORT_METER },
    ppq: DEFAULT_PPQ,
    activeProjectId: null,
    loop: null,
  };
}


/**
 * Home tick for Stop / return-to-start (ADR 0002).
 * Countdown / pre-roll start when present; otherwise song start (0).
 */
export type TransportHomeSource = {
  forma: {
    clips: ReadonlyArray<{ kind: string; startTicks: number }>;
  };
};

export function transportHomeTicks(
  project: TransportHomeSource | null | undefined,
): number {
  const cd = project?.forma.clips.find((c) => c.kind === "countdown");
  return cd?.startTicks ?? 0;
}
