# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.9` **wydane 2026-07-21** → aktywny etap **β1** (host / dystrybucja).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md) · [parity-blocker](./analysis/reports/report-parity-blocker-alpha8.md).  
**α9:** migrator M1–M9 + CL-P0 + P8 — [report-scope-alpha9.md](./analysis/reports/report-scope-alpha9.md).  
Tag / bump `5.0.0-beta.*` — **tylko na prośbę** (bez samowolnego startu β).

**Audyt v4↔v5:** [report-v4-v5-parity-audit.md](./analysis/reports/report-v4-v5-parity-audit.md) · gap: [report-v4-v5-gap-audit.md](./analysis/reports/report-v4-v5-gap-audit.md) · UI-diff: [report-v4-v5-ui-diff-inventory.md](./analysis/reports/report-v4-v5-ui-diff-inventory.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.

## Beta.1 — Host / dystrybucja

Hero: Docker + Tauri + stabilność hosta (**bez** audio/MIDI — β2).  
Orientacja: [ROADMAP.md](./ROADMAP.md) § Beta 1 · [ADR 0004](./adr/0004-updates-docker.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md).  
Scope report: napisz `report-scope-beta1.md` tuż przed kodem etapu.

### Must

- [ ] Docker Compose: obraz + volume `data/`; update = bump tagu obrazu ([ADR 0004](./adr/0004-updates-docker.md))
- [ ] **Tauri** desktop shell: thin WebView → lokalny API/WS; Win + mac; **bez** autorytetu czasu w shellu ([ADR 0010](./adr/0010-desktop-shell-tauri.md))
- [ ] Stabilność hosta: shadow backup, OCC (`409`), polityka migracji schematu na volume
- [ ] ESLint ACL shared + API `details` z Zod (jeśli nie domknięte)
- [ ] CI: `pnpm lint && check-types && test && build` (+ smoke build Tauri / Compose wg scope)

### Should

- [ ] Doprecyzowanie ADR 0002 (tempo/metrum pre-roll) — jeśli nie w α9
- [ ] E2E smoke: Forma drag + transport (carry z α9 should)
- [ ] **Timeline Help:** overlay + skróty v4 (parity docs)
- [ ] **Różdżka (wand):** przywrócić po naprawie zachowania
- [ ] P1 Timeline z gap-audit (np. TE-13 scissors empty) — nie bloker β1 jeśli PO uzna P0

### OUT (świadome — nie must β1)

- Audio playback / clip edit / gain / mute — **β2**
- Host MIDI I/O — **β2**
- **AD-01…03** Transpozycja / Lead / Edycja zdalna — **β2**
- git-apply / „Zaktualizuj teraz” — nigdy ([ADR 0004](./adr/0004-updates-docker.md))
- Android shell / store auto-update — poza β1
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] Scope report `report-scope-beta1.md` przed kodem
- [ ] Tag / bump `5.0.0-beta.1` tylko na prośbę; CHANGELOG z Unreleased
- [ ] TODO → β2 **na prośbę** po zamknięciu β1
