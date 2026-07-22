# ADR 0002 — Timebase SSOT

- **Status:** Zaakceptowany
- **Data:** 2026-07-19
- **Aktualizacja:** 2026-07-20 — float `absBeat` usunięty; kanon: ticks + PPQ  
- **Aktualizacja:** 2026-07-22 — doprecyzowanie tempa/metrum w pre-roll (Countdown ≤ 0)

## Kontekst

Klienci na scenie potrzebują płynnego playhead, ale konkurujące zegary (przeglądarka vs serwer vs MIDI) powodują drift i desync. Matematyka czasu domenowego musi być testowalna i wspólna dla paczek.

Legacy **4.x** trzymał pozycje jako float ćwierćnuty (`startAbs`). To upraszczało zapis, ale przy 5/8, 7/8 i wielokrotnych konwersjach float + `Math.round` dawał drift i off-by-one. Sekundy / sample jako kanon pozycji clipów byłyby jeszcze gorsze (tempo map, wall clock).

Pełny „model BBT w silniku” bywa mylony z bezpieczeństwem całkowitym: **BBT to projekcja** (bar:beat:tick). Bezpieczeństwo daje **stała rozdzielczość ticków (PPQ) i integers**, nie sam zapis w postaci BBT.

## Decyzja

1. **Czysty czas** — helpery w `@stagesync/shared` jako czyste funkcje (bez I/O, bez DOM, bez `Date.now()` / `performance.now()` wewnątrz konwersji domenowej).
2. **SSOT serwera** — serwer (`apps/server`) jest właścicielem autorytatywnej pozycji transportu oraz tempa/metrum; klienci konsumują ticki / update’y z serwera.
3. **Wygładzanie playhead** — `apps/web` może interpolować / wygładzać wyświetlany playhead **wyłącznie między tickami serwera**. Nie może stać się źródłem prawdy dla czasu muzycznego.
4. **Kanon pozycji: integer ticks + stałe PPQ (TPQN)**  
   - Jedna oś muzyczna: `positionTicks` (liczba całkowita; preferuj bezpieczny zakres / `bigint` gdy zajdzie potrzeba).  
   - Stałe **PPQ** (pulses per quarter note), np. 960 — ćwierćnuta MIDI = PPQ ticków.  
   - Zapis projektu, seek, onsety clipów, ticki transportu SSOT → **ticks**, nie float `absBeat`, nie sekundy, nie sample.
5. **BBT = widok / API display, nie storage silnika**  
   - Konwersje: `ticks ↔ { bar, beat, tick }` (oraz UI 1-based bar).  
   - Nie zastępować osi ticków obiektami BBT w JSON projektu jako jedynym źródłem prawdy.
6. **Semantyka taktów jak w DAW**  
   - **Takt 1** = pierwszy takt właściwego utworu (partytura / Logic).  
   - Countdown / pre-roll / count-in → pozycje **≤ 0** (ujemne ticki albo BBT ≤ 0).  
   - Sekundy / sample tylko na krawędzi audio (`tempoMap` → ms → sample), nigdy jako kanon Formy / Tekstu / Cue.
7. **Tempo / metrum w pre-roll (doprecyzowanie 5.0.0)**  
   - `resolveTempoAt` / `resolveMeterAt` = ostatnie zdarzenie mapy z `startTicks ≤ positionTicks`, inaczej `defaultBpm` / `defaultMeter`.  
   - Seed projektu kładzie pierwsze zdarzenia map zwykle @ **tick 0** (start utworu). W trakcie Countdown (`positionTicks < 0`) **nie ma** jeszcze aktywnego zdarzenia mapy → obowiązują **defaulty projektu**.  
   - Świadoma zmiana tempa/metrum w pre-roll wymaga zdarzenia mapy z `startTicks ≤ 0` (np. @ start Countdown). Nie interpolujemy wstecz z zdarzeń @ 0.  
   - **Stop / home:** gdy projekt ma clip Countdown → `transportHomeTicks` = jego `startTicks` (nie snap past CD na 0); bez Countdown → `0` ([#41](https://github.com/Negatywistyczny/stagesync/issues/41)).  
   - MIDI clock / SPP: ujemne ticki mapowane na 0 po stronie serwera (`midi-clock`) — clock nie „gra” pre-rollu jako ujemnego SPP.
8. **Float `absBeat`** — **usunięty** z `@stagesync/shared`. Nie przywracać jako
   kanonu pozycji; legacy `startAbs` tylko na granicy migratora → ticks.

## Konsekwencje

- Testy czasu żyją obok helperów w shared (Vitest), w tym metra nieparzyste (5/8, 7/8) na osi ticków.
- Animacje UI są kosmetyczne; seek / komendy transportu idą przez serwer.
- Integracja MIDI / zewnętrznego clocka podłącza się do serwera (mapowanie ticków ↔ 24 PPQN / SPP), nie do wygładzacza playhead w kliencie.
- Migrator 4.x → v5: `startAbs * PPQ` z **jedną** regułą zaokrąglenia na granicy importu + przesunięcie osi (countdown dodatni w 4.x → pre-roll ≤ 0 w v5).
- Odrzucone jako kanon silnika: same sekundy, same ułamkowe „takty” float bez PPQ, oraz „BBT-only storage” bez stałej siatki ticków.
- **Kwantyzacja edycji Timeline** (snap bar/beat/subdivision): [ADR 0007](./0007-snap-grid.md) — osobna warstwa od storage ticków.
