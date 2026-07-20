# Scope alpha.3 — IN / OUT / ryzyka (v1 — po audycie 8h)

**Wersja docelowa:** `5.0.0-alpha.3`  
**Podstawa:** audyt iteracyjny i finalne raporty kanoniczne (nie hipoteza v0 sama w sobie).  
**Nie jest:** pełna parity v4 ani domknięcie całego TODO #1.

## Cel (jedno zdanie)

Da się **wybrać utwór**, **załadować Formę w ticks (z Countdown ≤ 0)**, **zapisać** ją, **odtworzyć** z bpm/meter z map i **zobaczyć aktywną sekcję** (Admin status + Client rola Forma/`drums`).

## IN (must)

| # | Wycinek | Kryterium done | Evidence |
|---|---------|----------------|----------|
| 1 | **ProjectSchema v2** + **`.strict()`** (lub reject unknown) | Zod: metadane + `forma.clips` (ticks) + `tempoMap`/`meterMap` + `ppq`; auto-upgrade v1→v2; **test strip→400** | `02`, `04` |
| 2 | **GET/PUT pełny dokument** | Atomic `project.json`; create = seed v2 | `04` |
| 3 | **Seed Countdown = 2 takty** | CD `startTicks: -7680`, `lengthTicks: 7680` @4/4 PPQ960 (nie −3840) | `02b` |
| 4 | **Admin → `/timeline/:projectId`** | Link z `selected.id`; Timeline GET projektu | `01`, `01b` |
| 5 | **Timeline Forma** | Canvas z GET; **pencil** mutuje; **Zapisz** → PUT; Odrzuć = reload | `01` |
| 6 | **Transport ↔ projekt** | `activeProjectId`; play/seek resolve bpm/meter (ostatni event ≤ ticks) + reanchor | `03`, `05` |
| 7 | **Resolver + Admin „Sekcja”** | shared `resolveFormaClipAt`; status nie `—` | `01`, `04` |

## IN (should — timebox)

| Wycinek | Uwagi |
|---------|--------|
| Client rola `drums` (Forma): tytuł + aktywna sekcja | Cut first jeśli ciśnienie — demo bez Client OK (`05` #2) |
| `POST /api/transport/load` | Jawny load bez play |
| Dirty badge | `TimelineShell` ma `hidden` dirty |
| Tempo/Metrum lane read-only z map | Eye on |
| Inspector: rename sekcji / length CD | przez Zapisz |
| Song picker Timeline ← `GET /api/library` | dziś overlay bez fetch (`01b`) |

## OUT (jawne)

| Temat | Powód / evidence |
|-------|------------------|
| Migrator 4.x (kod) | ACL; tylko mapa w `02`/`02b` |
| MIDI, audio engine, Docker, motywy, auth | TODO / ROADMAP |
| Tap, Różdżka, UG, Tekst/Akordy/Cue edit | `01`, legacy hero |
| Set / Scena / Pliki / Host API | disabled OK (ADR 0003) |
| Undo/Redo, eraser/scissors wiring | OUT |
| Pełny Client grid akordów | OUT; nie mylić z `drums` |
| Dual-write pól legacy (`startAbs`, vocal…) | konstytucja |
| Usuwanie kontrolek z DOM | wymagałoby delty inventarza (`01b`) |

## Korekty względem hipotezy v0

| v0 | v1 (po evidence) |
|----|------------------|
| CD seed −3840 (1 takt) | **−7680 (2 takty)** — `02b` |
| Play = blocker UI | Play już wired; blocker = **resolve map** — `01b` |
| Client „grid” | Rola **`drums` / Forma** — `01b` |
| (brak) Zod strict | **must** — `04`, `05` #6 |
| tempoMap „pełny silnik” | Wystarczy resolve „ostatni ≤ ticks” + reanchor — `03`, `05` #4 |
| Legacy CD@0 = v5 CD@0 | **False** — wymagany shift — `02b` |

## Ryzyka

| Ryzyko | Impact | Mitygacja |
|--------|--------|-----------|
| Scope creep Timeline v4 | wysoki | twardy OUT; PR vs ten plik |
| Oś CD / ruler | średni | seed −7680; testy resolver; nie hardcoded ruler |
| PUT bez strict | **krytyczny** | `.strict()` + test |
| BPM mid-play drift | średni | reanchor jak `engine.play` (`03`) |
| Client timebox | niski | cut should |
| activeProjectId multi-tab | niski | akceptacja alpha |

## Definicja „alpha.3 gotowe”

- [ ] Shared: Project v2 + strict + resolvery + testy (w tym strip→fail, CD@−7680, clip@0)
- [ ] Server: CRUD treści, transport load/play/seek z map + activeProjectId
- [ ] Web: route Timeline, Forma pencil+save, Admin link+sekcja; Client Forma jeśli timebox
- [ ] `docs/api/README.md` zaktualizowane
- [ ] CHANGELOG → alpha.3; wersja w shellach = package (dziś hardcoded α1 — `01`)
- [ ] CI zielone

## Kolejność PR (bez zmiany względem planu, z naciskiem)

1. `feat/project-schema-v2` (strict + seed −7680 + resolvery)  
2. `feat/project-content-api`  
3. `feat/timeline-project-route`  
4. `feat/timeline-forma-pencil`  
5. `feat/transport-project-maps`  
6. `feat/client-active-section` (opcjonalnie równolegle z 5)

Cut order przy sporze: **1→2→3→5→4→6** (transport przed pencil UI też OK jeśli API-first).
