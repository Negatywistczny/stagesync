# StageSync v5 — TODO

**Stan:** `5.0.0-beta.2` na `main` + residual closeout 2026-07-22 (Faza D, audio fade/loop, help/skróty, mobile/tablet, OSMD/migration/wand, `docs/api` v5). Tag **`5.0.0` tylko na prośbę**.  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Higiena listy: [todo-hygiene.mdc](../.cursor/rules/todo-hygiene.mdc).

**Polityka 5.0 (PO 2026-07-22):** funkcja **dostępna w v4** → must w **`5.0.0`** (chyba że jawnie usunięta). **Zakaz stubów**. [ADR 0011 §1a](./adr/0011-ui-parity-behavior.md).

**Residuale (uczciwie):** P8 green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md). Bramka **G1–G10** na instalatorach β2 — nadal ⬜ na HW (**bez claim green**); [report-beta-gate.md](./analysis/reports/report-beta-gate.md). Nazwa hero linii 5.0 — odłożona do cuta stable.

## 5.0.0 — Stabilne wydanie + kompletny parytet v4

Orientacja: [ROADMAP.md](./ROADMAP.md) § 5.0.0 · [report-scope-5.0.0.md](./analysis/reports/report-scope-5.0.0.md) · [ADR 0011](./adr/0011-ui-parity-behavior.md).

### Must (Blokery wydania 5.0.0)

- [ ] Operator: domknięcie **G1–G10** na instalatorach β2 → green przed / przy stable ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)) — **bez claim green bez HW**
- [ ] **MIDI Panic / MUTE ALL** — zachowanie v4 (host/UI; pozycja w menubarze opcjonalna) — [ROADMAP](./ROADMAP.md) § menu
- [ ] Tag / bump `5.0.0` **tylko na prośbę**; CHANGELOG + **nazwa hero** linii 5.0

### Should / Weryfikacja

- [ ] Playwright Forma drag E2E (defer z overnight)
- [ ] AD-01…03 Transpozycja / Lead / Edycja zdalna — pull-forward jeśli PO
- [ ] **Live badge** / równoważny sygnał „live playhead” (CH-02)
- [ ] **Meta okładka** (asset `cover` + UI jak v4 workflow)

### Etap 5.1+ (Przyszłość)

- [ ] Motywy / auth / multi-user
- [ ] [#430](https://github.com/Negatywistyczny/stagesync/issues/430) Cues Sampler (scope + ADR przed kodem)
- [ ] [#437](https://github.com/Negatywistyczny/stagesync/issues/437) Safety Net (Master/Slave / failover) — ADR vs SSOT czasu [ADR 0002](./adr/0002-timebase-ssot.md)
- [ ] Android shell / store auto-update
- [ ] TODO → checklista `5.1` **na prośbę** po zamknięciu 5.0.0 (tylko nowości, nie dług v4)

Poza zakresem na zawsze / zakaz: MIDI I/O w procesie Tauri ([ADR 0010](./adr/0010-desktop-shell-tauri.md)); git-apply ([ADR 0004](./adr/0004-updates-docker.md)); clone chrome v4 ([ADR 0011](./adr/0011-ui-parity-behavior.md)); [#63](https://github.com/Negatywistyczny/stagesync/pull/63) visual Help — zamknięty bez merge (treść Pomocy na `main`).
