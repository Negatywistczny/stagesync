import { z } from "zod";

/** Skeleton library catalog — validated at every edge (API / disk). */
export const LibrarySchema = z.object({
  version: z.literal(1),
  projects: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      updatedAt: z.string().datetime().optional(),
    }),
  ),
});

export type Library = z.infer<typeof LibrarySchema>;

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("stagesync-server"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
