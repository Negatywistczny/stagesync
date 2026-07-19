import { z } from "zod";
import { DEFAULT_PPQ } from "./time.js";

export const TimeSignatureSchema = z.object({
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
});

export const TransportStateSchema = z.object({
  playing: z.boolean(),
  positionTicks: z.number().int(),
  bpm: z.number().positive(),
  timeSignature: TimeSignatureSchema,
  ppq: z.number().int().positive(),
});

export type TransportState = z.infer<typeof TransportStateSchema>;

export const TransportSeekBodySchema = z.object({
  positionTicks: z.number().int(),
});

export type TransportSeekBody = z.infer<typeof TransportSeekBodySchema>;

export const TransportPlayBodySchema = z.object({
  bpm: z.number().positive().optional(),
  timeSignature: TimeSignatureSchema.optional(),
});

export type TransportPlayBody = z.infer<typeof TransportPlayBodySchema>;

export const TransportTickMessageSchema = TransportStateSchema.extend({
  type: z.literal("transport_tick"),
  serverTimeMs: z.number(),
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
  };
}
