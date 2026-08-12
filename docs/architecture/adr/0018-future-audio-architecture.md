# ADR 0018 — Przyszła architektura audio (Live Processing, 6.0+)

- **Status:** Zaakceptowany
- **Data:** 2026-07-27
- **Etap:** kierunek `6.0+` (nie scope linii 5.x); **5.3 Colors & Channels** wydane (`v5.3.0`); sekwencja late 5.x = **5.4 Syllables → 5.5 Pitch & FX** (PO amend 2026-08-02; wcześniej 2026-07-31: Content Model → Ingest → Pitch jako 5.6) — Input/Suite/Automation nadal OUT z 5.x
- **Uzupełnia / amenuje (przy major 6.0):** [ADR 0017](./0017-live-show-control-contracts.md) §5 (Flex / Takes / recording = OUT **tylko** dla 5.x; rejestracja wraca w 6.0 — patrz §5 poniżej), [ADR 0015](./0015-daw-reference-and-product-decisions.md), [ADR 0008](./0008-timeline-clip-editing.md)
- **Uzupełniony przez:** [ADR 0019](./0019-dual-engine-studio-live.md) — Dual Engine Studio vs Live (tryby, Freeze gate, Lock Lane)
- **Nie narusza:** [ADR 0002](./0002-timebase-ssot.md), [ADR 0005](./0005-domain-axioms.md) (Granica 0)
- **Amend PO (2026-08-09):** Zero-Crash — zakaz **in-process** VST zostaje; dozwolony **sandboxowany Plugin Host** (sidecar) tylko w **Studio** + Freeze przed **Live** ([ADR 0019](./0019-dual-engine-studio-live.md)); precyzyjna tabela IN/OUT „prostej edycji” (§5)

## Kontekst

Linia **5.x** ma ustaloną tożsamość: Playback & Show Control — odtwarzanie, synchroniczny transport, sterowanie widowiskiem, niezawodność sceniczna ([ADR 0017](./0017-live-show-control-contracts.md)). Studio edit/record (Flex, Takes, multitrack recording, join/bounce) jest tam **permanent OUT**; powrót wymaga decyzji PO i **osobnego ADR w major** — ten ADR jest tą decyzją dla **6.0** (audio / rejestracja / Plugin Host). Tryby Studio vs Live = [ADR 0019](./0019-dual-engine-studio-live.md).

Spec _Future Architecture: StageSync 6.0 & Beyond_ proponuje ewolucję produktu w stronę **Interactive Live Processing & Master Show Controller**: wejścia live, natywny DSP (Audio Suite), automatyka w czasie rzeczywistym, ścieżki MIDI, sterowanie zewnętrznymi VSTi standalone oraz (w Studio) sandboxowany host wtyczek z Freeze przed Live. Ten ADR jest **kontraktem kierunku architektonicznego** — nie claim wdrożenia i nie cut scope 5.3.

Stan obecny (od **5.3.0**): Mixer Master\|Bus + bus→bus DAG; multi-out HW Out gdy `maxChannelCount ≥ 4` (przy stereo strefa ukryta); 5 nazwanych skór (`data-theme`); MIDI I/O + clock + PC na **serwerze**; playback WebAudio w kliencie (`audioPlayback` / `setSinkId`); brak InputStrip / AudioWorklet suite / automation lanes / MIDI tracks.

## Decyzja

### 0. Zakres obowiązywania

| Linia    | Obowiązywanie                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **5.x**  | Ten ADR **nie** otwiera Flex / Takes / recording / VSTi / InputStrip / automation / Plugin Host w produkcie. Obowiązuje nadal [ADR 0017](./0017-live-show-control-contracts.md) §5. Fundamenty **5.3** (multi-out, skóry) = wydane; late 5.x = **Syllables (5.4)** + **Pitch & FX (5.5)** — bez filarów 6.0. |
| **6.0+** | Ten ADR jest SSOT kierunku **Live Suite** (audio); Dual Engine = [ADR 0019](./0019-dual-engine-studio-live.md). §5 ADR 0017 uznaje się za **zamknięte dla 5.x**, nie za zakaz na zawsze. Rejestracja + proste narzędzia edycji = **IN** przy major 6.0 (§5).                                                 |

