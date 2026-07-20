# Scope alpha.5 — IN / OUT / ryzyka

**Wersja docelowa:** `5.0.0-alpha.5`  
**Podstawa:** hero Client roles poza Formą/`drums` ([TODO.md](../../TODO.md), [ROADMAP.md](../../ROADMAP.md)).  
**Schema:** Project v2 — `forma`, `tempoMap`, `meterMap` tylko; **brak** lane Tekst/Akordy/Cue w storage.

## Cel (jedno zdanie)

Client rola **Tekst (karaoke)** działa z transportem i danymi aktywnego projektu (sekcja Formy, BBT, tempo/metrum), obok istniejącego widoku **Forma (`drums`)**.

## IN (must)

| # | Wycinek | Kryterium done |
|---|---------|----------------|
| 1 | **Client karaoke wired** | Rola `karaoke`: tytuł utworu, sekcja (`resolveFormaClipAt`), BBT, tempo/metrum @ `displayTicks`; aktualizacja na tick transportu |
| 2 | **Empty state treści** | Gdy brak lane Tekst w schema: placeholder „Brak linii tekstu — edycja α7”, nie ogólne „Oczekiwanie…” przy ustawionym `activeProjectId` |
| 3 | **`drums` bez regresji** | Forma pane + split view (2 role) nadal działają |

## IN (should — timebox)

| Wycinek | Uwagi |
|---------|--------|
| Client welcome: ikony kart ról (parity v4) | emoji w tile |
| Client `drums` polish | typografia empty states |
| Admin „Teraz” vs `activeProjectId` | should z TODO |
| Transport UI: Stop / seek | cut first przy timebox |

## OUT (jawne)

| Temat | Powód |
|-------|--------|
| Pełna partytura OSMD / MusicXML | α7 |
| Clipy Tekst/Akordy/Cue w schema + edycja | α7 |
| Siatka akordów (`grid`) wiring treści | α7 |
| Audio playback | α6 import / β1 silnik |
| Timeline locator drag pełna parity v4 (keyboard nudge) | 5.0.0 polish |

## Timeline patch (patch w tej samej linii wydania)

| Wycinek | Done |
|---------|------|
| `--ss-z-*` stacking + playhead/locator v4 na linijce | commit `6d76053` + typografia + drag |
| Eye w ruler dock (bez pustego wiersza) | `6d76053` |

## Smoke gate α5

1. Admin/Timeline: play na projekcie z Formą  
2. Client: wybór **Tekst** → sekcja + takt + tempo zmieniają się z transportem  
3. Split **Tekst + Forma** — oba panele live  
4. Timeline: locator drag na linijce; playhead/locator widoczne

## Definicja „alpha.5 gotowe”

- [ ] Must #1–#3  
- [ ] CI zielone  
- [ ] Bump `5.0.0-alpha.5` + CHANGELOG + QA sign-off  
- [ ] Tag `v5.0.0-alpha.5` (na prośbę)

## Kolejność PR (zalecana)

1. `fix/timeline-ruler-locator` — typografia + drag + CHANGELOG fragment  
2. `docs/report-scope-alpha5`  
3. `feat/client-karaoke` — KaraokePane, hook, test  
4. `feat/client-welcome-polish` — ikony (should)  
5. `chore/release-alpha.5`
