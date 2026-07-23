# StageSync v5 — TODO

**Stan:** `5.1.0` wydane 2026-07-24 na `main` (`v5.1.0`) — linia **5.1** = **Launch & Mix**; linia **5.0** = **Overture** (`v5.0.0` / `v5.0.1`).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Higiena: [todo-hygiene.mdc](../.cursor/rules/todo-hygiene.mdc).

**Polityka:** nowe funkcje po Launch & Mix → linia **5.2+**. Zakaz stubów. [ADR 0011](./adr/0011-ui-parity-behavior.md).

**Residuale operatorskie:** **G1–G10** na HW — ⬜ ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)). P8 green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).

## 5.2+ — Motywy, auth, Mixer outs, kolejne minor

Orientacja: [ROADMAP.md](./ROADMAP.md) § Po 5.1.0.

### Must (operator residual po 5.1.0)

- [ ] **G1–G10** na instalatorach `v5.1.0` (mac/Win HW) — bez claim green w docs

### Etap 5.2+ (Przyszłość)

- [ ] Motywy / auth / multi-user
- [ ] **Mixer — Out 3–4 (HW multi-out):** fizyczne wyjścia poza Master / `setSinkId` urządzenia — dopiero gdy model + WebAudio to wspierają (bez atrap w UI)
- [ ] **Mixer — bus→bus:** routing wyjścia busa na inny bus (dziś bus → tylko Master)
- [ ] [#430](https://github.com/Negatywistczny/stagesync/issues/430) Cues Sampler
- [ ] [#437](https://github.com/Negatywistczny/stagesync/issues/437) Safety Net (Master/Slave / failover)
- [ ] Android shell / store auto-update
- [ ] **Parity residual (N/A v4 → opcjonalne):** Tab (nawigacja zaznaczenia); bare **S** = nożyczki (bez menu T); skala czcionki / autoscroll poza Karaoke; ukrywanie sekcji Formy w widoku roli Client