### 1. Zero-Crash Policy (twarde)

1. **Native DSP (StageSync Audio Suite)** = wyłącznie **WebAudio / AudioWorklet / WASM** w procesie klienta renderującego audio. Izolacja od hosta Node / sidecara Tauri: crash workleta / glitch DSP **nie** może zabijać procesu serwera ani shella.
2. **VST / AU / CLAP:**
   - **Zakaz in-process** — ładowanie wtyczek w procesie Node, Tauri Rust ani WebView jest **zabronione**.
   - **Plugin Host** = **osobny sandboxowany proces** (sidecar, np. C++/JUCE lub równoważny). Crash hosta **nie** może zabijać serwera ani shella.
   - **Studio** ([ADR 0019](./0019-dual-engine-studio-live.md)): Plugin Host **może** ładować wtyczki.
   - **Live:** Plugin Host **nie działa**; odtwarzanie = zamrożone WAV + WebAudio + MIDI do **zewnętrznych** aplikacji standalone (IAC / loopMIDI / virtual ports). StageSync pozostaje **Master Controller** (PC/Bank, routing, zones, clock) dla standalone.
   - **Freeze:** wejście w Live wymaga aktualnego renderu ścieżek z wtyczkami → WAV w assets ([ADR 0019](./0019-dual-engine-studio-live.md) §4).
3. **„Zero-Crash” ≠ „zero glitch”:** WebAudio nadal może dropnąć sample / zablokować audio thread przy złym grafie; polityka zabrania _process crash_ przez obcy kod wtyczek w procesie aplikacji, nie obiecuje bezbłędnego FOH.

### 2. Cztery filary docelowe (6.0+)

| #     | Filar                                                           | Istota                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Audio Input & Live Processing                                   | InputStrip; `getUserMedia` / `createMediaStreamSource`; mapowanie wejść fizycznych; niskolatencyjne bufory desktop; **multitrack recording + proste narzędzia edycji** (IN w 6.0 — §5)                                                                                                                                                                                                                                                  |
| **2** | StageSync Audio Suite                                           | Natywny DSP: Limiter, EQ, Bus Comp, Global Track Pitch (±12 sync z Chord AST + OSMD), Smart Stop fade, Phase Invert, Reverb, BPM Delay, Mono Auto-Splitter, Talkback Ducker, LUFS / True-Peak — tylko Worklet/WASM                                                                                                                                                                                                                      |
| **3** | Real-Time Automation Engine                                     | Lane’y pod ścieżkami; envelope’y; parametry send/DSP; wartości **wyłącznie z host Tick Engine** (SSOT — §3), aplikowane w grafie WebAudio klienta                                                                                                                                                                                                                                                                                       |
| **4** | MIDI Tracks + Standalone VSTi Controller (+ Plugin Host Studio) | Virtual MIDI + **MIDI Patch Matrix** (UI portów + mapowanie virtual bus); PC/CC / Bank / zones / transpose; StageSync = Master Controller zewnętrznych standalone (**must 6.0**). **Dodatkowo (Studio only):** opcjonalny sandboxed Plugin Host + Freeze pipeline — kontrakt trybów w [ADR 0019](./0019-dual-engine-studio-live.md); implementacja po `report-scope-6.0`. Wbudowane synthy WebAudio / SFZ = **Later (6.x+)**, OUT z 6.0 |

### 3. SSOT / Granica 0 — bez wyjątków

