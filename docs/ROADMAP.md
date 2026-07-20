# StageSync — Roadmapa

Kierunek produktu (długoterminowy). **Bieżąca checklista:** [TODO.md](./TODO.md)
(tylko aktywny etap). Historia wydań: [CHANGELOG.md](../CHANGELOG.md).

## Etapy wydania

| Wersja | Hero | Done (kryterium zamknięcia) | Scope |
|--------|------|-----------------------------|-------|
| **5.0.0-alpha.3** | Pion treści w ticks: Forma + mapy + zapis + transport + sekcja | Create → Timeline → pencil → save → play → Admin „Sekcja” | [report-scope-alpha3](./analysis/reports/report-scope-alpha3.md) |
| **5.0.0-alpha.4** | Timeline layout + operacyjne domknięcie Formy | Track grid (nagłówek↔lane); eye per ślad; specjalne nad treścią; picker; inspector; mapy read-only | [report-scope-alpha4](./analysis/reports/report-scope-alpha4.md) |
| **5.0.0-alpha.5** | Client roles poza Formą/`drums` | Co najmniej jedna dodatkowa rola Client działa z transportem + danymi projektu | *(przed startem)* |
| **5.0.0-alpha.6** | Admin Live Desk — setlista, scena, pliki | Import audio do projektu; metadata clipów; setlista; pliki w inspectorze | *(przed startem)* |
| **5.0.0-alpha.7** | Edycja Timeline (Forma + lane’y treści) | Smart Tool; Forma move/resize/pencil drag; Tekst/Akordy/Cue (start); Tap/UG/Różdżka wg cut | *(przed startem)* |
| **5.0.0-beta.1** | Feature complete pod docelowy 5.0.0 | Audio playback + clip edit; migrator 4.x; MIDI I/O; Docker; stabilność | — |
| **5.0.0** | Stabilne wydanie + nazwa hero linii 5.0 | Polish UI (zoom, help, copy, gęstość); `docs/api` domknięte; CI + smoke E2E | — |
| **5.1+** | Motywy, auth, kolejne minor features | TBD przy planowaniu linii 5.1 | — |

### Alpha 4 — zakres orientacyjny

**Must (layout — przed feature):**

- Track grid: synchronizacja dock (nazwy ścieżek) ↔ lane canvas
- Eye: per-ślad (nie tylko „Specjalne on/off”)
- Kolejność: Tempo / Tonacja / Metrum / Kotwice **nad** Formą/Tekstem/Akordami/Cue

**Must (produkt):**

- Lane Tempo/Metrum read-only z map; inspector rename + CD length
- Song picker z biblioteki; dirty polish; transport/load w UI
- **Snap grid (faza 1):** ołówek Forma przez `quantizeTicks` @ shared ([ADR 0007](./adr/0007-snap-grid.md)); domyślnie `bar`

**Should:** Admin panel toggle UX; empty state „Pliki projektu”; Client drums polish; BBT M1–M3

**OUT:** Tap, UG, Różdżka, pełne lane’y Tekst/Akordy/Cue, Undo/Redo  
**Odłożone do 5.0.0:** zoom (ikony/suwaki), pełna treść Pomocy; **snap UI** (picker beat/subdivision, faza 2 ADR 0007)

Plan PR: [report-implementation-plan-alpha4.md](./analysis/reports/report-implementation-plan-alpha4.md).

### Alpha 5 — zakres orientacyjny

- Wiring ról Client (grid akordów, karaoke, partytura — stopniowo)
- **OUT:** pełna partytura OSMD / MusicXML (ew. α7)

### Alpha 6 — zakres orientacyjny

- Setlista, auto-setlista, host settings/logs
- **Pliki projektu:** import audio do `data/projects/<id>/`; lista w inspectorze; **schema v3** (refs clipów) — bez pełnego silnika lub ze stubem
- **Świadoma IA v5:** Set ≠ Utwory (osobne zakładki) — wiring setu tutaj
- **OUT:** silnik odtwarzania, edycja geometryczna audio na Timeline (→ β1)

### Alpha 7 — zakres orientacyjny

- **Forma editing** ([ADR 0008](./adr/0008-timeline-clip-editing.md)): pencil drag, pointer move/resize, select+Delete, Smart Tool FSM, transakcyjny drag, no overlap
- **Snap:** Cmd/Ctrl = chwilowy snap off; drag/scissors/mapy przez `quantizeTicks` (faza 3 ADR 0007)
- Tap, UG, Różdżka; edycja lane’ów Tekst/Akordy/Cue (ticks v2) — wg scope report
- **OUT α7:** pełny stos Undo/Redo (draft + Zapisz/Odrzuć wystarczy); audio playback

### Beta 1 — zakres orientacyjny

- **Audio 0…N** ([ADR 0008](./adr/0008-timeline-clip-editing.md)): clip na Timeline, sync transport (`ticksToMs`), trim/move, waveform peak/RMS, gain clip + fader track + mute clip/track; **bez** pencil, **bez** stretch poza plik
- Migrator legacy 4.x → v5
- MIDI I/O (clock / urządzenia serwera)
- Docker Compose ([ADR 0004](./adr/0004-updates-docker.md))
- Shadow backup, OCC (`409`), polityka migracji schematu na volume, ESLint ACL shared, API `details` z Zod
- Doprecyzowanie ADR 0002 (tempo/metrum pre-roll)
- **Opcjonalnie:** Undo/Redo sesji Timeline (jeśli nie w 5.0.0)

### 5.0.0 — zakres orientacyjny

- Polish UI na żywych kontrolkach (typografia, proporcje, copy, gęstość)
- Timeline: zoom UI/H/V z ikonami; Pomoc z pełną treścią; **snap picker** (beat/subdivision)
- Audio polish: fade, crossfade, loop-region; ewent. overlap mode
- Admin: drobne UX (np. panel toggle) jeśli nie w α4
- **Undo/Redo** Timeline — jeśli nie w β1

### Po 5.0.0

- Motywy (`data-theme` + switcher)
- Auth / multi-user (speculative)

## Zasady operacyjne

1. **Jeden aktywny etap w TODO** — po tagu `v5.0.0-alpha.N` pełne czyszczenie
   [TODO.md](./TODO.md) i wyłącznie sekcja alpha.N+1 (procedura w TODO).
2. **Scope report** `docs/analysis/reports/report-scope-alphaN.md` tuż przed kodem
   danego etapu; ROADMAP trzyma hero + done na wysokim poziomie.
3. **Pull-forward** (alpha.4–7): drobne zadania z alpha.N+1 można wciągnąć do
   bieżącego TODO bez zmiany numeracji etapów w ROADMAP.
4. **Beta** dopiero gdy alpha.7 (lub wcześniejszy cut) ma jasne OUT.
5. **Fundament** przypisany do etapu (α4 lub beta.1), nie osobny work bucket.
6. **Dług layoutu shelli** (α3): nie blokuje release α3; domknięcie w α4 must PR #1.
7. **Snap / edit grid** ([ADR 0007](./adr/0007-snap-grid.md)): faza 0 (API shared) — done; faza 1 → α4; UI picker → 5.0.0; drag/scissors → α7; Cmd-off → α7.
8. **Edycja klipów** ([ADR 0008](./adr/0008-timeline-clip-editing.md)): Forma α7; audio β1; fade/crossfade → 5.0.0.

## Granica 0

Zmiana aksjomatów czasu (takt 1 / pre-roll ≤ 0 / ticks) lub izolacji folderów
projektów = nowa edycja, nie pozycja roadmapy „feature”. Zob.
[ADR 0005](./adr/0005-domain-axioms.md).
