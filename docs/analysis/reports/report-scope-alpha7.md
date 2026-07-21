# Scope alpha.7 — IN / OUT / ryzyka

**Wersja docelowa:** `5.0.0-alpha.7`  
**Podstawa:** hero Edycja Timeline — Forma + lane’y treści ([TODO.md](../../TODO.md), [ROADMAP.md](../../ROADMAP.md)).  
**ADR:** [0008](../../adr/0008-timeline-clip-editing.md) (Zaakceptowany), [0007](../../adr/0007-snap-grid.md) faza 3.

## Cel (jedno zdanie)

Na Timeline można **edytować geometrię Formy** (pencil drag, move/resize, Delete, Smart Tool, no-overlap, Cmd snap-off) z draft + Zapisz; opcjonalnie start lane’ów treści (schema v4 + Tekst MVP).

## IN (must)

| # | Wycinek | Kryterium done |
|---|---------|----------------|
| M1 | **Scope + plan** | Ten raport; ADR 0008 → Zaakceptowany |
| M2 | **Shared no-overlap** | `clip-collision.ts`: move/resize/insert/delete; Countdown nietykalny; section `startTicks >= 0`; Vitest |
| M3 | **Pencil drag Forma** | Pointerdown→move→up: sekcja na zakres taktów; snap; overwrite; preview; clamp ≥ 0 |
| M4 | **Pointer move/resize** | Body → `startTicks`; brzeg → `lengthTicks`; no-overlap; Countdown locked |
| M5 | **Delete** | Select + Delete/Backspace; eraser = delete zaznaczonego; luki zostają; nie Countdown |
| M6 | **Smart Tool** | Toolbar `smart`; hit zones tylko `pointer` \| `smart`; Pencil = exclusive draw |
| M7 | **Snap Cmd/Ctrl-off** | `metaKey \|\| ctrlKey` na **każdym** `pointermove` |

**Zakaz:** mutacja `draftProject` na każdy `pointermove` — tylko `gesturePreview`, commit na pointerup.

## IN (should — timebox)

| Priorytet | Wycinek | Done minimalny |
|-----------|---------|----------------|
| 1 | **Schema v4** | `tekst` / `akordy` / `cue` clips; upgrade v3→v4; seed puste |
| 2 | **Lane Tekst MVP** | Pencil click + select + Delete + inspector; Client karaoke z linii |
| 3 | **Akordy / Cue start** | Render + pencil click (cut first przy timebox) |
| 4 | **Scissors Forma** | Split @ snap (cut first) |
| — | **Tap / UG / Różdżka** | **Cut first** — disabled shell |

## OUT (jawne)

| Temat | Etap |
|-------|------|
| Pełny Undo/Redo sesji | β1 / 5.0.0 |
| Audio playback / trim / waveform | **β1** |
| Snap UI picker (beat/subdivision) | 5.0.0 |
| Pełna partytura OSMD | β1+ |
| Gain/Mute tools, overlap modes | β1 / 5.0.0 |
| Relative snap | po 5.0.0 |

## Smoke gate α7

1. Pencil **click** = 1 takt @ snap (regresja α3)
2. Pencil **drag** = sekcja wielotaktowa; overwrite sąsiadów
3. Pointer: body = move; brzeg = resize; no-overlap auto-trim
4. Select + Delete usuwa sekcję (nie Countdown); luka zostaje
5. Smart: strefy trim vs move; **Pencil nad krawędzią = insert, nie trim**
6. Cmd/Ctrl **w trakcie** drag = snap live off; sekcja nie wchodzi w pre-roll &lt; 0
7. Zapisz → reload → geometria trwała
8. *(Should)* Tekst: pencil + linie w Client karaoke
9. `pnpm lint && check-types && test && build`

## Definicja „alpha.7 gotowe”

- [ ] Must M1–M7 (reguły 6a–6c z planu)
- [ ] Smoke #1–#7
- [ ] CI zielone
- [ ] Bump `5.0.0-alpha.7` + CHANGELOG + QA sign-off
- [ ] Tag `v5.0.0-alpha.7` (na prośbę)

## Kolejność PR

Zamknięte — historia w [CHANGELOG.md](../../../CHANGELOG.md).
