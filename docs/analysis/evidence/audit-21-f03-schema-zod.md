# Evidence fala 3 — Project schema v5 + Zod `.strict()`

**Data:** 2026-07-21 ~01:41 Europe/Warsaw  
**Repo:** `5.0.0-alpha.8`  
**Obszar:** `packages/shared/src/schema.ts`, `transport.ts`, ADR 0009

---

## Werdykt

| Temat | Status |
|-------|--------|
| Kanon storage | **v5** (`formatVersion: 5`); upgrade v1→v5 na read |
| Top-level project / PUT | **`.strict()`** + test unknown keys |
| Transport play/load/loop bodies | **`.strict()`** + `.finite()` BPM |
| Create / Batch MIDI / Setlist / StageMessage / nested clips | **bez `.strict()`** (M11 residual) |
| `fromTemplateId` | `min(1)` nie UUID |

---

## Cytaty

### Kanon v5

```272:327:packages/shared/src/schema.ts
/**
 * Alpha.8+ parity — keyMap, MIDI PC, metadata, templates (v4 lanes kept).
 */
const ProjectSchemaV5Object = z
  .object({
    id: z.string().min(1),
    ...
    formatVersion: z.literal(5),
    ...
    keyMap: z.array(KeyEventSchema),
    ...
    scoreBarMap: ScoreBarMapSchema.default({ anchors: [] }),
    midiProgramId: z.number().int().min(0).max(127).optional(),
    isTemplate: z.boolean().optional(),
    ...
  })
  .strict();

export const ProjectSchemaV5 = ProjectSchemaV5Object.superRefine(
  (project, ctx) => {
    if (project.isTemplate === true && project.midiProgramId != null) {
      ...
    }
  },
);
...
export const ProjectSchema = ProjectSchemaV5;
```

### PUT strict

```329:332:packages/shared/src/schema.ts
export const PutProjectBodySchema = ProjectSchemaV5Object.omit({
  id: true,
  updatedAt: true,
}).strict();
```

### Create — **nie** strict; `fromTemplateId` nie UUID

```336:340:packages/shared/src/schema.ts
export const CreateProjectBodySchema = z.object({
  name: z.string().min(1),
  fromTemplateId: z.string().min(1).optional(),
  isTemplate: z.boolean().optional(),
});
```

### Batch MIDI — nie strict; id nie UUID

```344:351:packages/shared/src/schema.ts
export const BatchMidiPcBodySchema = z.object({
  assignments: z.array(
    z.object({
      id: z.string().min(1),
      midiProgramId: z.number().int().min(0).max(127),
    }),
  ),
});
```

### Nested clip — nie strict (strip unknown)

```30:43:packages/shared/src/schema.ts
export const FormaClipSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startTicks: z.number().int(),
  lengthTicks: z.number().int().positive(),
  kind: FormaClipKindSchema.default("section"),
  note: z.string().optional(),
  subsections: z.array(z.number().int().positive()).optional(),
});
```

Analogicznie: `TekstClipSchema`, `AkordClipSchema`, `CueClipSchema`, `TempoEventSchema`, `AudioClipSchema` — obiekty bez `.strict()`.

### Library entry id luźne

```5:8:packages/shared/src/schema.ts
export const LibraryProjectEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
```

vs `ProjectIdSchema = z.string().uuid()` (L26).

### Transport — play/load/loop strict; seek **nie**

```29:31:packages/shared/src/transport.ts
export const TransportSeekBodySchema = z.object({
  positionTicks: z.number().int(),
});
```

```46:60:packages/shared/src/transport.ts
export const TransportPlayBodySchema = z
  .object({
    bpm: z.number().positive().finite().optional(),
    timeSignature: TimeSignatureSchema.optional(),
    projectId: z.string().uuid().optional(),
  })
  .strict();
...
export const TransportLoadBodySchema = z
  .object({
    projectId: z.string().uuid(),
  })
  .strict();
```

### Testy strict (v5 / PUT)

`schema.test.ts` ~95 „rejects unknown keys (strict)”; ~149 PutProject unknown keys.

### Setlist / StageMessage bez strict

```116:123:packages/shared/src/schema.ts
export const SetlistSchema = z.object({
  version: z.literal(1),
  enabled: z.boolean(),
  projectIds: z.array(z.string().uuid()),
  autoAdvance: z.object({
    enabled: z.boolean(),
  }),
});
```

```375:379:packages/shared/src/schema.ts
export const StageMessageBodySchema = z.object({
  text: z.string().min(1).max(200),
  roles: z.array(z.enum(["karaoke", "grid", "score", "drums"])).optional(),
  ttlMs: z.number().int().positive().optional(),
});
```

### Docs drift — ADR 0009 vs kod

ADR 0009 tytuł „project-schema-v3”; kod kanon **v5**. Upgrade path w storage nadal zna v1–v4. → fala docs (#9).

---

## Findings

| ID | Sev | Opis |
|----|-----|------|
| **A21-M03** | M | `CreateProjectBodySchema` bez `.strict()` — unknown keys strip |
| **A21-M04** | M | Nested clip/event schemas bez `.strict()` — cichy strip w PUT |
| **A21-M05** | M | `fromTemplateId` / Batch `id` / Library entry `id` ≠ UUID schema |
| **A21-L03** | L | `TransportSeekBodySchema` bez `.strict()` |
| **A21-L04** | L | ADR 0009 nazwa „v3” vs kanon v5 w kodzie |

## Remediacje

1. `.strict()` na Create, Batch, Seek, Setlist bodies, StageMessage.
2. `fromTemplateId: ProjectIdSchema.optional()`.
3. Nested: `.strict()` na Forma/Tekst/Akord/Cue/Tempo/Meter/Key/Audio clip schemas **albo** świadomy strip udokumentowany w ADR.
4. Zaktualizować ADR 0009 → „v5 current / v3 history”.
