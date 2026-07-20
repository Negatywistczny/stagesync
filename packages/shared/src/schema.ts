import { z } from "zod";
import { DEFAULT_PPQ } from "./time.js";

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

export const ProjectIdSchema = z.string().uuid();

export const FormaClipKindSchema = z.enum(["countdown", "section"]);

export const FormaClipSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  kind: FormaClipKindSchema.default("section"),
});

export type FormaClip = z.infer<typeof FormaClipSchema>;

export const TempoEventSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  bpm: z.number().positive().finite(),
});

export const MeterEventSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
});

export const DefaultMeterSchema = z.object({
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
});

/** Legacy alpha.2 project document (name only). */
export const ProjectSchemaV1 = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  formatVersion: z.literal(1),
  updatedAt: z.string().datetime(),
});

export type ProjectV1 = z.infer<typeof ProjectSchemaV1>;

/** Alpha.3 project document — strict at HTTP edges. */
export const ProjectSchemaV2 = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    formatVersion: z.literal(2),
    updatedAt: z.string().datetime(),
    ppq: z.literal(DEFAULT_PPQ),
    defaultBpm: z.number().positive().finite(),
    defaultMeter: DefaultMeterSchema,
    forma: z.object({
      clips: z.array(FormaClipSchema),
    }),
    tempoMap: z.array(TempoEventSchema),
    meterMap: z.array(MeterEventSchema),
  })
  .strict();

export type ProjectV2 = z.infer<typeof ProjectSchemaV2>;
export type Project = ProjectV2;

/** Canonical project schema (v2). */
export const ProjectSchema = ProjectSchemaV2;

export const PutProjectBodySchema = ProjectSchemaV2.omit({
  id: true,
  updatedAt: true,
}).strict();

export type PutProjectBody = z.infer<typeof PutProjectBodySchema>;

export const CreateProjectBodySchema = z.object({
  name: z.string().min(1),
});

export type CreateProjectBody = z.infer<typeof CreateProjectBodySchema>;

/** @deprecated Use PutProjectBodySchema for full-document PUT. */
export const UpdateProjectBodySchema = PutProjectBodySchema;

export type UpdateProjectBody = PutProjectBody;

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
