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
| Zoom H/V / tool | working | suwaki H/V/UI (+ wheel); tool lupa **usunięte** | **restored** (bez tool) |
| Wygląd light/contrast | working | `data-theme` tokens | **restored** |
| Tempo BPM @ playhead | working | edit modal | **restored** |
| Metadane PC/artist/genre | working | inspector | **restored** |
| Loop visual / server region | working | still MVP seek(0) | OUT (doc) |
| Audio / MIDI I/O | subset | OUT | β1/β2 |
| git-apply | working | OUT forever | ADR 0004 |

## Werdykt

**Must M1–M11:** zaimplementowane; CI zielone (stan z sesji QA).  
Dead-controls restore + rebuild TE-P0/CD/Admin: **code freeze** 2026-07-20 ([report-alpha8-code-freeze.md](./report-alpha8-code-freeze.md)).

| Gate | Wynik |
|------|-------|
| Engineering α8 (must + rebuild code) | **freeze** |
| Client CL-01/04/05 (kod + Vitest) | **done** → α9 (2026-07-21) |
| Migrator M9 fixtures / CI dry-run | **done** → α9 |
| PO smoke (P8) | **open** — engineering ready; wymaga ludzkiego sign-off |
| β ready | **nie** (do green P8) |

### PO smoke P8 — checklista (czeka na PO)

Uruchom lokalnie Admin / Timeline / Client na zmergowanym drzewie:

1. **T-gest** — marquee, multi-select, multi-drag, ⌘C/X/V/D  
2. **T-loc / T-zoom / T-maps / T-chrome** — locator, zoom H/V/UI, mapy, chrome  
3. **meta / CD** — Countdown length + ephemeral digits  
4. **A1** — Set + wybór utworu  
5. **C1** — Karaoke bar fill, Grid cycle, Forma strip  

Po green: odhacz w [TODO.md](../../TODO.md) + zaktualizuj inventarz.

Tag `v5.0.0-alpha.8` / bump `alpha.9` — **tylko na prośbę**.  
**Zakaz** `5.0.0-beta.*` do green P8.  
**Zakaz startu β1** (Docker/Tauri) do green P8 — [ROADMAP](../../ROADMAP.md).
