import { z } from "zod";
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
  bpm: z.number().positive().finite(),
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
    bpm: z.number().positive().finite().optional(),
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
  serverTimeMs: z.number(),
  /**
   * Wall-clock send time (`Date.now()` on host) for client one-way latency EMA.
   * Optional for older payloads; new ticks always include it.
   */
  sentAtMs: z.number().optional(),
});

export type TransportTickMessage = z.infer<typeof TransportTickMessageSchema>;

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
