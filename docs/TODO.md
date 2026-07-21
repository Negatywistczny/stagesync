# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.11` **wydane 2026-07-21** ([Release](https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-alpha.11)) → aktywny etap **`5.0.0-alpha.12`** (**domknięcie** — bez dużych feature’ów).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).  
**Większe zmiany** (menu Faza B+, bramka hosta, polish dystrybucji) → **`5.0.0-beta.1`** (start na prośbę).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

W trakcie etapu: odhaczone = usuń z listy (historia tylko w CHANGELOG), nie trzymaj `[x]` jako archiwum.

## Alpha.12 — Domknięcie (menu Faza A + hotfixy shelła)

Hero: domknąć α12 wokół już zrobionej **Desktop OS menu Faza A** i drobnych napraw shelła; **bez** nowych dużych powierzchni.  
Orientacja: [ROADMAP.md](./ROADMAP.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md) · [DESKTOP.md](./DESKTOP.md).

### Must

- [ ] Merge PR menu OS Faza A (+ powiązane hotfixy sidecara / CI) na `main`
- [ ] Docs α12 spójne z Fazą A (DESKTOP, ADR 0010); ROADMAP: Faza B+ = β1
- [ ] CHANGELOG: zamknij `[Unreleased]` → `## [5.0.0-alpha.12]` przy tagu
- [ ] Tag `v5.0.0-alpha.12` + Release CI (dmg/msi/updater)

### Should (tylko jeśli blokuje tag)

- [ ] Krytyczny hotfix shelła / docs troubleshooting odkryty przy smoke α12

### OUT α12 → β1 (świadomie)

- **Desktop OS menu — Faza B** (Plik, Host top-level, Open Recent, Zapisz, status/QR/klienci)
- Pełna bramka beta-gate G1–G10 jako must zamknięcia β1 ([report-beta-gate.md](./analysis/reports/report-beta-gate.md))
- Doprecyzowanie ADR 0002 (tempo/metrum pre-roll); E2E Forma drag + transport
- **Desktop OS menu — Faza C/D**, audio/MIDI, AD-01…03 — **β2 / 5.0.0**
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] Po tagu α12: TODO → wyłącznie **Beta.1** (procedura powyżej); start kodu β1 **tylko na prośbę**
