# StageSync v5 — TODO

**Stan:** cut **`5.4.6`** — następny fokus: **5.5 Pitch & FX** → **6.0 Live Suite** → **6.1 Karaoke & Jukebox**.
Historia: [CHANGELOG.md](../CHANGELOG.md). Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Higiena: [todo-hygiene.mdc](../.cursor/rules/todo-hygiene.mdc).

**Polityka:** zakaz stubów. [ADR 0011](./adr/0011-ui-parity-behavior.md).  
**Decyzje PO ≠ backlog:** [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md) · [ADR 0017](./adr/0017-live-show-control-contracts.md). Mobile: [ADR 0016](./adr/0016-android-performer-console.md) · [MOBILE.md](./guides/MOBILE.md).  
**Kierunek audio 6.0+ (Zaakceptowany):** [ADR 0018](./adr/0018-future-audio-architecture.md) · [ROADMAP](./ROADMAP.md).  
**Specyfikacje (hipotezy):** [inspiracje/specyfikacje/](./analysis/inspiracje/specyfikacje/README.md).

**Residuale operatorskie:** **G1–G10** — **bez claim green** ([report-beta-gate.md](./analysis/reports/milestones/report-beta-gate.md)). G2 skip; G3 re-verify HW; G7–G9 Docker odłożone. P8 green — [report-po-smoke-p8.md](./analysis/reports/milestones/report-po-smoke-p8.md).

**Release policy:** sekwencja PO = **5.5 Pitch & FX** → **6.0 Live Suite** → **6.1 Karaoke & Jukebox** ([ADR 0018](./adr/0018-future-audio-architecture.md) §4); linia **5.4 Syllables** — Smart Tempo **5.4.2**, polish do **5.4.6**.

## Must (najbliższy cut 5.5 Desk & Audio Polish)

- [ ] **5.5 — Desk & Audio Polish:** Solo / Mute Off for All, Audition Window / PFL podgląd realizatora, Paste Properties, Chase MIDI Notes po operacji Seek — [ROADMAP.md](./ROADMAP.md)

## Must (operator residual)

- [ ] **HW smoke multi-out** na interfejsie ≥ 4 ch (mac/Win) — checklista w [DESKTOP.md](./guides/DESKTOP.md); **bez claim green**
- [ ] **G1–G10** na instalatorach z najnowszego GitHub Release (mac/Win HW) — bez claim green; G2 skip; G3 re-verify HW; G7–G9 Docker deferred

## Should / Higiena (nie blokuje)

- [ ] **Perf (observe first):** profil animacji chord-hero w Client Grid przy `prefers-reduced-motion`; OSMD — cursor-only update zamiast full re-render na tick (jeśli API pozwala)
- [ ] [#810](https://github.com/Negatywistczny/stagesync/issues/810) **Push / FCM / WebPush** — w toku: lokalne alerty + rejestracja tokenów + kanały; FCM wymaga `google-services.json` (opt-in, ADR 0016 — zero sekretów w APK). Nie mylić z FG notification lokalnego hosta Console.
- [ ] **Import US+UG:** higiena mostka / zero-length chords / coverage Formy — Smart Tempo **5.4.2** wydane; tu residual mostka (nie drugi silnik tempa) · [AST triage](./analysis/inspiracje/specyfikacje/Implementacja-Smart-Tempo-w-Antigravity.triage.md)

## Etap 5.6+ / Later (zgodnie z nową Roadmapą)

### 5.6 Studio Shell & Multi-Window / 5.7 Extended Notation / 5.8 Advanced Timeline

- [ ] **5.6.0 — Studio Shell:** Multi-Window via Tauri (odpinanie okien), synchronizacja tła (Web Worker + performance.now), obsługa pedałów Bluetooth (AirTurn/HID), eksport historii ZAiKS CSV.
- [ ] **5.7.0 — Extended Notation:** Filtry widoczności w Partyturze (Selection Filter), wybór notacji akordów, dwukolumnowy układ tekstu Karaoke, litery orientacyjne [A], [B], [C].
- [ ] **5.8.0 — Advanced Timeline Editing:** Insert Silence / Delete Time, Nudge klipów i sylab, Select All Following, Split at Playhead, Find & Replace, Collect All and Save do assets/.

### 6.0+ Live Suite & Dual Engine

- [ ] **6.0.0 — Dual Engine (Studio vs Live):** Tryb Scena vs Studio, automatyczny "Freeze" wtyczek VST/AU przed koncertem, blokowanie warstw kłódką.
- [ ] **6.1.0 — Live Show Automation & DMX:** Track Delays (ms), warstwa sterowania DMX / Art-Net (UDP 30 Hz).
- [ ] **6.2.0 — Pre-flight & Hardware Setup:** Rig Manager (aliasy MIDI), MIDI Learn, Tuner instrumentalny w `/client`, Setlist Pre-flight Check.
- [ ] **6.3.0 — Karaoke & Jukebox:** Moduł LAN `/karaoke` i `/request` z moderacją w Adminie.

### 7.x — Notation Studio & Enterprise Rig

- [ ] **7.0.0 — Studio Notation Edit:** Edycja partytur MusicXML bezpośrednio w drzewie projektu.
- [ ] **7.1.0 — Enterprise Rig & OSC:** Podgląd logów MIDI/OSC, OSC Matrix & Zero-Glitch HA Master/Spare.

### Residual ops / mobile

- [ ] **Client transport — H-01 (residual):** split context / throttle `displayTicks` pod profil Grid/Karaoke @ 90–120 Hz (./guides/MOBILE.md) § H-01; [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md)
- [ ] **GUI mobile (responsive):** poprawa wszystkich powierzchni (Admin / Client / Timeline) pod wąskie viewporty, touch i Android WebView (./guides/MOBILE.md); [ADR 0016](./adr/0016-android-performer-console.md)
- [ ] [#674](https://github.com/Negatywistczny/stagesync/issues/674) **Performer + Console — residual:** smoke P-HW/C-HW na tablecie (w tym C-HW3 lokalny host) — **bez claim HW green**; native MIDI na Console host = niedostępne na Androidzie ([ADR 0016](./adr/0016-android-performer-console.md); [MOBILE.md](./guides/MOBILE.md))
- [ ] [#692](https://github.com/Negatywistczny/stagesync/issues/692) **Offline-First UI — residual:** delta / CacheStorage per-asset po `ui-manifest`
- [ ] **Safety Net (residual):** auto-election / lease split-brain — MVP zamknięte w [#437](https://github.com/Negatywistczny/stagesync/issues/437); to tylko Later ([triage](./analysis/inspiracje/specyfikacje/Safety-Net-dla-StageSync-v5.2.triage.md))
- [ ] **Parity residual (N/A v4 → opcjonalne):** Tab (nawigacja zaznaczenia); bare **S** = nożyczki (bez menu T); skala czcionki / autoscroll poza Karaoke; ukrywanie sekcji Formy w widoku roli Client
