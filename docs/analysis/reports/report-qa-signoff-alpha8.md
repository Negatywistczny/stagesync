# QA sign-off — alpha.8

**Cel:** zamknięcie `5.0.0-alpha.8` — smoke przed tagiem.  
**Scope:** [report-scope-alpha8.md](./report-scope-alpha8.md) · [plan](./report-implementation-plan-alpha8.md).  
**Data:** 2026-07-20.

## CI

| Gate | Wynik |
|------|-------|
| `pnpm lint` | pass |
| `pnpm check-types` | pass |
| `pnpm test` | pass (shared 82 · web 44 · server 28 · ui 5) |
| `pnpm build` | pass |

## Smoke (must)

| # | Kryterium | Status |
|---|-----------|--------|
| 1 | Akordy pencil → inspector → Client grid | wired (unit + UI) |
| 2 | Cue pencil + label; Delete; Countdown locked | wired |
| 3 | Scissors split @ snap | wired + Vitest |
| 4 | Tap dock Tekst → tempo map | wired (MVP BPM) |
| 5 | Różdżka Tekst→Forma + Undo | wired |
| 6 | UG happy + broken → UI message | wired + Vitest |
| 7 | Undo: Zapisz zostawia stos; Odrzuć = saved | wired + Vitest |
| 8 | Metronom `resume()` + klik | wired (Web Audio) |
| 9 | Client →następny | wired |
| 10 | Score MusicXML stub | should wired |
| 11 | CI full | pass |

## Świadome delty (nie bloker α8)

Zob. tabela w [ui-shell-inventory.md](../../ui-shell-inventory.md).

### Follow-up po α8 (dead-controls restore)

| Control | v4 | v5 | Action |
|---------|----|----|--------|
| Host Restart / Wyłącz | 2× confirm | wired (`/api/system/*`) | **restored** |
| Host sieć readout | working | `GET /api/system/network` | **restored** |
| Tonacja keyMap | working | schema v5 + edit/readout | **restored** |
| Batch PC / Ostrzeżenia / PC col | working | library fields + UI | **restored** |
| MusicXML upload | working | asset kind musicxml | **restored** |
| Wzory / Eksport lista | working | templates + `.stagesync.json` | **restored** |
| Zoom H/V / tool | working | MVP sliders + tool | **restored** |
| Wygląd light/contrast | working | `data-theme` tokens | **restored** |
| Tempo BPM @ playhead | working | edit modal | **restored** |
| Metadane PC/artist/genre | working | inspector | **restored** |
| Loop visual / server region | working | still MVP seek(0) | OUT (doc) |
| Audio / MIDI I/O | subset | OUT | β1/β2 |
| git-apply | working | OUT forever | ADR 0004 |

## Werdykt

**Must M1–M11:** zaimplementowane; CI zielone.  
Dead-controls restore (Restart first): wired w working tree — **nie commitowane automatycznie**.  
Tag `v5.0.0-alpha.8` — **tylko na prośbę**.
