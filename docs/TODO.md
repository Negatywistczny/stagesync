# StageSync v5 — TODO

**Stan:** `5.0.0-beta.1` **wydane 2026-07-21** ([Release](https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-beta.1)) → aktywny etap **`5.0.0-beta.2`** (audio + MIDI; start kodu **tylko na prośbę**).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).  
**β1:** milestone dystrybucyjny (H1–H12 w α10–α13) — [report-scope-beta1.md](./analysis/reports/report-scope-beta1.md).  
**Carry z β1:** menu OS Faza B + ręczna bramka G1–G10 — [report-beta-gate.md](./analysis/reports/report-beta-gate.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-beta.N` (analogicznie `alpha.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

W trakcie etapu: odhaczone = usuń z listy (historia tylko w CHANGELOG), nie trzymaj `[x]` jako archiwum.

## Beta.2 — Audio + MIDI

Hero: **playback audio 0…N** + **MIDI I/O serwera** + sync z transportem; tag `5.0.0-beta.2` **tylko na prośbę**.  
Orientacja: [ROADMAP.md](./ROADMAP.md) § Beta 2 · [ADR 0008](./adr/0008-timeline-clip-editing.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md).

### Must

- [ ] **Audio 0…N:** clip na Timeline, sync transport (`ticksToMs`), trim/move, waveform peak/RMS, gain clip + fader track + mute clip/track (bez pencil; bez stretch poza plik) — [ADR 0008](./adr/0008-timeline-clip-editing.md)
- [ ] **Host MIDI I/O** po stronie serwera (clock / urządzenia) — nie w procesie Tauri
- [ ] Scope report `report-scope-beta2.md` przed startem kodu

### Carry (z β1 — nie blokuje startu β2)

- [ ] **Desktop OS menu — Faza B:** Plik + Host (Open Recent; Zapisz Timeline draft; status hosta / klienci WS / QR gdy API; restart wg istniejącego API; Ustawienia… → Host)
- [ ] Bramka beta-gate **G1–G10** green na instalatorach ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)) — weryfikacja ręczna operatora (α13 / β1)
- [ ] Docs INSTALL + DESKTOP: Faza B + update paths po domknięciu menu

### Should

- [ ] Doprecyzowanie ADR 0002 (tempo/metrum pre-roll) — jeśli nadal otwarte
- [ ] E2E smoke: Forma drag + transport (carry)

### OUT (świadome — nie must β2)

- Fade / crossfade / loop-region — **5.0.0**
- **Desktop OS menu — Faza C/D** — **β2 (C) / 5.0.0 (D)** wg [ROADMAP](./ROADMAP.md)
- **AD-01…03** Transpozycja / Lead / Edycja zdalna — **β2** jeśli nie w audio cut; inaczej **5.0.0**
- Timeline Help (feature), Różdżka (wand), P1 Timeline gaps — **β2 / 5.0.0**
- git-apply — nigdy ([ADR 0004](./adr/0004-updates-docker.md))
- Android shell / store auto-update — poza β2
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] Tag / bump `5.0.0-beta.2` **tylko na prośbę**; CHANGELOG z Unreleased
- [ ] TODO → `5.0.0` **na prośbę** po zamknięciu β2
