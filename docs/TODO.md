# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.8` — historia w [CHANGELOG.md](../CHANGELOG.md).  
Ten plik: **tylko bieżący etap** (po tagu release → procedura zamykania poniżej).

Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**Scope:** [report-scope-alpha8.md](./analysis/reports/report-scope-alpha8.md) · [plan](./analysis/reports/report-implementation-plan-alpha8.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

## Alpha 8 (`5.0.0-alpha.8`)

Hero: **Parity workflow z legacy 4.x** (Timeline treści + Admin/Client Live Desk).  
Orientacja: [ROADMAP.md](./ROADMAP.md) · [ADR 0008](./adr/0008-timeline-clip-editing.md).

### Must

- [ ] Scope + plan α8; ROADMAP α8/α9/β1
- [ ] Lane Akordy: pencil / select / Delete / inspector `symbol` + Client grid
- [ ] Lane Cue: pencil / select / Delete / inspector `label`
- [ ] Scissors Forma (`splitClipAt` + Vitest); Countdown nietykalny
- [ ] Tap (Tekst dock) — tempo / timing MVP
- [ ] Różdżka: Tekst→Forma, Akordy→Forma, Tekst+Akordy→Forma
- [ ] Import UG → draft Tekst/Akordy (Zod Result; broken = UI message)
- [ ] Undo/Redo sesji (Zapisz: dirty off + stos zostaje; Odrzuć: server snapshot + clear stos)
- [ ] Metronom Web Audio + `AudioContext.resume()` na Play / toggle
- [ ] Client: grid z akordów; →następny setlisty
- [ ] Admin: filtr/sort utworów; Scena filtr ról (MVP)

### Should

- [ ] OSMD / MusicXML stub wire (rola `score`)
- [ ] Tekst move/resize (cut first przy presji)
- [ ] Admin Pliki paczki / Host logi / Client presence (cut first)

### OUT α8

- Audio tracks — lane UI ukryte; playback / gain / mute → **β2**; MIDI / Docker → **β1**
- Migrator 4.x → v5 → **α9**
- Pełny OSMD sync, zoom polish, snap picker → 5.0.0 / β1+
- git-apply — nigdy

### Release α8

- [ ] Bump `5.0.0-alpha.8`, CHANGELOG, CI, smoke, QA sign-off
- [ ] TODO → wyłącznie **α9** (migrator)