1. **Autorytet czasu** pozostaje na serwerze ([ADR 0002](./0002-timebase-ssot.md)). Klient **nie** staje się zegarem muzycznym dla seek / song change / MIDI clock OUT / automation / MIDI tracks.
2. **Wszelka automatyka i odczyt MIDI** (lane read points, PC/CC na song change, sync BPM Delay / Track Pitch do mapy tempa) **czyta host Tick Engine** — kanon pozycji = ticki SSOT. Lokalny `AudioContext.currentTime` = tylko render / scheduling między tickami, **nigdy** musical clock projektu.
3. **Render audio** może żyć w kliencie (jak dziś); pozycja clipów i envelope = od ticków / map SSOT. Offline Freeze (Plugin Host → WAV) = operacja Studio poza musical clock Live.
4. **ACL** ([ADR 0005](./0005-domain-axioms.md)): sample / ms / MediaStream tylko na krawędzi audio; MIDI device I/O nadal przez `apps/server` (nie w procesie Tauri — [ADR 0010](./0010-desktop-shell-tauri.md)). Plugin Host = osobny proces na krawędzi DSP.
5. Automation **lane data** = część projektu (Zod na krawędzi); **odtwarzanie** envelope = klient między tickami (jak playhead smoothing), bez osobnego „automation clock”.

### 4. Sekwencja wejścia (zablokowana PO)

**Aktualizacja PO (2026-07-31):** przed Pitch & FX wchodzą minory **treści** (ortogonalne do grafu audio) — fundament pod import timed lyrics i Karaoke. **Nie** otwierają Input / Suite / automation / recording w 5.x.

**Amend PO (2026-08-02):** sekwencja hero = **5.4 Syllables** (= dawny Content Model foundation + dawny 5.5 Ingest w jednym cutcie; schema V6 **nie** osobny hero) → **5.5 Pitch & FX** (było 5.6) → **6.0 Live Suite** (było Live Processing) → **6.1 Karaoke & Jukebox** (było 7.0 — **linia 7.0 nie istnieje**).

**Amend PO (2026-08-09):** **6.0** = Live Suite **+ Dual Engine** ([ADR 0019](./0019-dual-engine-studio-live.md)); Plugin Host sandbox + Freeze.

```
[5.3] Colors & Channels — multi-out HW + nazwane skóry
  → [5.4] Syllables — Lyrics AST (ticks) + migrator + widoczny UltraStar → Karaoke
  → [5.5] Pitch & FX — Track Pitch + expanded busses / send-return
  → [6.0] Live Suite + Dual Engine — Input, Automation, Standalone VSTi Controller
      (+ Audio Suite; STEM / mute lead; recording + proste edit; MIDI Patch Matrix;
         sandboxed Plugin Host Studio + Freeze gate — ADR 0019)
  → [6.1] Karaoke & Jukebox (/karaoke, /request, Gig vs Jukebox)
```

