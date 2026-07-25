# StageSync v5 — TODO

**Stan:** `5.1.3` wydane 2026-07-25 na `main` (`v5.1.3`) — linia **5.1** = **Launch & Mix**; linia **5.0** = **Overture** (`v5.0.0` / `v5.0.1`).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Higiena: [todo-hygiene.mdc](../.cursor/rules/todo-hygiene.mdc).

**Polityka:** nowe funkcje po Launch & Mix → linia **5.2+**. Zakaz stubów. [ADR 0011](./adr/0011-ui-parity-behavior.md).

**Residuale operatorskie:** **G1–G10** — **bez claim pełnego green** ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)). Pass operatorskie: **G1**, **G4–G6**, **G10** (bazowo na `5.1.2` / docs; w `5.1.3` też „Pobierz log” i ostrzeżenie updatera). Residual: **G2** skip; **G3** deferred (fix Documents w `5.1.3` — wymaga re-verify HW na nowym instalatorze); **G7–G9** Docker deferred. P8 green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).

## 5.2+ — Motywy, auth, Mixer outs, kolejne minor

Orientacja: [ROADMAP.md](./ROADMAP.md) § Po 5.1.0.

### Must (operator residual po 5.1.0)

- [ ] **G1–G10** na instalatorach `v5.1.3` (mac/Win HW) — **bez claim pełnego green**; **G1**, **G4–G6**, **G10** — pass operatorski (bazowo `5.1.2` / docs; `5.1.3` dokłada „Pobierz log”, ostrzeżenie restartu updatera, podręcznik DESKTOP); **G2** skip; **G3** re-verify HW po instalacji `5.1.3` (data dir Documents + migracja — fix w tym patchu, jeszcze bez dowodu HW); **G7–G9** Docker — odłożone

### Should / Higiena (nie blokuje 5.2)

- [ ] **Perf (observe first):** profil animacji chord-hero w Client Grid przy `prefers-reduced-motion`; batch DOM meterów Mixer przy wielu stripach; OSMD — cursor-only update zamiast full re-render na tick (jeśli API pozwala)
- [ ] **DX / types:** wąskie adaptery zamiast `any` na granicy OSMD / WebMidi (fail-soft); JSDoc typów wyniku wand / ug-import w `@stagesync/shared`
- [ ] **A11y:** segmenty map Timeline + menu kontekstowe — announce liczby zaznaczenia; Launcher (Tauri) — audit nazw kontroli „powrót do hosta”
- [ ] [#602](https://github.com/Negatywistczny/stagesync/issues/602) **DX / Knip:** detekcja martwego kodu i osieroconych zależności w monorepo (`lint:knip`; CI opcjonalnie nieblokujące)
- [ ] [#494](https://github.com/Negatywistczny/stagesync/issues/494) **Monitoring / Sentry:** crash reporting web + server (warunkowy DSN; bez sekretów w kontekście zdarzeń)

### Etap 5.2+ (Przyszłość)

- [ ] Motywy / auth / multi-user
- [ ] **Mixer — Out 3–4 (HW multi-out):** fizyczne wyjścia poza Master / `setSinkId` urządzenia — dopiero gdy model + WebAudio to wspierają (bez atrap w UI)
- [ ] **Mixer — bus→bus:** routing wyjścia busa na inny bus (dziś bus → tylko Master)
- [ ] **MIDI — kanał Program Change:** filtr IN (nie Omni) + kanał OUT w `MidiHostConfig` + Admin Host — dziś Omni IN / hardkod ch. 1 OUT ([RSK-MIDI-04/05](./analysis/inspiracje/audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md))
- [ ] **Client transport — H-01:** `setDisplayTicks` co rAF re-renderuje konsumentów `useTransport` (Vitest potwierdzony) — najpierw profiler Grid/Karaoke @ 120 Hz, potem split context / throttle ([triage](./analysis/inspiracje/audyty-silnik/Audyt-Architektury-StageSync-v5.triage.md))
- [ ] [#430](https://github.com/Negatywistczny/stagesync/issues/430) Cues Sampler
- [ ] [#437](https://github.com/Negatywistczny/stagesync/issues/437) Safety Net (Master/Slave / failover)
- [ ] [#674](https://github.com/Negatywistczny/stagesync/issues/674) **Mobile Client:** PWA (`apps/web`) + lekka powłoka Android (`apps/mobile-client`: keep-screen-on / kiosk / QR / mDNS); dystrybucja `.apk` z serwera / Releases — **bez** Google Play; pełny `mobile-full` + sidecar później
- [ ] **Parity residual (N/A v4 → opcjonalne):** Tab (nawigacja zaznaczenia); bare **S** = nożyczki (bez menu T); skala czcionki / autoscroll poza Karaoke; ukrywanie sekcji Formy w widoku roli Client
- [ ] **Backup Przywróć** (Admin) — pełny restore + path picker FS (dziś placeholder / katalog backupów w ustawieniach hosta)
