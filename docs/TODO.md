# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.8` (code freeze) → aktywny etap **α9** — [report-alpha8-code-freeze.md](./analysis/reports/report-alpha8-code-freeze.md).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**Zakaz β:** [report-parity-blocker-alpha8.md](./analysis/reports/report-parity-blocker-alpha8.md) — **bez** `beta.1` / tagu β, dopóki **PO smoke** (zachowanie) + **CL-01/04/05** + CI nie są green.

**Audyt v4↔v5:** [report-v4-v5-parity-audit.md](./analysis/reports/report-v4-v5-parity-audit.md) · gap: [report-v4-v5-gap-audit.md](./analysis/reports/report-v4-v5-gap-audit.md) · UI-diff: [report-v4-v5-ui-diff-inventory.md](./analysis/reports/report-v4-v5-ui-diff-inventory.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

## Alpha.9 — Migrator + dokończenie rebuild

Hero: migrator legacy 4.x → v5 + domknięcie residual parity (PO smoke + Client P0).  
Scope: [report-scope-alpha9.md](./analysis/reports/report-scope-alpha9.md).  
Kontrakt UI: [ADR 0011](./adr/0011-ui-parity-behavior.md).

> **α8:** engineering **code freeze** — nie claim β. Residual poniżej = must α9 / wejście β.

### Must — Migrator

- [x] MVP `migrateLegacy*` + CLI `pnpm migrate:legacy` ([MIGRATION.md](./MIGRATION.md)) — scope M1–M8
- [x] Fixtures / smoke migracji na typowej bazie 4.x + dry-run w CI lub docs
- [x] Admin import legacy: regresje vs CLI (pack `.stagesync.json` + `database.json`)

### Must — PO smoke (z α8 freeze)

Checklisty: [parity-blocker](./analysis/reports/report-parity-blocker-alpha8.md) · [QA α8](./analysis/reports/report-qa-signoff-alpha8.md).

- [ ] **T-gest / T-loc / T-zoom / T-maps / T-chrome / meta** — green PO
- [ ] **A1** Admin Set + song pick w jednym flow — green PO
- [ ] **C1** Client treść ról (po CL-P0) — green PO
- [ ] **P8** Sign-off PO — blokuje β

### Must — Client P0 (CL)

- [x] **CL-01** Karaoke beat / bar highlight
- [x] **CL-04** Grid: full cycle / multi-bar
- [x] **CL-05** Forma / drums bar progress

### Must — proces / bramka

- [x] CI: `pnpm lint && check-types && test && build` na zmergowanym drzewie (+ dry-run M9 w workflow)
- [ ] Inventarz aktualizowany **po** geście PO ([ui-shell-inventory.md](./ui-shell-inventory.md) — wtórny)
- [ ] **Zakaz** bumpa / tagu `5.0.0-beta.*` do P8 green
- [ ] Bump/tag `5.0.0-alpha.9` tylko na prośbę
- [ ] **β1** (Docker/Tauri) — **nie startować** do green P8

### Should

- [ ] E2E smoke: Forma drag + transport
- [ ] P1 Timeline z gap-audit (TE-07 Alt+copy, TE-13 scissors empty, …) — nie bloker β jeśli PO uzna P0
- [ ] Inspector podsekcji Formy — jeśli nie pokryte smoke

### OUT (świadome — nie blokują α9 / nie są must β1)

- git-apply / „Zaktualizuj teraz” — [ADR 0004](./adr/0004-updates-docker.md)
- Audio tracks / playback / gain / mute — **β2**
- Docker / Tauri — **β1** (po P8 + migrator)
- Host MIDI I/O — **β2**
- **AD-01…03** Transpozycja / Lead / Edycja zdalna (API + Live Desk) — **β2** (brak atrap w chrome)
- Pełny OSMD sync — stub OK
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] Tag / bump α9 tylko na prośbę; CHANGELOG z Unreleased
- [ ] TODO → β1 **dopiero** po P8 + CL-P0 + migrator green
