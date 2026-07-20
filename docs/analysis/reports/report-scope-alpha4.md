# Scope alpha.4 — IN / OUT / ryzyka (v0 — po review UI α3)

**Wersja docelowa:** `5.0.0-alpha.4`  
**Podstawa:** domknięcie Timeline po α3 + **dług layoutu shelli** zidentyfikowany po smoke α3 (nie był blockerem treści).  
**Nie jest:** pełna parity v4 Timeline, edycja Tekst/Akordy/Cue, setlista koncertowa.

## Cel (jedno zdanie)

Timeline ma **czytelny, stabilny układ ścieżek** (jak v4: nagłówek ↔ lane w jednej siatce), **eye per ślad**, **specjalne lane’y nad treścią**, oraz domknięty workflow operacyjny Formy (picker, dirty, inspector, read-only mapy).

## Kontekst — dług UI po α3 (świadomie odłożony)

Alpha.3 dostarczyła **pion treści** (Forma + mapy + PUT + transport + sekcja). Shell Timeline z α1–α2 pozostał **layoutowo niedokończony**:

| Problem (smoke α3) | Klasyfikacja | Etap |
|--------------------|--------------|------|
| Etykiety ścieżek (dock) ≠ lane’e canvas; rozjeżdżanie przy resize | **Bug layoutu** — nie delta ADR | **α4 must** |
| Eye: tylko „Specjalne on/off”, brak per-ślad | **Niedokończony inventarz** | **α4 must** |
| Tempo/Metrum/Tonacja/Kotwice pod treścią zamiast nad | **Kolejność ≠ v4** — nie udokumentowana delta | **α4 must** |
| Lane Tempo/Metrum: tekst zamiast read-only z map | **Should α3 → must α4** | **α4 must** |
| Zoom UI/H/V: litery, suwaki disabled | **Placeholder shella** | **5.0.0** (polish) |
| Pomoc: szkielet treści | **Placeholder shella** | **5.0.0** (copy) |
| Admin „Ukryj panel” w nagłówku karty Utwory | **Layout v5** — słaby UX | **α4 should** |
| „Pliki projektu” statyczna lista bez plików | **Placeholder inventarza** | **α6** (+ empty state wcześniej) |
| Set vs Utwory — osobne zakładki | **Świadoma IA v5** ([ADR 0003](../../adr/0003-ui-direction-booth.md)) | **α6** wiring |

## IN (must)

| # | Wycinek | Kryterium done |
|---|---------|----------------|
| 1 | **Track grid Timeline** | Wspólna siatka wierszy: nagłówek ścieżki (dock) + lane canvas **zsynchronizowane wysokością**; brak rozjeżdżania przy węższym oknie (min. test manualny + jeden test layout/CSS smoke jeśli możliwe) |
| 2 | **Eye menu per ślad** | Min.: Treść (Forma/Tekst/Akordy/Cue) vs Specjalne (Tempo/Tonacja/Metrum/Kotwice) + **pojedyncze** ukrywanie śladów z inventarza (Forma zawsze widoczna) |
| 3 | **Kolejność lane’ów = v4** | Nad treścią: Tempo, Tonacja, Metrum, Kotwice (domyślnie ukryte eye); pod spodem: Forma, Tekst, Akordy, Cue, Audio |
| 4 | **Lane Tempo/Metrum read-only** | Render z `tempoMap` / `meterMap` (nie tylko tekst w placeholder lane); synchronizacja z playhead |
| 5 | **Inspector Formy** | Rename sekcji + długość Countdown → mutacja draft → Zapisz → PUT |
| 6 | **Song picker** | Pełny flow: lista z `GET /api/library`, wybór → `/timeline/:id` (bez mock overlay) |
| 7 | **Dirty badge + load** | Dirty widoczny; opcjonalnie jawny `POST /api/transport/load` w UI (jeśli nie w α3) |

## IN (should — timebox)

| Wycinek | Uwagi |
|---------|--------|
| Admin: „Ukryj panel” na krawędzi splitu (nie w toolbarze Utwory) | UX polish |
| Client `drums` polish (typografia, empty states) | Jeśli cut w α3 |
| Client welcome: ikony kart ról + chipów tonacji/stróju (parity v4) | Shell UX — odłożone z QA α3 |
| Client partytura: ikony w pickerze partii/instrumentu (`score-parts-prompt`) | Shell UX; wiring OSMD → **α5** |
| Walidacja transportu web + BBT (M1–M3 z audytu) | Raport overnight |
| Admin „Pliki projektu”: empty state zamiast fake listy | Pull-forward z α6 — **bez** wiring storage |

