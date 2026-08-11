/**
 * UltraStar / USDB import HTTP contracts (server ↔ web).
 * Search + fetch proxy USDB (usdb.animux.de); parse locally via importUltrastarText.
 */

import { z } from "zod";

export const UltrastarFetchBodySchema = z.object({
  url: z.string().trim().min(1).max(2000),
});

export const UltrastarSearchBodySchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).optional(),
});

export const UltrastarSongMetadataSchema = z.object({
  title: z.string().nullable(),
  artist: z.string().nullable(),
  language: z.string().nullable(),
  songId: z.number().int().nullable(),
  url: z.string(),
});

export const UltrastarFetchResponseSchema = z.object({
  content: z.string().min(1),
  metadata: UltrastarSongMetadataSchema,
});

export const UltrastarSearchHitSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  title: z.string().nullable().optional(),
  artist: z.string().nullable().optional(),
  language: z.string().nullable().optional(),
  edition: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  url: z.string().nullable(),
});

export const UltrastarSearchResponseSchema = z.object({
  results: z.array(UltrastarSearchHitSchema),
  message: z.string().optional(),
});

/** GET /api/import/ultrastar/account — status only (never returns password). */
export const UltrastarAccountStatusSchema = z.object({
  configured: z.boolean(),
  user: z.string(),
});

/**
 * PUT /api/import/ultrastar/account
 * Empty `user` clears the account. Empty/omitted `pass` keeps the stored password
 * when the account is already configured; required when setting a new account.
 */
export const UltrastarAccountPutBodySchema = z.object({
  user: z.string().trim().max(120),
  pass: z.string().max(200).optional(),
});

export const UltrastarAccountPutResponseSchema = z.object({
  ok: z.literal(true),
  configured: z.boolean(),
  user: z.string(),
  message: z.string().optional(),
});

/** POST /api/import/ultrastar/account/test — login check (optional override fields). */
export const UltrastarAccountTestBodySchema = z.object({
  user: z.string().trim().max(120).optional(),
  pass: z.string().max(200).optional(),
});

export const UltrastarAccountTestResponseSchema = z.object({
  ok: z.literal(true),
  message: z.string(),
});

export type UltrastarFetchBody = z.infer<typeof UltrastarFetchBodySchema>;
export type UltrastarSearchBody = z.infer<typeof UltrastarSearchBodySchema>;
export type UltrastarSongMetadata = z.infer<typeof UltrastarSongMetadataSchema>;
export type UltrastarFetchResponse = z.infer<
  typeof UltrastarFetchResponseSchema
>;
export type UltrastarSearchHit = z.infer<typeof UltrastarSearchHitSchema>;
export type UltrastarSearchResponse = z.infer<
  typeof UltrastarSearchResponseSchema
>;
export type UltrastarAccountStatus = z.infer<
  typeof UltrastarAccountStatusSchema
>;
export type UltrastarAccountPutBody = z.infer<
  typeof UltrastarAccountPutBodySchema
>;
export type UltrastarAccountPutResponse = z.infer<
  typeof UltrastarAccountPutResponseSchema
>;
export type UltrastarAccountTestBody = z.infer<
  typeof UltrastarAccountTestBodySchema
>;
export type UltrastarAccountTestResponse = z.infer<
  typeof UltrastarAccountTestResponseSchema
>;
