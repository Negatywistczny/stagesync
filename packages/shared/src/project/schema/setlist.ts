import { z } from "zod";

/** Setlist break / announcement — counts toward duration, not a playable song. */
export const SetlistBreakItemSchema = z
  .object({
    type: z.literal("break"),
    id: z.string().uuid(),
    label: z.string().trim().min(1).max(120),
    durationMinutes: z.number().int().min(1).max(180),
  })
  .strict();

export type SetlistBreakItem = z.infer<typeof SetlistBreakItemSchema>;

export const SetlistProjectItemSchema = z
  .object({
    type: z.literal("project"),
    projectId: z.string().uuid(),
  })
  .strict();

export type SetlistProjectItem = z.infer<typeof SetlistProjectItemSchema>;

export const SetlistItemSchema = z.discriminatedUnion("type", [
  SetlistProjectItemSchema,
  SetlistBreakItemSchema,
]);

export type SetlistItem = z.infer<typeof SetlistItemSchema>;

/** Default concert time-budget target for Admin Set summary bar (minutes). */
export const SETLIST_DEFAULT_TIME_BUDGET_MINUTES = 45;

/**
 * Concert setlist — independent of library order (ADR 0009).
 * `items` is canonical (projects + breaks); `projectIds` is derived for
 * auto-advance / legacy readers and always rewritten on normalize.
 */
export const SetlistObjectSchema = z
  .object({
    version: z.literal(1),
    enabled: z.boolean(),
    items: z.array(SetlistItemSchema).max(256),
    projectIds: z.array(z.string().uuid()).max(256),
    autoAdvance: z
      .object({
        enabled: z.boolean(),
      })
      .strict(),
    timeBudgetMinutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional(),
  })
  .strict();

export function coerceSetlistInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  const hasItems = Array.isArray(o.items);
  const hasProjectIds = Array.isArray(o.projectIds);
  if (!hasItems && hasProjectIds) {
    const projectIds = o.projectIds as unknown[];
    return {
      ...o,
      items: projectIds
        .filter((id): id is string => typeof id === "string")
        .map((projectId) => ({ type: "project" as const, projectId })),
    };
  }
  if (hasItems && !hasProjectIds) {
    const items = o.items as unknown[];
    const projectIds: string[] = [];
    for (const item of items) {
      if (
        item &&
        typeof item === "object" &&
        (item as { type?: unknown }).type === "project" &&
        typeof (item as { projectId?: unknown }).projectId === "string"
      ) {
        projectIds.push((item as { projectId: string }).projectId);
      }
    }
    return { ...o, projectIds };
  }
  return o;
}

export const SetlistSchema = z.preprocess(
  coerceSetlistInput,
  SetlistObjectSchema,
);

export type Setlist = z.infer<typeof SetlistObjectSchema>;

export const PutSetlistBodySchema = z
  .object({
    enabled: z.boolean(),
    items: z.array(SetlistItemSchema).max(256).optional(),
    /** Legacy body — converted to project items when `items` omitted. */
    projectIds: z.array(z.string().uuid()).max(256).optional(),
    timeBudgetMinutes: z
      .number()
      .int()
      .min(1)
      .max(24 * 60)
      .optional(),
  })
  .strict()
  .superRefine((body, ctx) => {
    if (body.items === undefined && body.projectIds === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide items or projectIds",
        path: ["items"],
      });
    }
  });

export type PutSetlistBody = z.infer<typeof PutSetlistBodySchema>;

export const PatchSetlistAutoAdvanceBodySchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

export type PatchSetlistAutoAdvanceBody = z.infer<
  typeof PatchSetlistAutoAdvanceBodySchema
>;

export const BatchMidiPcBodySchema = z
  .object({
    assignments: z
      .array(
        z
          .object({
            id: z.string().min(1),
            midiProgramId: z.number().int().min(0).max(127),
          })
          .strict(),
      )
      .max(1024),
  })
  .strict();

export type BatchMidiPcBody = z.infer<typeof BatchMidiPcBodySchema>;

/** Optional selection for POST /api/library/export — omit / empty → all non-template. */
export const ExportLibraryBodySchema = z.object({
  projectIds: z.array(z.string().uuid()).max(1024).optional(),
});

export type ExportLibraryBody = z.infer<typeof ExportLibraryBodySchema>;
