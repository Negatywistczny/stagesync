# StageSync v5 — TODO

**Stan:** `5.1.3` wydane 2026-07-25 na `main` (`v5.1.3`) — linia **5.1** = **Launch & Mix**; linia **5.0** = **Overture** (`v5.0.0` / `v5.0.1`).  
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Higiena: [todo-hygiene.mdc](../.cursor/rules/todo-hygiene.mdc).

**Polityka:** nowe funkcje po Launch & Mix → linia **5.2+**. Zakaz stubów. [ADR 0011](./adr/0011-ui-parity-behavior.md).  
**Decyzje PO ≠ backlog:** [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md) (Logic referencja; multi-out tak; auto-update nie; …). Mobile shell: [ADR 0016](./adr/0016-android-performer-console.md) · [MOBILE.md](./MOBILE.md).

**Residuale operatorskie:** **G1–G10** — **bez claim pełnego green** ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)). Pass operatorskie: **G1**, **G4–G6**, **G10** (bazowo na `5.1.2` / docs; w `5.1.3` też „Pobierz log” i ostrzeżenie updatera). Residual: **G2** skip; **G3** deferred (fix Documents w `5.1.3` — wymaga re-verify HW na nowym instalatorze); **G7–G9** Docker deferred. P8 green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).

## Must (operator residual po 5.1.0)

- [ ] **G1–G10** na instalatorach `v5.1.3` (mac/Win HW) — **bez claim pełnego green**; **G1**, **G4–G6**, **G10** — pass operatorski (bazowo `5.1.2` / docs; `5.1.3` dokłada „Pobierz log”, ostrzeżenie restartu updatera, podręcznik DESKTOP); **G2** skip; **G3** re-verify HW po instalacji `5.1.3` (data dir Documents + migracja — fix w tym patchu, jeszcze bez dowodu HW); **G7–G9** Docker — odłożone

## Should / Higiena (nie blokuje 5.2)

- [ ] **Perf (observe first):** profil animacji chord-hero w Client Grid przy `prefers-reduced-motion`; batch DOM meterów Mixer przy wielu stripach; OSMD — cursor-only update zamiast full re-render na tick (jeśli API pozwala)
- [ ] **DX / types:** wąskie adaptery zamiast `any` na granicy OSMD / WebMidi (fail-soft); JSDoc typów wyniku wand / ug-import w `@stagesync/shared`
- [ ] **A11y:** segmenty map Timeline + menu kontekstowe — announce liczby zaznaczenia; Launcher (Tauri) — audit nazw kontroli „powrót do hosta”
- [ ] [#602](https://github.com/Negatywistyczny/stagesync/issues/602) **DX / Knip:** detekcja martwego kodu i osieroconych zależności w monorepo (`lint:knip`; CI opcjonalnie nieblokujące)
- [ ] [#494](https://github.com/Negatywistyczny/stagesync/issues/494) **Monitoring / Sentry:** crash reporting web + server (warunkowy DSN; bez sekretów w kontekście zdarzeń)

## Etap 5.2+ (Przyszłość)

- [ ] Motywy / auth / multi-user *(backlog — nie permanent OUT bez PO)*
- [ ] **Mixer — Out 3–4 (HW multi-out):** **decyzja produktowa: wprowadzić** ([ADR 0015](./adr/0015-daw-reference-and-product-decisions.md)); implementacja gdy model + WebAudio wspierają (bez atrap w UI)
- [ ] **Mixer — bus→bus:** routing wyjścia busa na inny bus (dziś bus → tylko Master)
- [ ] **Client transport — H-01:** `setDisplayTicks` co rAF re-renderuje konsumentów `useTransport` (Vitest potwierdzony) — najpierw profiler Grid/Karaoke @ 120 Hz na tablecie (kroki: [MOBILE.md](./MOBILE.md)), potem split context / throttle ([triage](./analysis/inspiracje/audyty-silnik/Audyt-Architektury-StageSync-v5.triage.md); [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md))
- [ ] [#430](https://github.com/Negatywistyczny/stagesync/issues/430) Cues Sampler
- [ ] [#437](https://github.com/Negatywistyczny/stagesync/issues/437) Safety Net (Master/Slave / failover)
- [ ] [#674](https://github.com/Negatywistyczny/stagesync/issues/674) **Performer + Console (Android):** PWA (`apps/web`) + powłoki Kotlin WebView (`apps/performer` → `/client`, `apps/console` → `/admin`); dystrybucja `.apk` z hosta `/downloads/…` / Releases — **bez** Google Play ([ADR 0016](./adr/0016-android-performer-console.md); [MOBILE.md](./MOBILE.md)); lokalny host na Console = Faza 4
- [ ] [#692](https://github.com/Negatywistyczny/stagesync/issues/692) **Offline-First UI hybrid (follow-up):** delta / CacheStorage per-asset po `ui-manifest` (MVP: full `ui-bundle.zip` + dialog „Zastosuj” już na main); bez cichego sync mid-set
- [ ] **Parity residual (N/A v4 → opcjonalne):** Tab (nawigacja zaznaczenia); bare **S** = nożyczki (bez menu T); skala czcionki / autoscroll poza Karaoke; ukrywanie sekcji Formy w widoku roli Client
- [ ] **Backup Przywróć** (Admin) — pełny restore + path picker FS *(backlog, nie decyzja OUT; dziś placeholder / katalog backupów w ustawieniach hosta)*
