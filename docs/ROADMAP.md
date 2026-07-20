# StageSync — Roadmapa

Kierunek produktu (długoterminowy). **Bieżąca checklista:** [TODO.md](./TODO.md)
(tylko aktywny etap). Historia wydań: [CHANGELOG.md](../CHANGELOG.md).

## Etapy wydania

| Wersja | Hero | Done (kryterium zamknięcia) | Scope |
|--------|------|-----------------------------|-------|
| **5.0.0-alpha.3** | Pion treści w ticks: Forma + mapy + zapis + transport + sekcja | Create → Timeline → pencil → save → play → Admin „Sekcja” | [report-scope-alpha3](./analysis/reports/report-scope-alpha3.md) |
| **5.0.0-alpha.4** | Timeline layout + operacyjne domknięcie Formy | Track grid (nagłówek↔lane); eye per ślad; specjalne nad treścią; picker; inspector; mapy read-only | [report-scope-alpha4](./analysis/reports/report-scope-alpha4.md) |
| **5.0.0-alpha.5** | Client roles poza Formą/`drums` | Co najmniej jedna dodatkowa rola Client działa z transportem + danymi projektu | *(przed startem)* |
| **5.0.0-alpha.6** | Admin Live Desk — setlista, scena, host | Workflow „wybierz utwór → scena → play”; pliki projektu z API | *(przed startem)* |
| **5.0.0-alpha.7** | Treść zaawansowana (Tap, UG, Różdżka, Tekst/Akordy/Cue) | Wybrane hero legacy na ticks v2; reszta jawne OUT lub 5.1+ | *(przed startem)* |
| **5.0.0-beta.1** | Feature complete pod docelowy 5.0.0 | Migrator 4.x; audio/MIDI; Docker Compose; fundament stabilności; brak High z audytu | — |
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

- Setlista, auto-setlista, **pliki projektu** (inspector + storage), host settings/logs
- **Świadoma IA v5:** Set ≠ Utwory (osobne zakładki) — wiring setu tutaj
- **OUT:** auth, multi-user, pełny deploy produkcyjny

### Alpha 7 — zakres orientacyjny

- Tap, UG, Różdżka; edycja lane’ów Tekst/Akordy/Cue (ticks v2)
- **Snap grid (faza 3):** drag, scissors, mapy Tempo/Metrum — wspólny `quantizeTicks` ([ADR 0007](./adr/0007-snap-grid.md))

### Beta 1 — zakres orientacyjny

- Migrator legacy 4.x → v5
- Audio 0…N + sync z transportem SSOT (`ticksToMs` / `msToTicks`)
- MIDI I/O (clock / urządzenia serwera)
- Docker Compose ([ADR 0004](./adr/0004-updates-docker.md))
- Shadow backup, OCC (`409`), polityka migracji schematu na volume, ESLint ACL shared, API `details` z Zod
- Doprecyzowanie ADR 0002 (tempo/metrum pre-roll)

### 5.0.0 — zakres orientacyjny

- Polish UI na żywych kontrolkach (typografia, proporcje, copy, gęstość)
- Timeline: zoom UI/H/V z ikonami; Pomoc z pełną treścią
- Admin: drobne UX (np. panel toggle) jeśli nie w α4

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
7. **Snap / edit grid** ([ADR 0007](./adr/0007-snap-grid.md)): faza 0 (API shared) — done; faza 1 → α4; UI picker → 5.0.0; drag/scissors → α7.

## Granica 0

Zmiana aksjomatów czasu (takt 1 / pre-roll ≤ 0 / ticks) lub izolacji folderów
projektów = nowa edycja, nie pozycja roadmapy „feature”. Zob.
[ADR 0005](./adr/0005-domain-axioms.md).
