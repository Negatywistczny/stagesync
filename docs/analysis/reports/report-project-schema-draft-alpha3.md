# ProjectSchema v2 — draft (alpha.3)

**Status:** propozycja analityczna (nie zaimplementowana).  
**SSOT czasu:** [ADR 0002](../../adr/0002-timebase-ssot.md) — integer **ticks** + stałe **PPQ**.  
**Storage:** [ADR 0001](../../adr/0001-storage-layout.md) — `data/projects/<id>/project.json`.  
**Walidacja:** Zod na krawędziach, fail-fast ([konstytucja](../../../.cursor/rules/constitution.mdc)).

## Stan dziś (alpha.2)

```ts
// packages/shared/src/schema.ts
ProjectSchema = {
  id: string,
  name: string,
  formatVersion: literal(1),
  updatedAt: datetime string,
}
```

PUT akceptuje tylko `{ name? }`.

## Propozycja: `formatVersion: 2`

### Zasady

- Jedna oś: `startTicks` / `lengthTicks` (int); **nie** `startAbs`, nie float beats.
- `ppq` zapisane w dokumencie (= `DEFAULT_PPQ` 960); mismatch przy load → 400/StorageError.
- Countdown / pre-roll: clip Formy z `kind: "countdown"` i `startTicks ≤ 0` (takt 1 = start utworu).
- Tempo/metrum: **mapy eventów** (onset), nie pojedyncze pole `tempo` jako jedyne źródło (pole `defaultBpm` tylko fallback gdy mapa pusta).
- Poza α3: vocal, chords, cues, keyMap, audio, MusicXML — **nie** w schemacie v2 (brak dual-write legacy).

### Draft Zod (szkic)

```ts
import { z } from "zod";
import { DEFAULT_PPQ } from "./time.js";

export const FormaClipKindSchema = z.enum(["countdown", "section"]);

export const FormaClipSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  startTicks: z.number().int(),
  /** Exclusive end inferred from next clip if omitted; required for last clip. */
  lengthTicks: z.number().int().positive(),
  kind: FormaClipKindSchema.default("section"),
});

export const TempoEventSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  bpm: z.number().positive(),
});

export const MeterEventSchema = z.object({
  id: z.string().min(1),
  startTicks: z.number().int(),
  numerator: z.number().int().positive(),
  denominator: z.number().int().positive(),
});

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  formatVersion: z.literal(2),
  updatedAt: z.string().datetime(),
  ppq: z.literal(DEFAULT_PPQ), // 960
  /** Fallback gdy tempoMap pusta */
  defaultBpm: z.number().positive().default(120),
  defaultMeter: z
    .object({
      numerator: z.number().int().positive(),
      denominator: z.number().int().positive(),
    })
    .default({ numerator: 4, denominator: 4 }),
  forma: z.object({
    clips: z.array(FormaClipSchema),
  }),
  tempoMap: z.array(TempoEventSchema).default([]),
  meterMap: z.array(MeterEventSchema).default([]),
});
```

**Create:** nadal `{ name }` → serwer tworzy v2 z pustą / minimalną Formą (Countdown + 1 sekcja).  
**Update body:** `name?` + opcjonalnie `forma` / `tempoMap` / `meterMap` / defaulty (partial patch **albo** full replace — rekomendacja α3: **full document PUT** poza `id`, prostszy kontrakt).

### Minimalny seed przy `POST /api/projects`

```json
{
  "id": "<uuid>",
  "name": "Nowy utwór",
  "formatVersion": 2,
  "updatedAt": "2026-07-20T00:00:00.000Z",
  "ppq": 960,
  "defaultBpm": 120,
  "defaultMeter": { "numerator": 4, "denominator": 4 },
  "forma": {
    "clips": [
      {
        "id": "forma-cd",
        "name": "Countdown",
        "kind": "countdown",
        "startTicks": -7680,
        "lengthTicks": 7680
      },
      {
        "id": "forma-intro",
        "name": "Intro",
        "kind": "section",
        "startTicks": 0,
        "lengthTicks": 7680
      }
    ]
  },
  "tempoMap": [
    { "id": "tempo-0", "startTicks": 0, "bpm": 120 }
  ],
  "meterMap": [
    {
      "id": "meter-0",
      "startTicks": 0,
      "numerator": 4,
      "denominator": 4
    }
  ]
}
```

> **Korekta po audycie:** seed α3 = **2 takty** CD  
> (`startTicks: -7680`, `lengthTicks: 7680` @4/4), nie −3840. Legacy Template ma CD  
> `startAbs: 0` → Intro `8`; po shift ADR 0002 oś CD jest ujemna. Poniższy JSON  
> z −3840 zostawiony jako historyczny szkic — **nie kopiować do implementacji**.

