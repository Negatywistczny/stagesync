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

/** Minimal v5 project document (not full legacy 4.x song). */
export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  formatVersion: z.literal(1),
  updatedAt: z.string().datetime(),
});

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectBodySchema = z.object({
  name: z.string().min(1),
});

export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;

export const UpdateProjectBodySchema = z.object({
  name: z.string().min(1).optional(),
});

export type UpdateProjectBody = z.infer<typeof UpdateProjectBodySchema>;

export const HealthResponseSchema = z.object({
  ok: z.literal(true),
  service: z.literal("stagesync-server"),
  version: z.string(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ApiErrorSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;
