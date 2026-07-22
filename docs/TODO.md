# StageSync v5 — TODO

**Stan:** `5.0.0-beta.2` na `main` + **merge trains 0–8** zakończone 2026-07-22 ([#408](https://github.com/Negatywistyczny/stagesync/pull/408)–[#416](https://github.com/Negatywistyczny/stagesync/pull/416)); tag **`5.0.0` tylko na prośbę**.  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).  
**β2 scope:** dostarczone przez trains 0–7 — [report-scope-beta2.md](./analysis/reports/report-scope-beta2.md).  
**5.0.0 handoff:** [report-scope-5.0.0.md](./analysis/reports/report-scope-5.0.0.md).  
**Residual operatorski:** ręczna bramka **G1–G10** na instalatorach β2 — nadal ⬜ na HW (**bez claim green**); [report-beta-gate.md](./analysis/reports/report-beta-gate.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0` (analogicznie `alpha.N`, `beta.N`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.
5. Ustal **nazwa hero** linii 5.0 (versioning) i dopisz do CHANGELOG / ROADMAP.

W trakcie etapu: odhaczone = usuń z listy (historia tylko w CHANGELOG), nie trzymaj `[x]` jako archiwum.

## 5.0.0 — Stabilne wydanie + nazwa hero

Hero: **stabilne 5.0.0** + polish UI / Timeline / audio fade; tag **tylko na prośbę**.  
Orientacja: [ROADMAP.md](./ROADMAP.md) § 5.0.0 · [report-scope-5.0.0.md](./analysis/reports/report-scope-5.0.0.md).

### Dostarczone (merge trains 0–8 — nie powtarzać)

- Audio fade/crossfade/loop-region schema + UI handles (train 0, ADR 0008)
- Timeline zoom ikony, snap picker, Pomoc rozszerzona (trains 0–1, 5)
- MIDI host I/O, program change, transport hardening (trains 4, 7)
- Desktop menu Faza B/C + error surfacing (trains 6–7)
- `docs/api` closeout + smoke E2E (train 1)
- Overnight Zod caps + UI token hygiene (train 8)
- **266** overnight PR-ów zamkniętych; otwarte: [#61](https://github.com/Negatywistyczny/stagesync/pull/61) (ruler split), [#63](https://github.com/Negatywistyczny/stagesync/pull/63) (visual help)

### Must (residual przed tagiem)

- [ ] **Desktop OS menu — Faza D:** pełna Edycja; zoom w Widok; rozbudowa Pomoc — [ROADMAP](./ROADMAP.md)
- [ ] Polish UI — dalsze slice’y jeśli PO smoke wymaga (bez clone v4)
- [ ] Operator: domknięcie **G1–G10** na instalatorach β2 → green przed / przy stable ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)) — **bez claim green bez HW**

### Should

- [ ] Playwright Forma drag E2E (defer z overnight)
- [ ] Tempo-map-aware audio offset polish (głębsze niż train 5)
- [ ] AD-01…03 Transpozycja / Lead / Edycja zdalna — pull-forward jeśli PO

### OUT (świadome — nie must 5.0.0)

- Motywy / auth / multi-user → **5.1+**
- Android shell / store auto-update — poza 5.0.0
- MIDI I/O w procesie Tauri — **nigdy** ([ADR 0010](./adr/0010-desktop-shell-tauri.md))
- git-apply — nigdy ([ADR 0004](./adr/0004-updates-docker.md))
- Clone chrome v4 — **zakaz** ([ADR 0011](./adr/0011-ui-parity-behavior.md))

### Release

- [ ] PO smoke P8 + musty 5.0.0 na `main` po trains
- [ ] Tag / bump `5.0.0` **tylko na prośbę**; CHANGELOG + **nazwa hero** linii 5.0
- [ ] TODO → `5.1` (lub kolejny etap) **na prośbę** po zamknięciu 5.0.0
