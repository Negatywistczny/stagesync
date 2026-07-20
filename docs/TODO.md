# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.7` — historia w [CHANGELOG.md](../CHANGELOG.md).  
Ten plik: **tylko bieżący etap** (po tagu release → procedura zamykania poniżej).

Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**QA / sign-off α6:** [report-qa-signoff-alpha6.md](./analysis/reports/report-qa-signoff-alpha6.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją alpha.N+1 (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze (`5.0.0-alpha.N+1`).

## Alpha 7 (`5.0.0-alpha.7`)

Hero: **Edycja Timeline (Forma + lane’y treści)**.  
Scope: *(przed startem — report-scope-alpha7.md)*.

### Must

- [ ] Scope report alpha.7 przed kodem
- [ ] Forma: pencil drag, pointer move/resize, select+Delete, Smart Tool FSM ([ADR 0008](./adr/0008-timeline-clip-editing.md))
- [ ] Snap: Cmd/Ctrl = chwilowy snap off (faza 3 [ADR 0007](./adr/0007-snap-grid.md))

### Should

- [ ] Tap / UG / Różdżka — wg cut w scope
- [ ] Lane’y Tekst / Akordy / Cue (start ticks v2+)

### OUT α7

- Pełny Undo/Redo sesji → β1 / 5.0.0
- Audio playback → **β1**
- Pełna partytura OSMD → wg scope (ew. tu lub później)

### Release α7

- [ ] Bump, CHANGELOG, CI, smoke przed tagiem
