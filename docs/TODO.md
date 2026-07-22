# StageSync v5 — TODO

**Stan:** `5.0.0-beta.2` na `main` + residual closeout 2026-07-22. Tag **`5.0.0` tylko na prośbę**.  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Higiena: [todo-hygiene.mdc](../.cursor/rules/todo-hygiene.mdc).

**Polityka 5.0:** funkcja dostępna w v4 → must w `5.0.0` (chyba że jawnie usunięta). Zakaz stubów. [ADR 0011](./adr/0011-ui-parity-behavior.md).

**Residuale:** P8 green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md). **G1–G10** na HW — ⬜ ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)). Hero linii 5.0 — przy cutcie stable.

## 5.0.0 — Stabilne wydanie + kompletny parytet v4

Orientacja: [ROADMAP.md](./ROADMAP.md) § 5.0.0 · [report-scope-5.0.0.md](./analysis/reports/report-scope-5.0.0.md).

### Must (Blokery wydania 5.0.0)

- [ ] **G1–G10** na instalatorach β2
- [ ] **MIDI Panic / MUTE ALL**
- [ ] Tag / bump `5.0.0` **tylko na prośbę**; CHANGELOG + nazwa hero linii 5.0

### Should / Weryfikacja

- [ ] Playwright Forma drag E2E
- [ ] **Live badge** / sygnał „live playhead”

### Etap 5.1+ (Przyszłość)

- [ ] Motywy / auth / multi-user
- [ ] [#430](https://github.com/Negatywistyczny/stagesync/issues/430) Cues Sampler
- [ ] [#437](https://github.com/Negatywistyczny/stagesync/issues/437) Safety Net (Master/Slave / failover)
- [ ] Android shell / store auto-update
- [ ] TODO → checklista `5.1` **na prośbę** po zamknięciu 5.0.0