| Linia   | Hero                           | Zakres                                                                                                                   | Explicitly OUT                                                                                                            |
| ------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **5.3** | **Colors & Channels**          | Multi-out HW (`maxChannelCount` gate) + nazwane skóry                                                                    | InputStrip, Suite, automation, VSTi, recording                                                                            |
| **5.4** | **Syllables**                  | Schema V6 + Lyrics AST (ticks) + UltraStar → Karaoke (cut gdy Ingest widoczny)                                           | `/karaoke` TV, `/request`; osobny cut tylko za schema; Input/Suite/automation                                             |
| **5.5** | **Pitch & FX**                 | Track Pitch Shift + expanded busses / send-return FX (WebAudio)                                                          | Live input, VST in-process, automation lanes, recording                                                                   |
| **6.0** | **Live Suite** (+ Dual Engine) | Filary 1–4; STEM / mute lead; recording + proste edit; MIDI Patch Matrix; standalone VSTi; Plugin Host (Studio) + Freeze | In-process VST/AU/CLAP; aktywny Plugin Host w Live; wbudowane synthy WebAudio (→ 6.x+); Flex / Take Folders jako must 6.0 |
| **6.1** | **Karaoke & Jukebox**          | `/karaoke`, `/request`, Gig/Jukebox — [#824](https://github.com/Negatywistczny/stagesync/issues/824)                     | Cloud karaoke; zależność od 5.4–5.5 + 6.0 STEM/pitch                                                                      |

Szczegóły checklisty: [ROADMAP](../../ROADMAP.md), [TODO](../../TODO.md), [report-scope-5.4](../../standards/analysis/reports/current/report-scope-5.4.md). Implementacja filarów 6.0 = dopiero po osobnym scope report + akceptacji PO przed kodem.

### 5. Decyzje PO zamknięte

#### Sesja 2026-07-27 (+ amendy sekwencji)

| Temat                               | Decyzja                                                                                                                                                                                               |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status ADR                          | **Zaakceptowany**                                                                                                                                                                                     |
| Sekwencja                           | **5.3** → **5.4** Syllables → **5.5** Pitch & FX → **6.0** Live Suite → **6.1** Karaoke (PO amend 2026-08-02; 7.0 nie istnieje; treści przed Pitch)                                                   |
| Tick Engine                         | Automation + MIDI **zawsze** czytają host Tick Engine (SSOT); bez client musical clock                                                                                                                |
| **Recording**                       | **IN w 6.0** — wprowadzenie rejestracji z **prostymi narzędziami edycji** (tabela poniżej). Linia **5.x** nadal OUT ([ADR 0017](./0017-live-show-control-contracts.md) §5); major 6.0 otwiera zakres. |
| **MIDI Ports**                      | **IN w 6.0** — prosty panel UI: konfiguracja portów + mapowanie virtual bus (**MIDI Patch Matrix**)                                                                                                   |
| **Wbudowane synthy WebAudio / SFZ** | **Later (6.x+)** — **OUT z 6.0**. W 6.0 must = sterowanie standalone (PC/CC Routing) + opcjonalny Plugin Host Studio                                                                                  |
| Flex / Take Folders                 | Nadal **OUT** jako must 6.0 (osobna decyzja PO później); 6.0 = recording + proste edit, nie studio Takes/Flex                                                                                         |

#### Amend PO 2026-08-09 — Plugin Host + Dual Engine + granica „prostej edycji”

| Temat                      | Decyzja                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| Dual Engine                | SSOT trybów = [ADR 0019](./0019-dual-engine-studio-live.md)                              |
| Plugin Host                | Sandboxowany sidecar **IN** w 6.0 (Studio only); Freeze przed Live; **zakaz in-process** |
| Standalone VSTi Controller | Nadal **must 6.0** (nie zastąpiony przez Plugin Host)                                    |

##### Prosta edycja w 6.0 — IN

- Record arm / podstawowy zapis multitrack do assetów projektu
- Trim / split / move / duplicate klipów audio powstałych z rejestracji
- Fade / gain / mute / solo ścieżki (w granicach [ADR 0008](./0008-timeline-clip-editing.md) już obecnych lub otwartych w 5.x)
- Lock Lane ([ADR 0019](./0019-dual-engine-studio-live.md) §5)
- Freeze / render ścieżki z wtyczek → WAV (warunek Live — nie „bounce DAW” jako Join)

##### Prosta edycja — OUT jako must 6.0 (osobna decyzja PO później)

- Flex Time / time-stretching / warp
- Take Folders / Comping
- Join regionów w sensie DAW join
- Transient snap / Tab-to-transient jako część Flex

### 6. Explicitly OUT

- In-process VST/AU/CLAP (Node, Tauri Rust, WebView)
- **Aktywny** Plugin Host w trybie **Live** ([ADR 0019](./0019-dual-engine-studio-live.md))
- Ableton Link / zewnętrzny musical clock jako autorytet (nadal ACL; serwer SSOT)
- Obietnice Zero-Glitch HA / seamless plugin crash recovery poza izolacją procesu Plugin Host
- Wbudowane synthy WebAudio / SFZ w **6.0** (Later 6.x+)
- Studio Take Folders / Flex Time / Comping / DAW Join jako must 6.0
- Atrapy Out / FX / Input / Patch Matrix / Studio↔Live w UI przed runtime gate ([ADR 0011](./0011-ui-parity-behavior.md))
- Input / Suite / automation / VSTi / Plugin Host / recording w linii **5.x**

### 7. Residual (prawdziwie otwarte — nie domykać w kodzie „na zapas”)

1. Automation: tylko parametry Mixer/DSP, czy też clip gain / Forma?
2. Track Pitch (5.5): globalny vs per-track; szczegóły sync Chord AST + OSMD
3. Plugin Host IPC / packaging vs thin-shell [ADR 0010](./0010-desktop-shell-tauri.md) — kierunek sidecar **jest** decyzją; szczegóły implementacji = scope 6.0 (+ residual Dual Engine w [ADR 0019](./0019-dual-engine-studio-live.md) §7)
4. Hot-unplug wejść / wyjść i fail-safe (FOH): mute vs fold-to-Master — kontynuacja Q z [Recenzja Live FOH](../../standards/analysis/inspiracje/specyfikacje/Recenzja-Decyzji-Live-FOH-Audio.triage.md)
5. STEM / mute lead w 6.0: kontrakt Mixer vs osobne ścieżki assetów — needed dla Karaoke **6.1** ([#824](https://github.com/Negatywistczny/stagesync/issues/824))
6. Desktop low-latency WebAudio (preferencje bufora) vs natywny tor poza Plugin Host — nadal otwarte dla toru **bez** VST

### 8. Parity v4 (nie wymyślać wstecz)

v4 / parytet 5.0: Host MIDI I/O, clock, Program Change, odtwarzanie audio, Mixer — **bez** pełnego Live Input Suite, automation lanes DAW ani hosta VSTi. Multi-out HW i rozbudowany DSP to **ewolucja 5.3→6.0**, nie „parity gap” wobec 4.x. Nie oznaczać filarów 6.0 jako must parytetu v4.

## Konsekwencje

- [ROADMAP](../../ROADMAP.md) / [TODO](../../TODO.md): sekwencja **5.3 → 5.4 Syllables → 5.5 Pitch & FX → 6.0 Live Suite + Dual Engine → 6.1 Karaoke** zlinkowana do tego ADR + [ADR 0019](./0019-dual-engine-studio-live.md) (PO 2026-08-02 / 2026-08-09; **7.0 nie istnieje** w sekwencji audio); bez must blockerów 5.0 z filarów 6.0; treści nie otwierają Input/Suite/automation w 5.x.
- [ADR 0017](./0017-live-show-control-contracts.md) §5: historia **5.x OUT** bez zmiany; przy major **6.0** rejestracja + proste edit wracają **zgodnie z tym ADR** (supersedes „permanent” poza linią 5.x).
- [ADR 0019](./0019-dual-engine-studio-live.md): SSOT trybów Studio/Live i Freeze gate.
- [ARCHITECTURE](../ARCHITECTURE.md): wskaźnik do tego ADR przy mapie decyzji audio.
- CHANGELOG: **brak** wpisu za sam ADR / ROADMAP / TODO (changelog.mdc — docs deweloperskie).
- Inspiracje FOH ([Recenzja-Decyzji-Live-FOH-Audio](../../standards/analysis/inspiracje/specyfikacje/Recenzja-Decyzji-Live-FOH-Audio.triage.md)): zgodne — multi-out tylko przy `maxChannelCount`, DAG, zakaz atrap; ten ADR **nie** cofa tych bramek.

## Powiązane

- [ADR 0002](./0002-timebase-ssot.md), [0005](./0005-domain-axioms.md), [0008](./0008-timeline-clip-editing.md), [0010](./0010-desktop-shell-tauri.md), [0011](./0011-ui-parity-behavior.md), [0015](./0015-daw-reference-and-product-decisions.md), [0017](./0017-live-show-control-contracts.md), [0019](./0019-dual-engine-studio-live.md)
- Spec źródłowy (sesja PO / plan): Future Architecture Spec 6.0 (ten ADR = kanon audio w repo)
- Triage FOH / mixer: [`docs/analysis/inspiracje/specyfikacje/Recenzja-Decyzji-Live-FOH-Audio.triage.md`](../../standards/analysis/inspiracje/specyfikacje/Recenzja-Decyzji-Live-FOH-Audio.triage.md), `…/Specyfikacja-StageSync-dla-miksera-DAW.triage.md`
- Align report: [report-adr-dual-engine-vst-align.md](../../standards/analysis/reports/current/report-adr-dual-engine-vst-align.md)
