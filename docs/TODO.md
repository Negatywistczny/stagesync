# StageSync v5 — TODO

**Stan:** `5.0.0-beta.1.1` **wydane 2026-07-21** (docs cut: residual β1 → must β2) → aktywny etap **`5.0.0-beta.2`** (start kodu **tylko na prośbę**).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).  
**β1:** milestone dystrybucyjny (H1–H12 w α10–α13) — [report-scope-beta1.md](./analysis/reports/report-scope-beta1.md).  
**β1.1:** residual (menu Faza B, G1–G10) przeniesione jako **must β2** — nie „carry soft”.  
**β2 scope:** [report-scope-beta2.md](./analysis/reports/report-scope-beta2.md) · bramka [report-beta-gate.md](./analysis/reports/report-beta-gate.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-beta.N` (analogicznie `alpha.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

W trakcie etapu: odhaczone = usuń z listy (historia tylko w CHANGELOG), nie trzymaj `[x]` jako archiwum.

## Beta.2 — Audio + MIDI + menu B/C + gate

Hero: **playback audio 0…N** + **MIDI I/O serwera** + **menu OS Faza B+C** + **G1–G10** green przed tagiem; tag `5.0.0-beta.2` **tylko na prośbę**.  
Orientacja: [ROADMAP.md](./ROADMAP.md) § Beta 2 · [report-scope-beta2.md](./analysis/reports/report-scope-beta2.md) · [ADR 0008](./adr/0008-timeline-clip-editing.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md).

**Must dostarczone w tociku (nie defer):** [#41](https://github.com/Negatywistyczny/stagesync/issues/41) Countdown Play/Stop ([PR #44](https://github.com/Negatywistyczny/stagesync/pull/44)); [#42](https://github.com/Negatywistyczny/stagesync/issues/42) Audio lane ([PR #48](https://github.com/Negatywistyczny/stagesync/pull/48)) — historia w CHANGELOG.

### Must

- [ ] Docs INSTALL + DESKTOP: Faza B/C + update paths po domknięciu menu
- [ ] Bramka beta-gate **G1–G10** green na instalatorach β2 ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)) — weryfikacja ręczna operatora **przed** tagiem `v5.0.0-beta.2`

### Should

- [ ] Doprecyzowanie ADR 0002 (tempo/metrum pre-roll) — jeśli nadal otwarte
- [ ] E2E smoke: Forma drag + transport (carry)

### OUT (świadome — nie must β2)

- Fade / crossfade / loop-region — **5.0.0**
- **Desktop OS menu — Faza D** — **5.0.0** wg [ROADMAP](./ROADMAP.md)
- **AD-01…03** Transpozycja / Lead / Edycja zdalna — **β2** jeśli pull-forward; inaczej **5.0.0**
- Timeline Help (feature), Różdżka (wand), P1 Timeline gaps — **5.0.0** (chyba że osobna decyzja)
- MIDI I/O w procesie Tauri — **nigdy** ([ADR 0010](./adr/0010-desktop-shell-tauri.md))
- git-apply — nigdy ([ADR 0004](./adr/0004-updates-docker.md))
- Android shell / store auto-update — poza β2
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] Tag / bump `5.0.0-beta.2` **tylko na prośbę**; CHANGELOG bez pustego Unreleased przy cutcie
- [ ] TODO → `5.0.0` **na prośbę** po zamknięciu β2
