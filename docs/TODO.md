# StageSync v5 — TODO

**Stan:** cut **`5.4.2`** (Smart Tempo) — Import US+UG **stable** (etykieta eksperymentalny usunięta); następny fokus: **5.5 Pitch & FX** → **6.0 Live Suite** → **6.1 Karaoke & Jukebox**.
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Higiena: [todo-hygiene.mdc](../.cursor/rules/todo-hygiene.mdc).

**Polityka:** zakaz stubów. [ADR 0011](./adr/0011-ui-parity-behavior.md).  
**Decyzje PO ≠ backlog:** [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md) · [ADR 0017](./adr/0017-live-show-control-contracts.md). Mobile: [ADR 0016](./adr/0016-android-performer-console.md) · [MOBILE.md](./MOBILE.md).  
**Kierunek audio 6.0+ (Zaakceptowany):** [ADR 0018](./adr/0018-future-audio-architecture.md) · [ROADMAP](./ROADMAP.md).  
**Specy 5.2+ (hipotezy):** [inspiracje/spec-5.2+/](./analysis/inspiracje/spec-5.2+/).

**Residuale operatorskie:** **G1–G10** — **bez claim green** ([report-beta-gate.md](./analysis/reports/report-beta-gate.md)). G2 skip; G3 re-verify HW; G7–G9 Docker odłożone. P8 green — [report-po-smoke-p8.md](./analysis/reports/report-po-smoke-p8.md).

**Release policy:** sekwencja PO = **5.5 Pitch & FX** → **6.0 Live Suite** → **6.1 Karaoke & Jukebox** ([ADR 0018](./adr/0018-future-audio-architecture.md) §4); linia **5.4 Syllables** zamknięta — patch **5.4.2** = Smart Tempo wydane.

## Must (najbliższy cut 5.5 Pitch & FX)

- [ ] **5.5 — Pitch & FX:** Track Pitch Shift + expanded busses / send-return FX (WebAudio; bez VST in-process) — [ADR 0018](./adr/0018-future-audio-architecture.md); scope report przed kodem hero

## Must (operator residual)

- [ ] **HW smoke multi-out** na interfejsie ≥ 4 ch (mac/Win) — checklista w [DESKTOP.md](./DESKTOP.md); **bez claim green**
- [ ] **G1–G10** na instalatorach `v5.3.0` / najnowszy **5.3.x** / **5.4.x** (mac/Win HW) — bez claim green; G2 skip; G3 re-verify HW; G7–G9 Docker deferred

## Should / Higiena (nie blokuje)

- [ ] **Perf (observe first):** profil animacji chord-hero w Client Grid przy `prefers-reduced-motion`; OSMD — cursor-only update zamiast full re-render na tick (jeśli API pozwala)
- [ ] [#810](https://github.com/Negatywistczny/stagesync/issues/810) **Push / FCM / WebPush** — w toku: lokalne alerty + rejestracja tokenów + kanały; FCM wymaga `google-services.json` (opt-in, ADR 0016 — zero sekretów w APK). Nie mylić z FG notification lokalnego hosta Console.
- [ ] **Import US+UG:** higiena mostka / zero-length chords / coverage Formy — Smart Tempo **5.4.2** wydane; tu residual mostka (nie drugi silnik tempa) · [AST triage](./analysis/inspiracje/spec-5.2+/Implementacja-Smart-Tempo-w-Antigravity.triage.md)

## Etap 5.4+ / Later

### 5.4 Syllables / 5.5 Pitch & FX / 6.0 Live Suite

- [ ] **5.5 — Pitch & FX:** Track Pitch Shift + expanded busses / send-return FX (WebAudio; bez VST in-process) — [ADR 0018](./adr/0018-future-audio-architecture.md)
- [ ] **6.0 Live Suite (po major + scope report):** Input & Live Processing (+ recording + proste edit); Audio Suite (Worklet/WASM) + **STEM / mute lead**; Automation lanes (host Tick Engine SSOT); MIDI Patch Matrix + Standalone VSTi Controller (PC/CC) — wbudowane synthy WebAudio = Later 6.x+; szczegóły / OUT w [ADR 0018](./adr/0018-future-audio-architecture.md)

### Residual ops / mobile

- [ ] **Client transport — H-01 (residual):** split context / throttle `displayTicks` pod profil Grid/Karaoke @ 90–120 Hz ([MOBILE.md](./MOBILE.md) § H-01; [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md))
- [ ] **GUI mobile (responsive):** poprawa wszystkich powierzchni (Admin / Client / Timeline) pod wąskie viewporty, touch i Android WebView ([MOBILE.md](./MOBILE.md); [ADR 0016](./adr/0016-android-performer-console.md))
- [ ] [#674](https://github.com/Negatywistczny/stagesync/issues/674) **Performer + Console — residual:** smoke P-HW/C-HW na tablecie (w tym C-HW3 lokalny host) — **bez claim HW green**; native MIDI na Console host = niedostępne na Androidzie ([ADR 0016](./adr/0016-android-performer-console.md); [MOBILE.md](./MOBILE.md))
- [ ] [#692](https://github.com/Negatywistczny/stagesync/issues/692) **Offline-First UI — residual:** delta / CacheStorage per-asset po `ui-manifest`
- [ ] **Safety Net (residual):** auto-election / lease split-brain — MVP zamknięte w [#437](https://github.com/Negatywistczny/stagesync/issues/437); to tylko Later ([triage](./analysis/inspiracje/spec-5.2+/Safety-Net-dla-StageSync-v5.2.triage.md))
- [ ] **Parity residual (N/A v4 → opcjonalne):** Tab (nawigacja zaznaczenia); bare **S** = nożyczki (bez menu T); skala czcionki / autoscroll poza Karaoke; ukrywanie sekcji Formy w widoku roli Client

### 6.1 Karaoke & Jukebox (Later)

- [ ] [#824](https://github.com/Negatywistczny/stagesync/issues/824) **Karaoke & Jukebox** — **6.1** (po 6.0 Live Suite; dawne „7.0” **nie istnieje**): `/karaoke`, `/request`, tryby Gig/Jukebox + kolejka; 100 % LAN; zależności: Syllables **5.4**, Pitch **5.5**, STEM/pitch **6.0** — szczegóły w epiku ([ROADMAP](./ROADMAP.md))

**OUT (nie wraca do TODO):** natywny **StageSync Performer na iOS** (Swift/WKWebView / TestFlight) — ścieżka iOS = **Safari / PWA `/client`** ([#809](https://github.com/Negatywistczny/stagesync/issues/809), [#674](https://github.com/Negatywistczny/stagesync/issues/674)); natywne APK = Android only ([ADR 0016](./adr/0016-android-performer-console.md)).
