# StageSync v5 — TODO

**Stan:** `5.0.0-beta.2` na `main` + **merge trains 0–8** + residual closeout (2026-07-22: Faza D [#460](https://github.com/Negatywistyczny/stagesync/pull/460), audio fade/loop [#462](https://github.com/Negatywistyczny/stagesync/pull/462), help/skróty [#468](https://github.com/Negatywistyczny/stagesync/pull/468), mobile [#464](https://github.com/Negatywistyczny/stagesync/pull/464)); tag **`5.0.0` tylko na prośbę**.  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**Polityka 5.0 (PO 2026-07-22):** funkcja **dostępna w v4** → must w **`5.0.0`** (chyba że
jawnie usunięta z produktu). **Zakaz stubów** / atrap / „poza 5.0”. Szczegóły:
[ADR 0011 §1a](./adr/0011-ui-parity-behavior.md).

**P8:** green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).  
**β2 / 5.0.0 must A–E (kod):** polish UI, zoom/snap/help, audio fade/loop (WebAudio), Faza D, mobile breakpoints, i18n tools, `docs/api` + smoke — **w kodzie na `main`**.  
**Residual operatorski:** ręczna bramka **G1–G10** na instalatorach β2 — nadal ⬜ na HW (**bez claim green**); [report-beta-gate.md](./analysis/reports/report-beta-gate.md).  
**Residual drafty OSMD/migration/wand:** zamknięte na `main` (#465–#467).

## Procedura zamykania etapu

Przy tagu `v5.0.0` (analogicznie `alpha.N`, `beta.N`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją kolejnego etapu (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze.
5. Ustal **nazwę hero** linii 5.0 (versioning) i dopisz do CHANGELOG / ROADMAP.

W trakcie etapu: odhaczone = usuń z listy (historia tylko w CHANGELOG), nie trzymaj `[x]` jako archiwum.

## 5.0.0 — Stabilne wydanie + kompletny parytet v4

Hero: **stabilne 5.0.0** = zachowanie operatorskie v4 **bez stubów** + nazwa hero linii.  
Orientacja: [ROADMAP.md](./ROADMAP.md) § 5.0.0 · [report-scope-5.0.0.md](./analysis/reports/report-scope-5.0.0.md) · [ADR 0011](./adr/0011-ui-parity-behavior.md).

### Dostarczone (kod na `main` — nie powtarzać)

- Polish UI na żywych kontrolkach + tokeny `--ss-*` (trains 0, 6, 8)
- Timeline: zoom H/V z ikonami; snap picker; Pomoc + skróty zsynchronizowane z kodem (trains 0–1, 5; [#468](https://github.com/Negatywistyczny/stagesync/pull/468))
- Audio: fade / crossfade / loop-region schema + UI + WebAudio envelope ([#462](https://github.com/Negatywistyczny/stagesync/pull/462), ADR 0008)
- Mobile / tablet: progi `≤768` / `≤1024`, Client touch 44×44, Timeline phone = player ([#464](https://github.com/Negatywistyczny/stagesync/pull/464))
- i18n: polskie etykiety narzędzi Timeline + błędy API / upload / transport (w [#468](https://github.com/Negatywistyczny/stagesync/pull/468); [#463](https://github.com/Negatywistyczny/stagesync/pull/463) zamknięty jako superseded)
- `docs/api` closeout + smoke E2E (train 1)
- MIDI host I/O, PC OUT, transport IN (trains 4, 7); PC → load / Client Space / `[` `]` setlist
- Desktop menu Faza B/C + **Faza D** (Usuń + Zoom + Skróty + Undo grey-out) — [#460](https://github.com/Negatywistyczny/stagesync/pull/460)
- Overnight Zod caps + UI token hygiene (train 8)
- **266** overnight PR-ów zamkniętych (trains 0–8)
- Client OSMD score nav + playhead/seek/zoom — [#465](https://github.com/Negatywistyczny/stagesync/pull/465)
- Migracja assets/meta (`year`/`coverUrl`/MusicXML) — [#466](https://github.com/Negatywistyczny/stagesync/pull/466)
- Wand + karaoke transpose + MIDI playhead UI — [#467](https://github.com/Negatywistyczny/stagesync/pull/467)

### Must (parity v4 — przed tagiem `5.0.0`)

- [ ] Operator: domknięcie **G1–G10** na instalatorach β2 → green przed / przy stable ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)) — **bez claim green bez HW**

### Should (nie blokują docs closeout; nie must-tag bez decyzji)

- [ ] MIDI Panic / MUTE ALL — follow-up po decyzji PO (obecnie OUT w [ROADMAP](./ROADMAP.md) § menu)
- [ ] Playwright Forma drag E2E (defer z overnight)
- [ ] ADR 0002 pre-roll tempo/metrum — jeśli nadal otwarte
- [ ] AD-01…03 Transpozycja / Lead / Edycja zdalna — pull-forward jeśli PO

- [ ] **Różdżka (wand):** przywrócić tool UI — core `wandContentToForma` już jest (ukryte po PO smoke)
- [ ] **Tool menu `T` + litery narzędzi** (jak v4)
- [ ] **Zmienne metrum:** CD przejmuje metrum Taktu 1; live grid/snap tick↔px zgodne z `meterMap`
- [ ] **MIDI playhead overlay** (v4 cyjan) gdy clock IN żywy — nie `showMidiPlayhead = false` na stałe
- [ ] **Live badge** / równoważny sygnał „live playhead” (CH-02)
- [ ] **Meta okładka** (asset `cover` + UI jak v4 workflow)

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
