# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.4` — historia w [CHANGELOG.md](../CHANGELOG.md).  
Ten plik: **tylko bieżący etap** (po tagu release → procedura zamykania poniżej).

Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Scope bieżącego etapu →
[report-scope-alpha4.md](./analysis/reports/report-scope-alpha4.md) (przed kodem α4).

**QA / sign-off α3 (przed tagiem):** [report-qa-signoff-alpha3.md](./analysis/reports/report-qa-signoff-alpha3.md).  
**Audyt α4 (2026-07-20):** [report-audit-alpha4.md](./analysis/reports/report-audit-alpha4.md) · exec: [report-exec-summary-alpha4.md](./analysis/reports/report-exec-summary-alpha4.md).

Plan implementacji α4: [report-implementation-plan-alpha4.md](./analysis/reports/report-implementation-plan-alpha4.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją alpha.N+1 (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze (`5.0.0-alpha.N+1`).

**Pull-forward:** drobne zadania z kolejnego etapu (alpha.N+1) można wciągnąć do
bieżącego TODO bez zmiany numeracji w ROADMAP — odnotuj w scope report bieżącej alfy.

## Alpha 4 (`5.0.0-alpha.4`)

Hero: **Timeline layout + operacyjne domknięcie Formy** (nie parity v4).  
Dług UI po α3: [report-scope-alpha4.md](./analysis/reports/report-scope-alpha4.md) § „Kontekst”.

**Stan po audycie 2026-07-20:** must pass **~21%** (1 PASS · 2 PARTIAL · 4 FAIL). Tag α4 **przedwczesny** — repo nadal `5.0.0-alpha.3`. Bloker release: PR **`feat/timeline-track-grid`** (osobne drzewa DOM dock vs lanes w `TimelineShell.tsx`). Song picker (#6) — PASS; reszta must layoutu + inspector — FAIL. Szczegóły: [report-audit-alpha4.md](./analysis/reports/report-audit-alpha4.md).

### Must (layout — pierwszy PR)

- [ ] `feat/timeline-track-grid` — wspólna siatka nagłówek ścieżki ↔ lane (`TimelineShell.tsx` 429–586, `TimelineShell.module.css` 135–315); brak rozjeżdżania przy resize (audyt: FAIL)
- [ ] Eye menu: ukrywanie **pojedynczych** śladów (min. Treść vs Specjalne; Forma zawsze on) — audyt: tylko `showSpecial` (`TimelineShell.tsx` 442–449)
- [ ] Kolejność lane’ów jak v4: **Tempo / Tonacja / Metrum / Kotwice nad** Formą/Tekstem/Akordami/Cue — audyt: odwrotna kolejność w dock i lanes

### Must (produkt α4)

- [ ] Lane Tempo/Metrum read-only z `tempoMap` / `meterMap` (render segmentów map, nie tekst `Tempo {n}` — audyt: PARTIAL)
- [ ] Inspector: rename sekcji + długość Countdown → draft → Zapisz → PUT (`TimelineShell.tsx` 602–622 read-only; `.lengthInput` nieużywany)
- [ ] Song picker Timeline ← `GET /api/library` (pełny flow, bez mock overlay) — audyt: **PASS** (modal + `Link` 692–716)
- [ ] Dirty guard — confirm przy wyjściu z niezapisanym draftem ([QA D-08/D-11](./analysis/reports/report-qa-signoff-alpha3.md); audyt: brak `beforeunload`)
- [ ] `POST /api/transport/load` w UI — jeśli nie domknięte w α3 (audyt: PARTIAL — play z `projectId`, `loadTransport` nieużywany w shellach)

### Should (α4 — cut first przy timebox)

- [ ] Admin: „Ukryj panel” na krawędzi splitu (nie w toolbarze Utwory)
- [ ] Admin „Pliki projektu”: empty state zamiast statycznej listy (bez wiring storage — α6)
- [x] Client nagłówek: jedna linia, spójny przed/po wyborze roli, ustawienia po prawej ([QA D-18](./analysis/reports/report-qa-signoff-alpha3.md))
- [ ] Client rola `drums` polish (layout roli, nie tylko tekst — [QA D-13](./analysis/reports/report-qa-signoff-alpha3.md))
- [ ] Client welcome: ikony kart ról (🎤/🎹/🎼/🥁 jak v4) + ikony chipów tonacji/stróju w ustawieniach globalnych
- [ ] Client partytura: ikony w wyborze instrumentu/partii (`score-parts-prompt` jak v4 — emoji z `score-instruments`)
- [ ] Admin: „Teraz” vs `activeProjectId` / przycisk Odtwórz — UX ([QA D-12](./analysis/reports/report-qa-signoff-alpha3.md))
- [ ] Transport UI: Stop (seek 0), clamp końca utworu, opcjonalnie seek ([QA D-14–D-16](./analysis/reports/report-qa-signoff-alpha3.md))
- [ ] Walidacja transportu web + BBT (M1–M3 z audytu) + carry-over **M12** (race WS/REST, `TransportProvider.tsx`) + **M15** (monotoniczność playhead przy skew, `engine.ts`)

### OUT α4 (świadomie później)

- Edycja geometryczna Forma (drag, Smart Tool) → **α7** ([ADR 0008](./adr/0008-timeline-clip-editing.md))
- Audio playback / clip edit → **α6** import, **β1** silnik
- Zoom UI/H/V (ikony, działające suwaki) → **5.0.0 polish**
- Pełna treść Pomocy Timeline → **5.0.0 polish**
- Setlista / auto-setlista wiring → **α6**
- Tap, UG, Różdżka, edycja Tekst/Akordy/Cue → **α7**

### Release α4

- [ ] Bump `5.0.0-alpha.4`, CHANGELOG, wersja w shellach = `package.json`
- [ ] CI zielone; smoke: picker → eye → edycja → save → play → sekcja
