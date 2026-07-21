# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.12` **wydane 2026-07-21** ([Release](https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-alpha.12)) → aktywny etap **`5.0.0-alpha.13`** (hotfix-only: Windows sidecar `EISDIR` / `C:`).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).  
**β1 scope (po α13):** [report-scope-beta1.md](./analysis/reports/report-scope-beta1.md) · bramka: [report-beta-gate.md](./analysis/reports/report-beta-gate.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

W trakcie etapu: odhaczone = usuń z listy (historia tylko w CHANGELOG), nie trzymaj `[x]` jako archiwum.

## Alpha.13 — Hotfix Windows sidecar (tylko ten bug)

Hero: naprawa startu Node sidecara na Windows MSI (`EISDIR` / `lstat 'C:'` z ścieżek `\\?\…`).  
Większa praca host / dystrybucja / menu Faza B → **β1** (start kodu **tylko na prośbę**).

### Must

- [ ] **Windows sidecar:** spawn z bezpieczną ścieżką entry (bez `\\?\` / gołego `C:`) — host startuje z MSI
- [ ] Docs: troubleshooting w [DESKTOP.md](./DESKTOP.md); Unreleased w CHANGELOG

### Release

- [ ] Tag / bump `5.0.0-alpha.13` **tylko na prośbę** po weryfikacji na Windows
- [ ] TODO → β1 **na prośbę** po zamknięciu α13
