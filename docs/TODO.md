# StageSync v5 — TODO

**Stan:** `5.0.0-beta.2` na `main`; residual closeout przed tagiem `5.0.0` (**tylko na prośbę**).  
Historia zrealizowanego: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**Polityka 5.0 (PO 2026-07-22):** funkcja **dostępna w v4** → must w **`5.0.0`** (chyba że
jawnie usunięta z produktu). **Zakaz stubów** / atrap. Szczegóły:
[ADR 0011 §1a](./adr/0011-ui-parity-behavior.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).  
**Residual operatorski:** ręczna bramka **G1–G10** na instalatorach β2 — nadal ⬜ na HW (**bez claim green**); [report-beta-gate.md](./analysis/reports/report-beta-gate.md).

## Higiena tego pliku

- Tylko **otwarte** Must / Should / 5.1+ / Release — **bez** sekcji „Dostarczone”, **bez** `[x]`.
- Zrealizowane → wyłącznie [CHANGELOG.md](../CHANGELOG.md) (weryfikuj kod na dysku, zero fałszywych Done).
- Odhaczone = **usuń** z listy; nie trzymaj archiwum w TODO.

## Procedura zamykania etapu

Przy tagu `v5.0.0` (analogicznie `alpha.N`, `beta.N`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść checklistę** — zostaw tylko otwarte Must / Should / 5.1+ następnego etapu.
3. Zaktualizuj `**Stan:**` na górze.
4. Ustal **nazwę hero** linii 5.0 (versioning) i dopisz do CHANGELOG / ROADMAP.

## 5.0.0 — Stabilne wydanie + kompletny parytet v4

Hero: **stabilne 5.0.0** = zachowanie operatorskie v4 **bez stubów** + nazwa hero linii.  
Orientacja: [ROADMAP.md](./ROADMAP.md) § 5.0.0 · [report-scope-5.0.0.md](./analysis/reports/report-scope-5.0.0.md) · [ADR 0011](./adr/0011-ui-parity-behavior.md).

### Must (parity v4 — przed tagiem `5.0.0`)

- [ ] Operator: domknięcie **G1–G10** na instalatorach β2 → green przed / przy stable ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)) — **bez claim green bez HW**

### Should (nie blokują docs closeout; nie must-tag bez decyzji)

- [ ] MIDI Panic / MUTE ALL — follow-up po decyzji PO (obecnie OUT w [ROADMAP](./ROADMAP.md) § menu)
- [ ] Playwright Forma drag E2E (defer z overnight)
- [ ] ADR 0002 pre-roll tempo/metrum — jeśli nadal otwarte
- [ ] AD-01…03 Transpozycja / Lead / Edycja zdalna — pull-forward jeśli PO
- [ ] **Zmienne metrum:** CD przejmuje metrum Taktu 1; live grid/snap tick↔px zgodne z `meterMap`
- [ ] **Live badge** / równoważny sygnał „live playhead” (CH-02)
- [ ] **Meta okładka** (asset `cover` + UI jak v4 workflow)

### 5.1+ / poza zakresem

- Motywy / auth / multi-user → **5.1+**
- [#430](https://github.com/Negatywistyczny/stagesync/issues/430) Cues Sampler → **5.1+** (scope + ADR przed kodem)
- [#437](https://github.com/Negatywistyczny/stagesync/issues/437) Safety Net (Master/Slave / failover) → **5.1+** (ADR vs SSOT czasu [ADR 0002](./adr/0002-timebase-ssot.md); bez kodu w 5.0.0)
- Android shell / store auto-update — poza 5.0.0
- MIDI I/O w procesie Tauri — **nigdy** ([ADR 0010](./adr/0010-desktop-shell-tauri.md))
- git-apply — nigdy ([ADR 0004](./adr/0004-updates-docker.md))
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))
- [#63](https://github.com/Negatywistyczny/stagesync/pull/63) visual Help v4-like — **zamknięty bez merge** (ADR 0011; treść Pomocy już na `main`)

### Release

- [ ] Tag / bump `5.0.0` **tylko na prośbę**; CHANGELOG + **nazwa hero** linii 5.0
- [ ] TODO → `5.1` **na prośbę** po zamknięciu 5.0.0 (tylko nowości, nie dług v4)
