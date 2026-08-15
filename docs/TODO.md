# StageSync — TODO

Otwarte zadania. Plan etapów: [ROADMAP.md](./ROADMAP.md). Historia: [CHANGELOG.md](../CHANGELOG.md).

## Must — Pitch & FX

- [ ] Solo / Mute Off for All
- [ ] Audition Window / PFL (podgląd realizatora)
- [ ] Paste Properties (routing, gain, fade, HW Out)
- [ ] Chase MIDI Notes po Seek

## Must — operator / HW

- [ ] **HW smoke multi-out** na interfejsie ≥ 4 ch (mac/Win) — [DESKTOP.md](./guides/DESKTOP.md); bez claim green
- [ ] **G1–G10** na instalatorach z GitHub Release (mac/Win HW) — bez claim green; G2 skip; G3 re-verify HW; G7–G9 Docker deferred — [report-beta-gate](./standards/analysis/reports/current/report-beta-gate.md)

## Should / Higiena

- [ ] [#810](https://github.com/kacperczeczot/stagesync/issues/810) **Push / FCM / WebPush** — lokalne alerty + tokeny + kanały; FCM = opt-in `google-services.json` (ADR 0016)

### Dekompozycja dużych plików

#### Szlif UI Timeline (`apps/web`)

- [ ] Górny pasek narzędzi &rarr; wydzielenie `TimelineHeaderToolbar.tsx` z `TimelineHeader.tsx`

#### Kod Natywny (Rust & Kotlin)

- [ ] **Rust (Tauri):** refaktoryzacja i podział modułów `launcher.rs`, `lib.rs`, `tray.rs`
- [ ] **Kotlin (Android):** refaktoryzacja i podział `LauncherActivity.kt`, `LocalHostService.kt`

## Later

Kolejność i kryteria Done: [ROADMAP.md](./ROADMAP.md).

### Studio Shell / Notation / Timeline

- [ ] **Studio Shell:** Multi-Window (Tauri), sync tła, pedały Bluetooth/HID, eksport ZAiKS CSV
- [ ] **Extended Notation:** Selection Filter OSMD, notacja akordów, 2-col Karaoke, Rehearsal Marks
- [ ] **Advanced Timeline:** Insert Silence / Delete Time, Nudge, Select All Following, Split at Playhead, Find & Replace, Collect All and Save

### Live Suite & dalej

- [ ] **Live Suite + Dual Engine:** Studio vs Live ([ADR 0019](./architecture/adr/0019-dual-engine-studio-live.md)); Plugin Host + Freeze; Input, Automation, VSTi, recording, MIDI Patch Matrix, STEM/Demucs [#832](https://github.com/kacperczeczot/stagesync/issues/832) — [ADR 0018](./architecture/adr/0018-future-audio-architecture.md)
- [ ] **Karaoke & Jukebox:** `/karaoke`, `/request`, Gig vs Jukebox — [#824](https://github.com/kacperczeczot/stagesync/issues/824)
- [ ] **Pre-flight & Hardware:** Rig Manager, MIDI Learn, Tuner `/client`, Setlist Pre-flight
- [ ] **DMX / Art-Net:** Track Delays + warstwa światła (UDP 30 Hz)
- [ ] **Smart Ingest ACL:** satellite/CLI + `import-bundle`; core bez scrapingu — [#840](https://github.com/kacperczeczot/stagesync/issues/840)
- [ ] **Notation Studio:** edycja MusicXML + most MuseScore — [#837](https://github.com/kacperczeczot/stagesync/issues/837)
- [ ] **Enterprise Rig & OSC:** podgląd MIDI/OSC, OSC Matrix & HA Master/Spare
- [ ] **Studio Ecosystem:** Virtual Performers [#838](https://github.com/kacperczeczot/stagesync/issues/838) + Muse Sounds [#839](https://github.com/kacperczeczot/stagesync/issues/839); legal/ADR przed kodem

### Residual ops / mobile

- [ ] **Client transport H-01:** split context / throttle `displayTicks` @ 90–120 Hz — [MOBILE.md](./guides/MOBILE.md); [ADR 0015](./architecture/adr/0015-daw-reference-and-product-decisions.md)
- [ ] **GUI mobile:** Admin / Client / Timeline pod wąskie viewporty, touch, Android WebView — [MOBILE.md](./guides/MOBILE.md); [ADR 0016](./architecture/adr/0016-android-performer-console.md)
- [ ] [#674](https://github.com/kacperczeczot/stagesync/issues/674) **Performer + Console:** smoke P-HW/C-HW na tablecie (w tym C-HW3); bez claim HW green
- [ ] [#692](https://github.com/kacperczeczot/stagesync/issues/692) **Offline-First UI:** delta / CacheStorage per-asset po `ui-manifest`
- [ ] **Safety Net:** auto-election / lease split-brain — Later ([triage](./standards/analysis/inspiracje/specyfikacje/Safety-Net-dla-StageSync-v5.2.triage.md))
- [ ] **Parity residual (opcjonalne):** Tab (nawigacja zaznaczenia); bare **S** = nożyczki; skala czcionki / autoscroll poza Karaoke; ukrywanie sekcji Formy w roli Client
