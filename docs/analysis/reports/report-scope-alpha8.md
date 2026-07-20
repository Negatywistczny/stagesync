# Scope alpha.8 — IN / OUT / ryzyka

**Wersja docelowa:** `5.0.0-alpha.8`  
**Podstawa:** hero Parity workflow z legacy 4.x — Timeline treści + Admin/Client ([TODO.md](../../TODO.md), [ROADMAP.md](../../ROADMAP.md)).  
**ADR:** [0008](../../adr/0008-timeline-clip-editing.md), [0007](../../adr/0007-snap-grid.md); autoplay metronomu: Web Audio `resume()` na user gesture.

## Cel (jedno zdanie)

Po α8 użytkownik 4.x ma w v5 **ten sam workflow edycji treści i Live Desk** (bez audio/MIDI tracks i bez migratora) — Tap/UG/Różdżka, lane’y Akordy/Cue, Scissors, Undo, metronom, Client grid.

## IN (must)

| # | Wycinek | Kryterium done |
|---|---------|----------------|
| M1 | **Scope + plan** | Ten raport + [report-implementation-plan-alpha8.md](./report-implementation-plan-alpha8.md); ROADMAP α8/α9/β1; TODO = wyłącznie α8 |
| M2 | **Akordy lane** | Pencil click (+ drag 1 clip = 1 akord); select; Delete/eraser; inspector `symbol`; no-overlap jak Forma; Client **grid** czyta clipy |
| M3 | **Cue lane** | Pencil click; select; Delete; inspector `label`; Client cue toast nadal z Host; lane render clipów |
| M4 | **Scissors Forma** | Split zaznaczonego / @ snap pod playhead/klik; Countdown nietykalny; shared helper + Vitest |
| M5 | **Tap (Tekst dock)** | Tap tempo / timing wokalu wg kontraktu 4.x (MVP: tap BPM → tempo map @ locator; tool enabled) |
| M6 | **Różdżka** | Menu: Tekst→Forma, Akordy→Forma, Tekst+Akordy→Forma — generuje sekcje Formy z clipów treści (overwrite no-overlap) |
| M7 | **Import UG** | Timeline song screen / Admin: przyciski + ścieżka importu UG → draft Tekst/Akordy; parser → Zod Result; zły input = komunikat UI (nie crash) |
| M8 | **Undo / Redo** | Stos sesji na mutacjach draftu; **po Zapisz (PUT) stos zostaje**, `dirty=false`; **Odrzuć** = last saved snapshot + wyczyść stos; Undo poniżej punktu zapisu → `dirty` znów `true` |
| M9 | **Metronom** | Dźwięk klików sync z transportem SSOT (Web Audio); **`audioContext.resume()`** przy pierwszym Play lub toggle metronomu |
| M10 | **Client parity** | Rola `grid` z `akordy.clips`; header **→następny** (setlista); fullscreen enable jeśli trywialne |
| M11 | **Admin library MVP** | Filtr + sort listy utworów żywe; Batch PC / PC display jeśli schema pozwala; Scena: filtr ról w cue |

### Reguły twarde (Gemini — przyjęte)

| # | Reguła |
|---|--------|
| 7a | `AudioContext.resume()` na pierwszym Play / toggle metronomu |
| 7b | UG: Zod + `Result`; zły input = toast/dialog, nie crash |
| 7c | Zapisz: `dirty=false`, stos Undo **zostaje**; Odrzuć = server snapshot + clear stos |

## IN (should — timebox)

| Priorytet | Wycinek | Done minimalny |
|-----------|---------|----------------|
| 1 | **OSMD stub/wire** | Rola `score`: load MusicXML path / pusty shell z realnym hookiem (bez pełnej nawigacji nut) |
| 2 | **Tekst move/resize** | Jak Forma (shared collision + gesture) — cut first przy presji |
| 3–5 | Admin Pliki paczki / Host logi / Client presence | Cut first przy presji |

## OUT (jawne)

| Temat | Etap |
|-------|------|
| Audio 0…N playback / trim / waveform / gain / mute | **β2** |
| MIDI tracks + Host MIDI I/O | **β2** |
| Migrator legacy 4.x → v5 | **α9** |
| Docker Compose | **β1** |
| Tauri desktop shell | **β1** ([ADR 0010](../../adr/0010-desktop-shell-tauri.md)) |
| Pełna renderacja OSMD (nawigacja nut, sync score) | β2+ / 5.0.0 |
| Zoom tool (lupa) | **OUT** / świadomie usunięte (suwaki + Ctrl/Meta+wheel) |
| Suwaki Zoom H/V/UI | **wchłonięte w rebuild α8** (code freeze) — nie 5.0.0 |
| Snap UI picker | **5.0.0** |
| Fade / Flex Time | OUT / 5.0.0 |
| git-apply | nigdy ([ADR 0004](../../adr/0004-updates-docker.md)) |

## Smoke gate α8

1. Akordy: pencil → symbol w inspectorze → Client grid pokazuje akord w czasie.
2. Cue: pencil + label; Delete działa; Countdown nietykalny.
3. Scissors: split sekcji Formy @ snap; Zapisz→reload.
4. Tap na Tekst: timing / tempo wg scope (smoke z reportu).
5. Różdżka Tekst→Forma tworzy sekcje; Undo cofa.
6. UG import wypełnia Tekst/Akordy (fixture); broken UG → komunikat, app żyje.
7. Undo/Redo: edit→Zapisz (`dirty` off)→Undo nadal cofa sesję; Odrzuć = stan z serwera.
8. Metronom: świeża karta → Play/toggle → `resume` + słyszalne kliki; Stop cisza.
9. Client →następny zmienia utwór setlisty.
10. *(Should)* Score: MusicXML stub bez crasha.
11. `pnpm lint && check-types && test && build`.

## Definicja „alpha.8 gotowe”

- [x] Must M1–M11 (kod + QA unit/UI — [report-qa-signoff-alpha8.md](./report-qa-signoff-alpha8.md))
- [x] Smoke #1–#9 wired + CI (engineering; **PO P8** → α9)
- [x] Rebuild TE-P0 / CD / chrome / Admin polish — **code freeze** ([report-alpha8-code-freeze.md](./report-alpha8-code-freeze.md))
- [x] CHANGELOG Unreleased + TODO→α9 + QA zaktualizowane (2026-07-20)
- [x] Tag git `v5.0.0-alpha.8` (na freeze `fb7720d`)
- [x] Brak regresji α6/α7 — potwierdzenie w PO smoke α9 (P8 green 2026-07-21)

**Uwaga:** „α8 gotowe” = engineering freeze, **nie** β-ready i **nie** green PO smoke.

## Kolejność PR

Zob. [report-implementation-plan-alpha8.md](./report-implementation-plan-alpha8.md).
