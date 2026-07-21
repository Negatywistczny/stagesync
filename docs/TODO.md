# StageSync v5 — TODO

**Stan:** `5.0.0-beta.2` **wydane 2026-07-21** ([Release](https://github.com/Negatywistczny/stagesync/releases/tag/v5.0.0-beta.2)) → aktywny etap **`5.0.0`** (start kodu **tylko na prośbę**).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).  
**β2:** Audio 0…N + MIDI serwera + menu B/C + Countdown — [report-scope-beta2.md](./analysis/reports/report-scope-beta2.md).  
**Residual operatorski:** ręczna bramka **G1–G10** na instalatorach β2 — nadal ⬜ na HW przy cutcie (nie green); [report-beta-gate.md](./analysis/reports/report-beta-gate.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0` (analogicznie `alpha.N`, `beta.N`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.
5. Ustal **nazwę hero** linii 5.0 (versioning) i dopisz do CHANGELOG / ROADMAP.

W trakcie etapu: odhaczone = usuń z listy (historia tylko w CHANGELOG), nie trzymaj `[x]` jako archiwum.

## 5.0.0 — Stabilne wydanie + nazwa hero

Hero: **stabilne 5.0.0** + polish UI / Timeline / audio fade; tag **tylko na prośbę**.  
Orientacja: [ROADMAP.md](./ROADMAP.md) § 5.0.0 · [ADR 0007](./adr/0007-snap-grid.md) · [ADR 0008](./adr/0008-timeline-clip-editing.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md).

### Must

- [ ] Polish UI na żywych kontrolkach (typografia, proporcje, copy, gęstość)
- [ ] Timeline: zoom UI H/V z ikonami; Pomoc z pełną treścią; **snap picker** (beat/subdivision) — faza 2 [ADR 0007](./adr/0007-snap-grid.md)
- [ ] Audio polish: fade, crossfade, loop-region (ewent. overlap mode) — [ADR 0008](./adr/0008-timeline-clip-editing.md)
- [ ] **Desktop OS menu — Faza D:** pełna Edycja; zoom w Widok; rozbudowa Pomoc — [ROADMAP](./ROADMAP.md)
- [ ] `docs/api` domknięte; CI + smoke E2E
- [ ] Operator: domknięcie residual **G1–G10** na instalatorach β2 → green przed / przy stable ([report-beta-gate.md](./analysis/reports/report-beta-gate.md))
- [ ] Scope report `report-scope-5.0.0.md` (lub równoważny) przed startem kodu

### Should

- [ ] Doprecyzowanie ADR 0002 (tempo/metrum pre-roll) — jeśli nadal otwarte
- [ ] E2E smoke: Forma drag + transport (carry)
- [ ] Admin: drobne UX (np. panel toggle) jeśli nie domknięte wcześniej
- [ ] **AD-01…03** Transpozycja / Lead / Edycja zdalna — jeśli pull-forward

### OUT (świadome — nie must 5.0.0)

- Motywy / auth / multi-user → **5.1+**
- Android shell / store auto-update — poza 5.0.0
- MIDI I/O w procesie Tauri — **nigdy** ([ADR 0010](./adr/0010-desktop-shell-tauri.md))
- git-apply — nigdy ([ADR 0004](./adr/0004-updates-docker.md))
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] Tag / bump `5.0.0` **tylko na prośbę**; CHANGELOG bez pustego Unreleased przy cutcie; nazwa hero linii 5.0
- [ ] TODO → `5.1` (lub kolejny etap) **na prośbę** po zamknięciu 5.0.0
