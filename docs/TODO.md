# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.11` **wydane 2026-07-21** ([Release](https://github.com/Negatywistyczny/stagesync/releases/tag/v5.0.0-alpha.11)) → aktywny etap **`5.0.0-alpha.12`**.  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

W trakcie etapu: odhaczone = usuń z listy (historia tylko w CHANGELOG), nie trzymaj `[x]` jako archiwum.

## Alpha.12 — Desktop OS menu + shell polish

Hero: natywne menu OS (Faza A) + dalszy polish shelła / bramka hosta przed β1.  
Orientacja: [ROADMAP.md](./ROADMAP.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md) · [DESKTOP.md](./DESKTOP.md) · bramka [report-beta-gate.md](./analysis/reports/report-beta-gate.md).

### Must

- [ ] **Desktop OS menu — Faza A:** StageSync | Widok | Pomoc (O programie, aktualizacje, Admin/Timeline/Klient, zakładki Admina, fullscreen, docs/issues) — [ADR 0010](./adr/0010-desktop-shell-tauri.md); PR / merge na `main`
- [ ] Docs spójne z Fazą A (DESKTOP, ADR 0010, ROADMAP fazy B–D)
- [ ] Bramka beta-gate: postęp G1–G10 na artefaktach α11+ (ręczna weryfikacja; G6 update ścieżka)

### Should

- [ ] **Desktop OS menu — Faza B** (gdy scope α12 pozwoli): Plik (Open Recent, Zapisz) + Host (status / QR / klienci) — inaczej → kolejny alpha / β1 polish ([ROADMAP.md](./ROADMAP.md) § Desktop OS menu)
- [ ] Doprecyzowanie ADR 0002 (tempo/metrum pre-roll) — jeśli nadal otwarte
- [ ] E2E smoke: Forma drag + transport (carry)

### OUT (świadome — nie must α12)

- Tag / bump `5.0.0-beta.1` — **tylko na prośbę** po green gate
- Audio / MIDI / AD-01…03 / wand — **β2**
- **Desktop OS menu — Faza C/D** — **β2 / 5.0.0** ([ROADMAP.md](./ROADMAP.md))
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] CHANGELOG: zamknij `[Unreleased]` → `## [5.0.0-alpha.12]` przy tagu
- [ ] Tag `v5.0.0-alpha.12` + Release CI (dmg/msi/updater)
- [ ] TODO → kolejny etap **po tagu** (procedura powyżej)
