# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.9` **wydane 2026-07-21** → aktywny etap **β1** (host / dystrybucja).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md) · [parity-blocker](./analysis/reports/report-parity-blocker-alpha8.md).  
**α9:** migrator M1–M9 + CL-P0 + P8 — [report-scope-alpha9.md](./analysis/reports/report-scope-alpha9.md).  
**β1 scope:** [report-scope-beta1.md](./analysis/reports/report-scope-beta1.md).  
Tag / bump `5.0.0-beta.*` — **tylko na prośbę** (bez samowolnego startu β).

**Audyt v4↔v5:** [report-v4-v5-parity-audit.md](./analysis/reports/report-v4-v5-parity-audit.md) · gap: [report-v4-v5-gap-audit.md](./analysis/reports/report-v4-v5-gap-audit.md) · UI-diff: [report-v4-v5-ui-diff-inventory.md](./analysis/reports/report-v4-v5-ui-diff-inventory.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

## Beta.1 — Host / dystrybucja

Hero: Docker + Tauri + stabilność hosta (**bez** audio/MIDI / feature product — β2).  
Orientacja: [ROADMAP.md](./ROADMAP.md) § Beta 1 · [report-scope-beta1.md](./analysis/reports/report-scope-beta1.md) · [ADR 0004](./adr/0004-updates-docker.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md).

### Must

- [x] Docker Compose: obraz + volume `data/`; update = bump tagu obrazu ([ADR 0004](./adr/0004-updates-docker.md)); docs [INSTALL.md](./INSTALL.md)
- [x] **Tauri** desktop shell: thin WebView → lokalny API/WS (URL do Compose / `:4000`); Win + mac; **bez** autorytetu czasu w shellu ([ADR 0010](./adr/0010-desktop-shell-tauri.md)) · [DESKTOP.md](./DESKTOP.md)
- [x] Stabilność hosta: shadow backup, OCC (`409` na stale `updatedAt`), migracja schematu na volume przy starcie
- [x] ESLint ACL shared + API `details` z Zod
- [x] CI: `pnpm lint && check-types && test && build` + Compose build (+ Tauri `cargo check` / manual Win)

### Should (host only)

- [ ] Doprecyzowanie ADR 0002 (tempo/metrum pre-roll) — jeśli nadal otwarte
- [ ] E2E smoke: Forma drag + transport (carry)

### OUT (świadome — nie must β1)

- Audio playback / clip edit / gain / mute — **β2**
- Host MIDI I/O — **β2**
- **AD-01…03** Transpozycja / Lead / Edycja zdalna — **β2**
- Timeline Help (feature), Różdżka (wand), P1 Timeline gaps — **β2 / 5.0.0**
- Sidecar Node w bundlu desktop — OUT β1 (prefer URL do lokalnego serwera)
- git-apply — nigdy ([ADR 0004](./adr/0004-updates-docker.md)); update na żądanie z Admina (Watchtower + Tauri updater) = IN β1
- Android shell / store auto-update — poza β1
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [x] Scope report [report-scope-beta1.md](./analysis/reports/report-scope-beta1.md)
- [ ] Bramka beta-gate G1–G9 green ([report-beta-gate.md](./analysis/reports/report-beta-gate.md))
  - [ ] G1: GHCR image po `workflow_dispatch`
  - [ ] G2: compose.prod.yml health
  - [ ] G3: .dmg działa
  - [ ] G4: .msi działa
  - [ ] G5: host update z Admina
  - [ ] G6: rollback obrazu
  - [ ] G7: desktop update z Admina (Tauri)
  - [ ] G8: przeglądarka — brak przycisku desktop, jest link
  - [ ] G9: docs kompletne
- [ ] Tag / bump `5.0.0-beta.1` tylko na prośbę po green gate; CHANGELOG z Unreleased
- [ ] TODO → β2 **na prośbę** po zamknięciu β1
