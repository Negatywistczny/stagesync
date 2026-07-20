# ADR 0007 — Snap / edit grid (kwantyzacja edycji)

- **Status:** Proponowany
- **Data:** 2026-07-20

## Kontekst

StageSync v5 przechowuje pozycje jako **integer ticks + PPQ** ([ADR 0002](./0002-timebase-ssot.md)).
To nie wystarcza przy edycji Timeline: ołówek, drag, nożyczki i inserty na mapach
(Tempo, Metrum) muszą **kwantyzować** wskazany punkt do siatki muzycznej — jak
snap / quantize w DAW (Logic Pro, Ableton).

Legacy **4.x** realizował to przez `quantizeAbsBeat`, `snapAbsToBarStart` i
`beatUnitQuarters` w `song-maps.js` (float ćwierćnuty). v5 nie może powielać
ad-hoc `Math.round` w shellach webowych — to prowadzi do off-by-one (np. wstawienie
w następnym takcie zamiast klikniętego).

**Uwaga terminologiczna:** „track grid” (α4) = layout dock ↔ lane (CSS).
Ten ADR dotyczy **snap grid** / **edit quantize** — siatki **czasu**, nie layoutu UI.

## Decyzja

### 1. Warstwa

- **Kanon storage / transport:** ticks ([ADR 0002](./0002-timebase-ssot.md)).
- **Snap:** polityka **edycji UI** — czyste funkcje w `@stagesync/shared`
  (`snap-grid.ts`), bez DOM i bez `Date.now()`.
- Wynik snapu = **integer ticks** przed zapisem do draftu / PUT.

### 2. Tryby snap (rozszerzalne)

| Tryb | Semantyka (v5) | Port v4 |
|------|----------------|---------|
| `off` | brak kwantyzacji (ticks bez zmian) | — |
| `bar` | linia początku taktu muzycznego @ `meter` ( **miara** ) | `snapAbsToBarStart` |
| `beat` | siatka lokalnego beatu (`localTicksPerBeat`) | `quantizeAbsBeat` + `beatUnitQuarters` |
| `subdivision` | podział ćwierćnuty: 1/2, 1/4, 1/8, 1/16 | analog Logic „1/8 note” |

Tryb snap to **stan sesji Timeline** (React + opcjonalnie localStorage później).
**Nie** zapisujemy go w `project.json` w alpha.

**Domyślny tryb (na stałe):** `DEFAULT_SNAP_MODE = "bar"` (miara) w `@stagesync/shared`.
Timeline używa go **na sztywno** do czasu pickera UI; po dodaniu pickera `bar` pozostaje
wartością domyślną przy starcie sesji / nowym projekcie.

### 3. Kontekst muzyczny

Snap @ pozycji `atTicks` używa metrum z **`meterMap`** projektu
(`resolveMeterAt`) — nie hardcoded 4/4 w helperach shella.

Opcjonalnie: `contentFloorTicks` (koniec Countdown) — clamp jak v4
(`contentFloorAbs`); nie wstawiać treści w span Countdown.

### 4. Kontrakt API (shared)

Publiczne typy i funkcje — patrz `packages/shared/src/snap-grid.ts`:

- `SnapMode`, `SnapContext`
- `quantizeTicks(ticks, mode, ctx)` — jeden entry point dla narzędzi
- `snapTicksToBarStart`, `snapTicksToBeatGrid`, `snapTicksToSubdivision` — building blocks

**Zakaz:** shell Timeline / `formaCanvas` nie implementuje własnego snapu poza
wywołaniem shared (do czasu migracji istniejącego kodu).

### 5. Modyfikator klawiaturowy (α7+)

Przy drag / pencil / trim: **Cmd (macOS) / Ctrl (Windows/Linux) wciśnięty** =
chwilowy tryb **`off`** (brak kwantyzacji do siatki).

- Dotyczy tylko bieżącego gestu (pointer down → up).
- Domyślny tryb sesji (`bar`) **nie** zmienia się po puszczeniu klawisza.
- Semantyka: [ADR 0008](./0008-timeline-clip-editing.md) §7.

**OUT na start:** pełna tabela modyfikatorów Logic (Control = finer grid, Control+Shift = ticks/samples).

### 6. Narzędzia (kolejność wdrożenia)

| Narzędzie | Snap |
|-----------|------|
| Pencil (Forma) | must — przez `quantizeTicks` |
| Drag resize / move | should (α7 Forma; β1 audio) |
| Scissors, mapy Tempo/Metrum | should (α7) |
| Transport seek (UI) | opcjonalnie; SSOT seek = dokładne ticks |

## Poza zakresem (jawnie OUT na teraz)

- UI picker snap (dropdown Logic-style) — faza 2 → 5.0.0
- Relative snap (zachowanie offsetu względem siatki) — rozważenie po 5.0.0
- Snap per-ścieżka (Forma vs Tekst osobno)
- Walidacja snap na serwerze przy PUT
- Snap przy imporcie MIDI / audio / migratorze (ACL — [ADR 0005](./0005-domain-axioms.md))

## Konsekwencje

- Testy Vitest w shared: 4/4, 5/8, 6/8; granice taktu; pre-roll; subdivision.
- [ADR 0002](./0002-timebase-ssot.md): odsyłacz do tego ADR dla warstwy edycji.
- Refactor `apps/web/src/lib/formaCanvas.ts` → delegacja do `quantizeTicks` (faza 1).
- ROADMAP / TODO: fazy UI snap; semantyka tylko tutaj.

## Fazy implementacji

| Faza | Zakres |
|------|--------|
| **0** | Ten ADR + szkic API w `@stagesync/shared` |
| **1** | Pencil Forma → `quantizeTicks`; domyślnie `bar` |
| **2** | Toggle UI + tryby beat / subdivision |
| **3** | Drag, scissors, mapy; Cmd/Ctrl = snap off ([ADR 0008](./0008-timeline-clip-editing.md)) |