### Przykład „Intro 8 beatów @ 120, 4/4” (po seedzie)

Przy PPQ=960, 1 takt 4/4 = 3840 ticks. Intro 2 takty od bara 1:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Demo Forma",
  "formatVersion": 2,
  "updatedAt": "2026-07-20T12:00:00.000Z",
  "ppq": 960,
  "defaultBpm": 120,
  "defaultMeter": { "numerator": 4, "denominator": 4 },
  "forma": {
    "clips": [
      {
        "id": "forma-cd",
        "name": "Countdown",
        "kind": "countdown",
        "startTicks": -7680,
        "lengthTicks": 7680
      },
      {
        "id": "forma-1",
        "name": "Intro",
        "kind": "section",
        "startTicks": 0,
        "lengthTicks": 7680
      },
      {
        "id": "forma-2",
        "name": "Verse",
        "kind": "section",
        "startTicks": 7680,
        "lengthTicks": 15360
      }
    ]
  },
  "tempoMap": [
    { "id": "t0", "startTicks": -7680, "bpm": 120 }
  ],
  "meterMap": [
    {
      "id": "m0",
      "startTicks": -7680,
      "numerator": 4,
      "denominator": 4
    }
  ]
}
```

---

## Mapowanie legacy → v5 (tylko IN scope alpha.3)

Referencja: `STAGESYNC-APP-LEGACY/src/lib/song-storage-canon.js` + template `sections` / `tempoMap` / `meterMap`.

| Legacy | v5 α3 | Reguła |
|--------|-------|--------|
| `title` | `name` | Już w bibliotece |
| `id` | `id` | UUID v5 przy create; migrator później |
| `tempo` (skalar) | `defaultBpm` + event `tempoMap[0]` | |
| `chords.timeSignature` `"4/4"` | `defaultMeter` + `meterMap[0]` | Parse `num/den` |
| `sections[]` `{ id, name, startAbs }` | `forma.clips[]` | `startTicks = round(startAbs * PPQ)` **po** przesunięciu osi |
| Countdown `id===0` / name | `kind: "countdown"`, `startTicks ≤ 0` | ADR 0002: CD nie zajmuje taktu 1 |
| długość sekcji | `lengthTicks` | Z sąsiada / END marker: `(next.start − this.start) * PPQ` |
| `tempoMap[]` `{ startAbs, bpm }` | `tempoMap[]` `{ startTicks, bpm }` | `* PPQ` + shift osi |
| `meterMap[]` `{ startAbs, meter }` | `meterMap[]` num/den | Parse string `"5/8"` |

### Przesunięcie osi (countdown)

Legacy: CD od `startAbs = 0`, treść od np. 8.  
v5: treść od `startTicks = 0` (takt 1); CD ujemne.

```
shiftQuarters = startAbs pierwszej sekcji nie-Countdown
startTicks = round((startAbs - shiftQuarters) * PPQ)
```

**Uwaga:** pełny migrator 4.x jest **OUT** alpha.3. Powyższe reguły to kontrakt **dokumentacyjny** pod przyszły ACL ([ADR 0005](../../adr/0005-domain-axioms.md)) oraz ręczne seed/fixture w testach α3.

### OUT mapowania (nie w v2 α3)

`vocal`, `chords.clips`, `cues`, `key` / `keyMap`, `markers` (poza wyliczeniem długości), `midiProgramId`, `musicxmlFile`, `coverUrl`, `scoreBarMap`, `tuning`, `genre`, `year`, `source`, cycle fields, setlista, settings hosta.

---

## Resolvery (shared, czyste)

Do zaimplementowania w α3 (nie tutaj):

```ts
resolveTempoAt(project, positionTicks): number
resolveMeterAt(project, positionTicks): TimeSignature
resolveFormaClipAt(project, positionTicks): FormaClip | null
```

Sort eventów / clipów po `startTicks`; ostatni event z `startTicks ≤ position` wygrywa.

## Migracja formatVersion 1 → 2

Przy pierwszym GET/PUT po deployu α3:

- v1 na dysku → przy load: upgrade one-shot do v2 seed (Countdown+Intro) **albo** fail-fast + CLI (preferencja konstytucji: fail-fast; dla alpha dopuszczalny **explicit** upgrade w `createStores.readProject` z logiem — decyzja właściciela, patrz EXEC-SUMMARY).

Rekomendacja sesji: **auto-upgrade v1→v2 seed przy read**, bo alpha.2 projekty to tylko name; brak treści do utraty.
