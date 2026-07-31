# ADR 0018 — Przyszła architektura audio (Live Processing, 6.0+)

- **Status:** Zaakceptowany
- **Data:** 2026-07-27
- **Etap:** kierunek `6.0+` (nie scope linii 5.x); **5.3 Colors & Channels** wydane (`v5.3.0`); sekwencja late 5.x = **5.4 Content Model → 5.5 Ingest → 5.6 Pitch & FX** (PO 2026-07-31) — Input/Suite/Automation nadal OUT z 5.x
- **Uzupełnia / amenuje (przy major 6.0):** [ADR 0017](./0017-live-show-control-contracts.md) §5 (Flex / Takes / recording = OUT **tylko** dla 5.x; rejestracja wraca w 6.0 — patrz §5 poniżej), [ADR 0015](./0015-daw-reference-and-product-decisions.md), [ADR 0008](./0008-timeline-clip-editing.md)
- **Nie narusza:** [ADR 0002](./0002-timebase-ssot.md), [ADR 0005](./0005-domain-axioms.md) (Granica 0)

## Kontekst

Linia **5.x** ma ustaloną tożsamość: Playback & Show Control — odtwarzanie, synchroniczny transport, sterowanie widowiskiem, niezawodność sceniczna ([ADR 0017](./0017-live-show-control-contracts.md)). Studio edit/record (Flex, Takes, multitrack recording, join/bounce) jest tam **permanent OUT**; powrót wymaga decyzji PO i **osobnego ADR w major** — ten ADR jest tą decyzją dla **6.0**.

Spec *Future Architecture: StageSync 6.0 & Beyond* proponuje ewolucję produktu w stronę **Interactive Live Processing & Master Show Controller**: wejścia live, natywny DSP (Audio Suite), automatyka w czasie rzeczywistym, ścieżki MIDI oraz sterowanie zewnętrznymi VSTi standalone. Ten ADR jest **kontraktem kierunku architektonicznego** — nie claim wdrożenia i nie cut scope 5.3.

Stan obecny (od **5.3.0**): Mixer Master\|Bus + bus→bus DAG; multi-out HW Out gdy `maxChannelCount ≥ 4` (przy stereo strefa ukryta); 5 nazwanych skór (`data-theme`); MIDI I/O + clock + PC na **serwerze**; playback WebAudio w kliencie (`audioPlayback` / `setSinkId`); brak InputStrip / AudioWorklet suite / automation lanes / MIDI tracks.

## Decyzja

### 0. Zakres obowiązywania

| Linia | Obowiązywanie |
|-------|----------------|
| **5.x** | Ten ADR **nie** otwiera Flex / Takes / recording / VSTi / InputStrip / automation w produkcie. Obowiązuje nadal [ADR 0017](./0017-live-show-control-contracts.md) §5. Fundamenty **5.3** (multi-out, skóry) = wydane; late 5.x = Content Model (5.4) + Ingest (5.5) + Pitch & FX Busses (5.6) — bez filarów 6.0. |
| **6.0+** | Ten ADR jest SSOT kierunku Live Processing; §5 ADR 0017 uznaje się za **zamknięte dla 5.x**, nie za zakaz na zawsze. Rejestracja + proste narzędzia edycji = **IN** przy major 6.0 (§5). |

### 1. Zero-Crash Policy (twarde)

1. **Native DSP (StageSync Audio Suite)** = wyłącznie **WebAudio / AudioWorklet / WASM** w procesie klienta renderującego audio. Izolacja od hosta Node / sidecara Tauri: crash workleta / glitch DSP **nie** może zabijać procesu serwera ani shella.
2. **Ciężkie VST / VSTi** = **wyłącznie** zewnętrzne aplikacje standalone sterowane MIDI (IAC / loopMIDI / virtual ports). StageSync = **Master Controller** (PC/Bank, routing, zones, clock) — **zakaz** ładowania VST in-process w Node, Tauri Rust ani WebView.
3. **„Zero-Crash” ≠ „zero glitch”:** WebAudio nadal może dropnąć sample / zablokować audio thread przy złym grafie; polityka zabrania *process crash* przez obcy kod wtyczek, nie obiecuje bezbłędnego FOH.

### 2. Cztery filary docelowe (6.0+)

| # | Filar | Istota |
|---|-------|--------|
| **1** | Audio Input & Live Processing | InputStrip; `getUserMedia` / `createMediaStreamSource`; mapowanie wejść fizycznych; niskolatencyjne bufory desktop; **multitrack recording + proste narzędzia edycji** (IN w 6.0 — §5) |
| **2** | StageSync Audio Suite | Natywny DSP: Limiter, EQ, Bus Comp, Global Track Pitch (±12 sync z Chord AST + OSMD), Smart Stop fade, Phase Invert, Reverb, BPM Delay, Mono Auto-Splitter, Talkback Ducker, LUFS / True-Peak — tylko Worklet/WASM |
| **3** | Real-Time Automation Engine | Lane’y pod ścieżkami; envelope’y; parametry send/DSP; wartości **wyłącznie z host Tick Engine** (SSOT — §3), aplikowane w grafie WebAudio klienta |
| **4** | MIDI Tracks + Standalone VSTi Controller | Virtual MIDI + **MIDI Patch Matrix** (UI portów + mapowanie virtual bus); PC/CC / Bank / zones / transpose; StageSync = Master Controller zewnętrznych standalone. **W 6.0: 100% fokus na sterowanie appkami standalone** — wbudowane synthy WebAudio / SFZ = **Later (6.x+)**, OUT z 6.0 |

