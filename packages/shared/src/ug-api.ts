/**
 * Ultimate Guitar import HTTP contracts (server ↔ web).
 */

import { z } from "zod";

export const UgFetchBodySchema = z.object({
  url: z.string().trim().min(1).max(2000),
});

export const UgSearchBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).optional(),
});

export const UgTabMetadataSchema = z.object({
  title: z.string().nullable(),
  artist: z.string().nullable(),
  type: z.string().nullable(),
  tonality: z.string().nullable(),
  timeSignature: z.string(),
  tempo: z.number().int().nullable(),
  tuning: z.string().nullable(),
  tabId: z.number().int().nullable(),
  url: z.string(),
});

export const UgFetchResponseSchema = z.object({
  content: z.string().min(1),
  metadata: UgTabMetadataSchema,
});

export const UgSearchHitSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  title: z.string().nullable().optional(),
  artist: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  url: z.string().nullable(),
});

export const UgSearchResponseSchema = z.object({
  results: z.array(UgSearchHitSchema),
  message: z.string().optional(),
});

export type UgFetchBody = z.infer<typeof UgFetchBodySchema>;
export type UgSearchBody = z.infer<typeof UgSearchBodySchema>;
export type UgTabMetadata = z.infer<typeof UgTabMetadataSchema>;
export type UgFetchResponse = z.infer<typeof UgFetchResponseSchema>;
export type UgSearchHit = z.infer<typeof UgSearchHitSchema>;
export type UgSearchResponse = z.infer<typeof UgSearchResponseSchema>;
