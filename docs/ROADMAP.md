# StageSync — Roadmapa

Kierunek produktu (długoterminowy). **Bieżąca checklista:** [TODO.md](./TODO.md)
(tylko aktywny etap). Historia wydań: [CHANGELOG.md](../CHANGELOG.md).

## Etapy wydania

| Wersja | Hero | Done (kryterium zamknięcia) | Scope |
|--------|------|-----------------------------|-------|
| **5.0.0-alpha.3** | Pion treści w ticks: Forma + mapy + zapis + transport + sekcja | Create → Timeline → pencil → save → play → Admin „Sekcja” | [report-scope-alpha3](./analysis/reports/report-scope-alpha3.md) |
| **5.0.0-alpha.4** | Domknięcie Timeline po α3 (should + UX operacyjny) | Timeline wygodny do codziennej edycji Formy: picker, dirty, load, read-only mapy | *(przed startem)* |
| **5.0.0-alpha.5** | Client roles poza Formą/`drums` | Co najmniej jedna dodatkowa rola Client działa z transportem + danymi projektu | *(przed startem)* |
| **5.0.0-alpha.6** | Admin Live Desk — setlista, scena, host | Workflow „wybierz utwór → scena → play” bez mocków lokalnych | *(przed startem)* |
| **5.0.0-alpha.7** | Treść zaawansowana (Tap, UG, Różdżka, Tekst/Akordy/Cue) | Wybrane hero legacy na ticks v2; reszta jawne OUT lub 5.1+ | *(przed startem)* |
| **5.0.0-beta.1** | Feature complete pod docelowy 5.0.0 | Migrator 4.x; audio/MIDI; Docker Compose; fundament stabilności; brak High z audytu | — |
| **5.0.0** | Stabilne wydanie + nazwa hero linii 5.0 | Polish UI; `docs/api` domknięte; CI + smoke E2E; tag `v5.0.0` | — |
| **5.1+** | Motywy, auth, kolejne minor features | TBD przy planowaniu linii 5.1 | — |

### Alpha 4 — zakres orientacyjny

- Dirty badge; lane Tempo/Metrum read-only; inspector (rename / CD length)
- Song picker z `GET /api/library`; `POST /api/transport/load`
- Client rola `drums` (jeśli wycięte w α3)
- Walidacja transportu web + BBT (M1–M3 z audytu)
- **OUT:** Tap, UG, Różdżka, pełne lane’y Tekst/Akordy/Cue, Undo/Redo

### Alpha 5 — zakres orientacyjny

- Wiring ról Client (grid akordów, karaoke, partytura — stopniowo)
- **OUT:** pełna partytura OSMD / MusicXML (ew. α7)

### Alpha 6 — zakres orientacyjny

- Setlista, auto-setlista, pliki, host settings/logs (wiring `disabled`)
- **OUT:** auth, multi-user, pełny deploy produkcyjny

### Beta 1 — zakres orientacyjny

- Migrator legacy 4.x → v5
- Audio 0…N + sync z transportem SSOT (`ticksToMs` / `msToTicks`)
- MIDI I/O (clock / urządzenia serwera)
- Docker Compose ([ADR 0004](./adr/0004-updates-docker.md))
- Shadow backup, OCC (`409`), polityka migracji schematu na volume, ESLint ACL shared, API `details` z Zod
- Doprecyzowanie ADR 0002 (tempo/metrum pre-roll)

### 5.0.0 — zakres orientacyjny

- Polish UI na żywych kontrolkach (typografia, proporcje, copy, gęstość)

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

## Granica 0

Zmiana aksjomatów czasu (takt 1 / pre-roll ≤ 0 / ticks) lub izolacji folderów
projektów = nowa edycja, nie pozycja roadmapy „feature”. Zob.
[ADR 0005](./adr/0005-domain-axioms.md).