### 3. SSOT / Granica 0 — bez wyjątków

1. **Autorytet czasu** pozostaje na serwerze ([ADR 0002](./0002-timebase-ssot.md)). Klient **nie** staje się zegarem muzycznym dla seek / song change / MIDI clock OUT / automation / MIDI tracks.
2. **Wszelka automatyka i odczyt MIDI** (lane read points, PC/CC na song change, sync BPM Delay / Track Pitch do mapy tempa) **czyta host Tick Engine** — kanon pozycji = ticki SSOT. Lokalny `AudioContext.currentTime` = tylko render / scheduling między tickami, **nigdy** musical clock projektu.
3. **Render audio** może żyć w kliencie (jak dziś); pozycja clipów i envelope = od ticków / map SSOT.
4. **ACL** ([ADR 0005](./0005-domain-axioms.md)): sample / ms / MediaStream tylko na krawędzi audio; MIDI device I/O nadal przez `apps/server` (nie w procesie Tauri — [ADR 0010](./0010-desktop-shell-tauri.md)).
5. Automation **lane data** = część projektu (Zod na krawędzi); **odtwarzanie** envelope = klient między tickami (jak playhead smoothing), bez osobnego „automation clock”.

### 4. Sekwencja wejścia (zablokowana PO)

**Aktualizacja PO (2026-07-31):** przed Pitch & FX wchodzą dwa minory **treści** (ortogonalne do grafu audio) — fundament pod import timed lyrics i Karaoke **7.0**. **Nie** otwierają Input / Suite / automation / recording w 5.x.

```
[5.3] Colors & Channels — multi-out HW + nazwane skóry
  → [5.4] Content Model — Lyrics AST (sylaby w tickach) + migrator
  → [5.5] Ingest MVP — UltraStar → ticks; bridging US+UG (fixtures)
  → [5.6] Pitch & FX Busses — Track Pitch + expanded busses / send-return
  → [6.0+] Input, Automation, Standalone VSTi Controller
      (+ Audio Suite; STEM / mute lead; recording + proste edit; MIDI Patch Matrix)
  → [7.0+] Karaoke & Jukebox (/karaoke, /request, Gig vs Jukebox)
```

