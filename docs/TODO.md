# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.13` **wydane 2026-07-21** ([Release](https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-alpha.13)) → aktywny etap **`5.0.0-beta.1`** (host / dystrybucja; start kodu **tylko na prośbę**).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).  
**β1 scope:** [report-scope-beta1.md](./analysis/reports/report-scope-beta1.md) · bramka: [report-beta-gate.md](./analysis/reports/report-beta-gate.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

W trakcie etapu: odhaczone = usuń z listy (historia tylko w CHANGELOG), nie trzymaj `[x]` jako archiwum.

## Beta.1 — Host / dystrybucja

Hero: domknąć **host / dystrybucję** (Tauri + Docker secondary) + **Desktop OS menu Faza B**; tag `5.0.0-beta.1` **tylko na prośbę** po green G1–G10.  
Orientacja: [ROADMAP.md](./ROADMAP.md) § Beta 1 · [report-scope-beta1.md](./analysis/reports/report-scope-beta1.md) · [ADR 0004](./adr/0004-updates-docker.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md) · [DESKTOP.md](./DESKTOP.md).

### Must

- [ ] **Desktop OS menu — Faza B:** Plik + Host (Open Recent; Zapisz Timeline draft; status hosta / klienci WS / QR gdy API; restart wg istniejącego API; Ustawienia… → Host)
- [ ] Bramka beta-gate **G1–G10** green na instalatorach z Release ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)) — weryfikacja ręczna operatora
- [ ] Docs INSTALL + DESKTOP zgodne z flow β1 (menu Faza B, update paths)

### Should (host only)

- [ ] Doprecyzowanie ADR 0002 (tempo/metrum pre-roll) — jeśli nadal otwarte
- [ ] E2E smoke: Forma drag + transport (carry)

### OUT (świadome — nie must β1)

- **Desktop OS menu — Faza C/D** — **β2 / 5.0.0**
- Audio playback / clip edit / gain / mute — **β2**
- Host MIDI I/O — **β2**
- **AD-01…03** Transpozycja / Lead / Edycja zdalna — **β2**
- Timeline Help (feature), Różdżka (wand), P1 Timeline gaps — **β2 / 5.0.0**
- git-apply — nigdy ([ADR 0004](./adr/0004-updates-docker.md))
- Android shell / store auto-update — poza β1
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] Tag / bump `5.0.0-beta.1` **tylko na prośbę** po green G1–G10; CHANGELOG z Unreleased
- [ ] TODO → β2 **na prośbę** po zamknięciu β1