## OUT (jawne)

| Temat | Powód |
|-------|--------|
| Tap, UG, Różdżka | α7 / hero legacy |
| Pełne lane’y Tekst/Akordy/Cue (edycja clipów) | α7 |
| Undo/Redo, eraser/scissors wiring | OUT |
| Zoom działający (suwaki UI/H/V) | 5.0.0 polish |
| Pełna treść Pomocy (copy v4) | 5.0.0 polish |
| Setlista / auto-setlista wiring | α6 |
| MusicXML / audio / okładka w inspectorze | α6 + schema |
| Playwright E2E Timeline layout | Opcjonalnie po α4 |

## Świadome delty v5 (bez zmiany w α4)

| Temat | Uzasadnienie |
|-------|-------------|
| Admin: zakładki Utwory · Set · Scena · Pliki · Host | ADR 0003 — layout v5 |
| Set osobno od biblioteki | Model produktu; wiring α6 |
| Countdown w ticks (ujemne) | ADR 0002 |
| React + CSS Modules + `--ss-*` | Konstytucja UI |

## Ryzyka

| Ryzyko | Impact | Mitygacja |
|--------|--------|-----------|
| Refactor layoutu Timeline = duży diff CSS | średni | Osobny PR #1 `feat/timeline-track-grid` przed feature PR |
| Scope creep „prawie v4 canvas” | wysoki | Twardy OUT; lane Tekst/Akordy = placeholder disabled |
| Eye state vs URL/bookmark | niski | Local state + opcjonalnie localStorage później |

## Definicja „alpha.4 gotowe”

- [ ] Track grid: nagłówki ↔ lane’y zsynchronizowane; eye per ślad; specjalne nad treścią
- [ ] Tempo/Metrum lane read-only z map
- [ ] Inspector rename + CD length → PUT
- [ ] Song picker z biblioteki
- [ ] Smoke: picker → edycja Formy → save → play → sekcja (Admin + Client)
- [ ] CI zielone; bump `5.0.0-alpha.4`

## Kolejność PR (zalecana)

1. `feat/timeline-track-grid` — siatka + eye + kolejność lane’ów (**blokuje resztę UI**)  
2. `feat/timeline-readonly-maps` — lane Tempo/Metrum z danych  
3. `feat/timeline-inspector-forma` — rename + CD length  
4. `feat/timeline-song-picker` — biblioteka → route  
5. `feat/admin-inspector-polish` — empty state plików (should); panel toggle (should)  
6. `chore/release-alpha.4`

Cut order przy sporze: **1 → 4 → 2 → 3 → 5 → 6**.

## Stan po audycie (2026-07-20)

Audyt read-only: [report-audit-alpha4.md](./report-audit-alpha4.md) · exec: [report-exec-summary-alpha4.md](./report-exec-summary-alpha4.md).

**Werdykt:** tag `5.0.0-alpha.4` **przedwczesny** — repo gotowe jako **alpha.3**; bramka release α4 **ZAMKNIĘTA** do domknięcia must #1–#6.

| # | Kryterium must | Status | Notatka audytu |
|---|----------------|--------|----------------|
| 1 | Track grid | **FAIL** | Osobne drzewa DOM dock vs lanes; rozjazd przy resize |
| 2 | Eye per ślad | **FAIL** | Tylko „Specjalne on/off” |
| 3 | Kolejność lane’ów = v4 | **FAIL** | Specjalne pod treścią |
| 4 | Lane Tempo/Metrum z map | **PARTIAL** | Wartości OK; brak renderu segmentów |
| 5 | Inspector Formy | **FAIL** | Read-only; brak rename / CD length UI |
| 6 | Song picker | **PASS** | `GET /api/library` → `/timeline/:id` |
| 7 | Dirty badge + load | **PARTIAL** | Badge OK; brak guard wyjścia; load przez play |

**Must pass rate:** ~21% (1 PASS · 2 PARTIAL · 4 FAIL). **Bloker sprintu:** PR `feat/timeline-track-grid`.