| Linia | Hero | Zakres | Explicitly OUT |
|-------|------|--------|----------------|
| **5.3** | **Colors & Channels** | Multi-out HW (`maxChannelCount` gate) + nazwane skóry | InputStrip, Suite, automation, VSTi, recording |
| **5.4** | **Content Model** | `formatVersion` + Lyrics AST (ticks); role/melodia w schemacie; migrator | `/karaoke` TV, `/request`, UltraStar bridging, Input/Suite/automation |
| **5.5** | **Ingest MVP** | UltraStar → ticks; Text-Anchor gdy fixtures; UG zostaje | Cloud AI ingest; MusicXML-as-grid jako must |
| **5.6** | **Pitch & FX Busses** | Track Pitch Shift + expanded busses / send-return FX (WebAudio) | Live input, VST in-process, automation lanes, recording |
| **6.0+** | Live Processing & Master Show Controller | Filary 1–4; STEM / mute lead; recording + proste edit; MIDI Patch Matrix; fokus standalone VSTi | In-process VST; wbudowane synthy WebAudio (→ 6.x+); Flex / Take Folders jako must 6.0 |
| **7.0+** | Karaoke & Jukebox | `/karaoke`, `/request`, Gig/Jukebox — [#824](https://github.com/Negatywistczny/stagesync/issues/824) | Cloud karaoke; zależność od 5.4–5.6 + 6.x STEM/pitch |

Szczegóły checklisty: [ROADMAP](../ROADMAP.md), [TODO](../TODO.md), [report-scope-5.4](../analysis/reports/report-scope-5.4.md). Implementacja filarów 6.0 = dopiero po osobnym scope report + akceptacji PO przed kodem.

### 5. Decyzje PO zamknięte (sesja 2026-07-27)

| Temat | Decyzja |
|-------|---------|
| Status ADR | **Zaakceptowany** |
| Sekwencja | **5.3** → **5.4** Content Model → **5.5** Ingest → **5.6** Pitch & FX → **6.0+** Input / Automation / VSTi → **7.0+** Karaoke (PO 2026-07-31; treści przed Pitch) |
| Tick Engine | Automation + MIDI **zawsze** czytają host Tick Engine (SSOT); bez client musical clock |
| **Recording** | **IN w 6.0** — wprowadzenie rejestracji z **prostymi narzędziami edycji**. Nadpisuje wcześniejsze „otwarte / może OUT w alpha”. Linia **5.x** nadal OUT ([ADR 0017](./0017-live-show-control-contracts.md) §5); major 6.0 otwiera zakres. |
| **MIDI Ports** | **IN w 6.0** — prosty panel UI: konfiguracja portów + mapowanie virtual bus (**MIDI Patch Matrix**) |
| **Wbudowane synthy WebAudio / SFZ** | **Later (6.x+)** — **OUT z 6.0**. W 6.0 fokus **100%** na sterowanie standalone (PC/CC Routing) |
| Flex / Take Folders | Nadal **OUT** jako must 6.0 (osobna decyzja PO później); 6.0 = recording + proste edit, nie studio Takes/Flex |

### 6. Explicitly OUT

- In-process VST/AU/CLAP host (Node, Rust, WebView)
- Ableton Link / zewnętrzny musical clock jako autorytet (nadal ACL; serwer SSOT)
- Obietnice Zero-Glitch HA / seamless plugin crash recovery poza izolacją procesu
- Wbudowane synthy WebAudio / SFZ w **6.0** (Later 6.x+)
- Studio Take Folders / Flex Time jako must 6.0
- Atrapy Out / FX / Input / Patch Matrix w UI przed runtime gate ([ADR 0011](./0011-ui-parity-behavior.md))
- Input / Suite / automation / VSTi / recording w linii **5.x**

### 7. Residual (prawdziwie otwarte — nie domykać w kodzie „na zapas”)

1. Automation: tylko parametry Mixer/DSP, czy też clip gain / Forma?
2. Track Pitch (5.6): globalny vs per-track; szczegóły sync Chord AST + OSMD
3. Desktop low-latency: czy wystarczy WebAudio + preferencje bufora, czy kiedykolwiek natywny sidecar audio (**bez** VST) — konflikt z thin shell?
4. Hot-unplug wejść / wyjść i fail-safe (FOH): mute vs fold-to-Master — kontynuacja Q z [Recenzja Live FOH](../analysis/inspiracje/spec-5.2+/Recenzja-Decyzji-Live-FOH-Audio.triage.md)
5. STEM / mute lead w 6.x: kontrakt Mixer vs osobne ścieżki assetów — needed dla Karaoke 7.0 ([#824](https://github.com/Negatywistczny/stagesync/issues/824))

### 8. Parity v4 (nie wymyślać wstecz)

v4 / parytet 5.0: Host MIDI I/O, clock, Program Change, odtwarzanie audio, Mixer — **bez** pełnego Live Input Suite, automation lanes DAW ani hosta VSTi. Multi-out HW i rozbudowany DSP to **ewolucja 5.3→6.0**, nie „parity gap” wobec 4.x. Nie oznaczać filarów 6.0 jako must parytetu v4.

## Konsekwencje

- [ROADMAP](../ROADMAP.md) / [TODO](../TODO.md): sekwencja **5.3 → 5.4 Content → 5.5 Ingest → 5.6 Pitch & FX → 6.0 → 7.0** zlinkowana do tego ADR; bez must blockerów 5.0 z filarów 6.0; treści nie otwierają Input/Suite/automation w 5.x.
- [ADR 0017](./0017-live-show-control-contracts.md) §5: historia **5.x OUT** bez zmiany; przy major **6.0** rejestracja + proste edit wracają **zgodnie z tym ADR** (supersedes „permanent” poza linią 5.x).
- [ARCHITECTURE](../ARCHITECTURE.md): wskaźnik do tego ADR przy mapie decyzji audio.
- CHANGELOG: **brak** wpisu za sam ADR / ROADMAP / TODO (changelog.mdc — docs deweloperskie).
- Inspiracje FOH ([Recenzja-Decyzji-Live-FOH-Audio](../analysis/inspiracje/spec-5.2+/Recenzja-Decyzji-Live-FOH-Audio.triage.md)): zgodne — multi-out tylko przy `maxChannelCount`, DAG, zakaz atrap; ten ADR **nie** cofa tych bramek.

## Powiązane

- [ADR 0002](./0002-timebase-ssot.md), [0005](./0005-domain-axioms.md), [0008](./0008-timeline-clip-editing.md), [0010](./0010-desktop-shell-tauri.md), [0011](./0011-ui-parity-behavior.md), [0015](./0015-daw-reference-and-product-decisions.md), [0017](./0017-live-show-control-contracts.md)
- Spec źródłowy (sesja PO / plan): Future Architecture Spec 6.0 (ten ADR = kanon w repo)
- Triage FOH / mixer: `docs/analysis/inspiracje/spec-5.2+/Recenzja-Decyzji-Live-FOH-Audio.triage.md`, `…/Specyfikacja-StageSync-dla-miksera-DAW.triage.md`
