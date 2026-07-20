# StageSync v5 — TODO

**Stan:** `5.0.0-beta.1` — historia w [CHANGELOG.md](../CHANGELOG.md).  
Ten plik: **tylko bieżący etap** (po tagu release → procedura zamykania poniżej).

Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**QA / sign-off α7:** [report-qa-signoff-alpha7.md](./analysis/reports/report-qa-signoff-alpha7.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

## Beta 1 (`5.0.0-beta.1`)

Hero: **Feature complete pod docelowy 5.0.0** — audio playback + clip edit; migrator 4.x; MIDI; Docker.  
Scope: *(przed startem — report-scope-beta1.md)*.  
Orientacja: [ROADMAP.md](./ROADMAP.md) · [ADR 0008](./adr/0008-timeline-clip-editing.md).

### Must

- [ ] Scope report beta.1 przed kodem
- [ ] Audio 0…N: silnik playback, clip na Timeline, sync transport (`ticksToMs`), trim/move, waveform peak/RMS
- [ ] Gain clip + fader track + mute clip/track (bez pencil na audio, bez stretch poza plik)
- [ ] Migrator legacy 4.x → v5
- [ ] MIDI I/O (clock / urządzenia serwera) — wg scope
- [ ] Docker Compose ([ADR 0004](./adr/0004-updates-docker.md)) — wg scope

### Should

- [ ] Undo/Redo sesji Timeline (jeśli nie w 5.0.0)
- [ ] Shadow backup / OCC / polityka migracji schematu — wg ROADMAP
- [ ] Edycja lane Akordy / Cue (pełniejsza) + Scissors Forma

### OUT β1

- Fade / crossfade / loop-region / overlap mode → 5.0.0
- Snap UI picker → 5.0.0
- Flex Time / time-stretch → poza produktem na start

### Release β1

- [ ] Bump, CHANGELOG, CI, smoke przed tagiem
