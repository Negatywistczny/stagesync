# StageSync — Roadmapa

Kierunek produktu (długoterminowy). **Bieżąca checklista:** [TODO.md](./TODO.md)
(tylko aktywny etap). Historia wydań: [CHANGELOG.md](../CHANGELOG.md).

## Etapy wydania

| Wersja | Hero | Done (kryterium zamknięcia) | Scope |
|--------|------|-----------------------------|-------|
| **5.0.0-alpha.3** | Pion treści w ticks: Forma + mapy + zapis + transport + sekcja | Create → Timeline → pencil → save → play → Admin „Sekcja” | [report-scope-alpha3](./analysis/reports/report-scope-alpha3.md) |
| **5.0.0-alpha.4** | Timeline layout + operacyjne domknięcie Formy | Track grid (nagłówek↔lane); eye per ślad; specjalne nad treścią; picker; inspector; mapy read-only | [report-scope-alpha4](./analysis/reports/report-scope-alpha4.md) — *audyt 2026-07-20: bramka zamknięta do `feat/timeline-track-grid`* |
| **5.0.0-alpha.5** | Client roles poza Formą/`drums` | Karaoke wired z transportem + kontekstem projektu | [report-scope-alpha5](./analysis/reports/report-scope-alpha5.md) |
| **5.0.0-alpha.6** | Admin Live Desk — setlista, scena, pliki | Import audio do projektu; metadata clipów; setlista; pliki w inspectorze | [report-scope-alpha6](./analysis/reports/report-scope-alpha6.md) |
| **5.0.0-alpha.7** | Edycja Timeline (Forma + lane’y treści) | Smart Tool; Forma move/resize/pencil drag; Tekst/Akordy/Cue (start); Tap/UG/Różdżka wg cut | [report-scope-alpha7](./analysis/reports/report-scope-alpha7.md) |
| **5.0.0-alpha.8** | Parity workflow 4.x | **Code freeze 2026-07-20** — engineering must + rebuild TE-P0/CD/chrome/Admin; **nie** β ([freeze](./analysis/reports/report-alpha8-code-freeze.md)); residual PO + CL-P0 → α9 | QA: [report-qa-signoff-alpha8](./analysis/reports/report-qa-signoff-alpha8.md) · [parity-blocker](./analysis/reports/report-parity-blocker-alpha8.md) |
| **5.0.0-alpha.9** | Migrator + dokończenie rebuild | **Wydane 2026-07-21** — Migrator M1–M9 ✓; Client CL-01/04/05 ✓; **PO smoke P8 green**; tag `v5.0.0-alpha.9` | [report-scope-alpha9](./analysis/reports/report-scope-alpha9.md) |
| **5.0.0-alpha.10** | Standalone desktop (β1 spike) | **Wydane 2026-07-21** — Tauri + Node sidecar; pierwszy `.dmg`/`.msi` standalone | [report-standalone-spike-beta1](./analysis/reports/report-standalone-spike-beta1.md) |
| **5.0.0-alpha.11** | Desktop shell polish | **Wydane 2026-07-21** — menu OS Widok, shell detect, draft updater pipeline; bramka G1–G10 (G6: α10→α11) | [report-beta-gate](./analysis/reports/report-beta-gate.md) |
| **5.0.0-alpha.12** | Domknięcie: OS menu Faza A + hotfixy shella | **Wydane 2026-07-21** — menu StageSync/Widok/Pomoc; sidecar fail-fast; Faza B+ → β1 | [TODO.md](./TODO.md) · [ADR 0010](./adr/0010-desktop-shell-tauri.md) |
| **5.0.0-alpha.13** | Hotfix: Windows sidecar `EISDIR` / `C:` | **Wydane 2026-07-21** — MSI: Node bez ścieżek `\\?\…` jako main module; spawn względny + cwd | [TODO.md](./TODO.md) · [DESKTOP.md](./DESKTOP.md) |
| **5.0.0-beta.1** | Host / dystrybucja | **Wydane 2026-07-21** — H1–H12 (α10–α13); residual (menu Faza B, G1–G10) → **must β2** (docs cut `5.0.0-beta.1.1`) | [report-scope-beta1](./analysis/reports/report-scope-beta1.md) |
| **5.0.0-beta.1.1** | Docs cut residual | **Wydane 2026-07-21** — residual β1 → must β2; scope report β2 | [TODO.md](./TODO.md) · [report-scope-beta2](./analysis/reports/report-scope-beta2.md) |
| **5.0.0-beta.2** | Audio + MIDI + menu B/C | **Wydane 2026-07-21** — Audio 0…N; MIDI serwera; menu Faza B+C; Countdown; updater darwin+windows; G1–G10 residual operatorski | [report-scope-beta2](./analysis/reports/report-scope-beta2.md) |
| **5.0.0** | **Overture** — stabilne wydanie + kompletny parytet v4 | **Wydane 2026-07-23** — tag `v5.0.0`; must A–E + Faza D + OSMD/migration/wand w kodzie; **G1–G10** residual operatorski (⬜ HW) | [report-scope-5.0.0](./analysis/reports/report-scope-5.0.0.md) · [TODO.md](./TODO.md) |
| **5.1.0** | **Launch & Mix** — Launcher + Mixer + narzędzia Timeline | **Wydane 2026-07-24** — tag `v5.1.0`; host Launcher (lokalny/LAN/remote); Mixer (Master\|Bus); menu narzędzi T + skróty | [CHANGELOG](../CHANGELOG.md) · [TODO.md](./TODO.md) · [ADR 0014](./adr/0014-desktop-launcher.md) |
| **5.2.0** | **Pocket Stage** — PIN, Safety Net, Sampler, bus→bus, Performer/Console, motyw hosta | **Wydane 2026-07-25** — tag `v5.2.0` | [CHANGELOG](../CHANGELOG.md) · [TODO.md](./TODO.md) · [spec-5.2+](./analysis/inspiracje/spec-5.2+/) |
| **5.3.0** | **Colors & Channels** — multi-out HW + nazwane skóry | **Wydane 2026-07-27** — tag `v5.3.0`; gate `maxChannelCount ≥ 4` | [CHANGELOG](../CHANGELOG.md) · [TODO.md](./TODO.md) · [ADR 0018](./adr/0018-future-audio-architecture.md) |
| **5.x** (po 5.3) | **Pitch & FX Busses** — Track Pitch + expanded busses / send-return | Przed major 6.0 | [TODO.md](./TODO.md) · [ADR 0018](./adr/0018-future-audio-architecture.md) |
| **6.0+** | Live Processing & Master Show Controller | Major: Input, Automation, Standalone VSTi Controller (+ Suite, recording + proste edit, MIDI Patch Matrix) | [ADR 0018](./adr/0018-future-audio-architecture.md) · [TODO.md](./TODO.md) |
| **5.3+ residual (ops)** | Auto-election, Offline delta, OAuth, mobile GUI… | Równolegle / Later — nie mylić z filarami 6.0 | [TODO.md](./TODO.md) · [spec-5.2+](./analysis/inspiracje/spec-5.2+/) |

### Zamknięte etapy (α3–β1)

Hero / kryterium done: **tabela powyżej**. Historia wydań: [CHANGELOG.md](../CHANGELOG.md).  
Scope reports: `docs/analysis/reports/report-scope-*` (+ freeze/parity α8, spike β1).  
Szczegółowe checklisty „orientacyjne” zamkniętych cutów usunięte po β2 — nie utrzymujemy ich jako aktywnego planu.

### Desktop OS menu (natywny menubar Tauri)

Mapa docelowa menu operatora. Implementacja warstwami; **bez** disabled „na zapas”. Akcje → `navigate` / istniejące commandy shella (SSOT w `apps/server`, nie MIDI w procesie Tauri).

| Faza | Top-level | Enabled (plan) | Etap |
|------|-----------|----------------|------|
| **A** | StageSync, Widok, Pomoc | O programie; aktualizacje; Quit; Admin/Timeline/Klient; zakładki Admina; fullscreen; docs/issues | **α12** (wydane) |
| **B** | + Plik, + Host | Open Recent; Zapisz (Timeline draft); status hosta / klienci WS / QR (gdy API); restart wg istniejącego API; Ustawienia… → Host | **β2** (wydane) |
| **C** | + Transport; ścieżki w Plik/Set | Play/Stop/next/prev przez serwer; Import audio (już Admin); MIDI I/O gdy serwer (nie w shellu) | **β2** (wydane) |
| **D** | pełna Edycja; zoom w Widok; rozbudowa Pomoc | Usuń; Zoom H; Skróty; Undo grey-out (PDF setlisty / archiwum / motyw — OUT jeśli nie API) | **5.0.0** (wydane w kodzie — [#460](https://github.com/Negatywistczny/stagesync/pull/460)) |

**OUT menu do czasu właściwego etapu:** Audio / MIDI / DMX settings w menubarze; Tap Tempo / Pre-count w menu; osobne top-level Setlista (Set zostaje w Admin / Faza B Host lub Plik). **MUTE ALL / PANIC** — must 5.0.0 (host/UI; menubar opcjonalny).


Propozycja pełnej struktury (referencja produktowa): StageSync · Plik · Edycja · Widok · Setlista · Transport · Host · Pomoc — realizowana przez fazy A→D, nie jednym PR.

### Beta 2 — zakres orientacyjny (audio + MIDI + menu B/C) — **wydane 2026-07-21**

Tag `v5.0.0-beta.2`. Scope: [report-scope-beta2.md](./analysis/reports/report-scope-beta2.md).

- **Audio 0…N** ([ADR 0008](./adr/0008-timeline-clip-editing.md)): clip na Timeline, sync transport (`ticksToMs`), trim/move, waveform peak/RMS, gain clip + fader track + mute clip/track; **bez** pencil, **bez** stretch poza plik
- MIDI I/O (clock / urządzenia po stronie **serwera**) — nie w Tauri ([ADR 0010](./adr/0010-desktop-shell-tauri.md))
- **Desktop OS menu — Faza B + C** (done)
- **G1–G10** — residual operatorski przy cutcie (⬜ na HW); must green przed / przy **5.0.0** ([report-beta-gate.md](./analysis/reports/report-beta-gate.md))
- **OUT β2:** fade/crossfade/loop-region; Faza D menu; Android native; MIDI w procesie Tauri; Flex Time

### 5.0.0 — **Overture** — **wydane 2026-07-23**

Tag `v5.0.0`. Scope: [report-scope-5.0.0.md](./analysis/reports/report-scope-5.0.0.md).  
**Polityka:** parytet **zachowania v4** kompletny — bez stubów
([ADR 0011 §1a](./adr/0011-ui-parity-behavior.md)).

**Dostarczone w kodzie:** polish UI; Timeline zoom/help/snap; Audio fade/loop; menu OS Faza D;
mobile/tablet; Client Score/OSMD; Preferencje; Live Desk; migrator; `docs/api` + CI + smoke.

**Residual operatorski (bez claim green):** **G1–G10** na HW — [report-beta-gate](./analysis/reports/report-beta-gate.md);
checklista w [TODO.md](./TODO.md).

### 5.1.0 — **Launch & Mix** — **wydane 2026-07-24**

Tag `v5.1.0`. Historia: [CHANGELOG.md](../CHANGELOG.md).

**Dostarczone:** Desktop Launcher ([ADR 0014](./adr/0014-desktop-launcher.md)); Mixer Timeline (strefy Audio / Busy / Click / Master, Out = Master\|Bus); menu narzędzi T + skróty / kontekst / dock; polish UI Timeline.

**Świadome OUT przy cutcie 5.1 → 5.2:** fizyczne Out 3–4 (HW) oraz epiki Pocket Stage (PIN, Safety Net, Sampler, bus→bus, Performer/Console, motyw) — dostarczone w **5.2.0** (Out 3–4 nadal residual). Przywróć / Sentry / polish UI → **5.2.1**.

### 5.2.0 — **Pocket Stage** — **wydane 2026-07-25**

Tag `v5.2.0`. Historia: [CHANGELOG.md](../CHANGELOG.md).

**Dostarczone:** Operator PIN; scenic theme lock + `STAGESYNC_THEME_DEFAULT`; Mixer bus→bus (anti-cycle); Cues Sampler; Safety Net Master/Spare (ręczne Przejmij); Performer/Console Offline-First (zip apply); MIDI PC channel; sideload APK z hosta.

**Świadome OUT / residual przy cutcie 5.2:** fizyczne Out 3–4 (HW) → **5.3**; Safety Net auto-election; Offline delta/CacheStorage; OAuth — [TODO.md](./TODO.md).

### Po 5.2.0 / residual 5.2.x

- **Cut `v5.2.1`:** Admin **Przywróć…** (`.bak` / ZIP); opcjonalny Sentry; polish Admin/Client (Host 2×2, Button chrome, Client header); usunięta scenic theme lock — lokalny motyw + `STAGESYNC_THEME_DEFAULT`. Historia: [CHANGELOG.md](../CHANGELOG.md).
- **Cut `v5.2.2`:** design system shared + launcher tokeny; polish Host/Client. Historia: [CHANGELOG.md](../CHANGELOG.md).
- **Cut `v5.2.3`:** lokalny host Console (NSD / Connect), Admin Host mobile (akordeon + górny pasek), a11y / Timeline dock. Historia: [CHANGELOG.md](../CHANGELOG.md).
- Dalsze patche **5.2.x** (do `v5.2.11`) — higiena / ops; historia: [CHANGELOG.md](../CHANGELOG.md).

### 5.3.0 — **Colors & Channels** — **wydane 2026-07-27**

Tag `v5.3.0`. Historia: [CHANGELOG.md](../CHANGELOG.md).

**Dostarczone:** Mixer multi-out HW (ChannelMerger N, CRUD patchy, track/bus/cue → `hw_out`) gdy `maxChannelCount ≥ 4` — przy stereo strefa HW Out ukryta (bez atrap); oczka widoczności stref Mixer; **5 nazwanych skór** (Booth Amber / Daylight / Midnight Cyan / Matrix Green / Neon Ember, `data-theme`); menu OS Plik/Edycja/Widok (Wygląd) rozszerzone o Timeline/Client.

**Nie otwiera:** Live Input / Audio Suite / automation / VSTi ([ADR 0018](./adr/0018-future-audio-architecture.md)).

**Residual ops (równolegle, nie hero):** HW smoke multi-out na ≥ 4 ch; G1–G10; Safety Net auto-election; Offline delta; GUI mobile — [TODO.md](./TODO.md).

### 5.x (po 5.3) — **Pitch & FX Busses**

- Track Pitch Shift (sync z Chord AST / OSMD — residual zakresu w [ADR 0018](./adr/0018-future-audio-architecture.md) §7)
- Expanded busses / send-return FX (nadal WebAudio; bez in-process VST)
- Cel: przygotowanie grafu pod Audio Suite 6.0 **bez** major i bez InputStrip / automation / recording

### 6.0+ — Live Processing & Master Show Controller

Kierunek architektoniczny: [ADR 0018](./adr/0018-future-audio-architecture.md) (**Zaakceptowany**).

| Filar | Zakres (docelowy) |
|-------|-------------------|
| 1 | Input & Live Processing (InputStrip, `getUserMedia`, mapowanie wejść) + **recording + proste narzędzia edycji** |
| 2 | StageSync Audio Suite (Worklet / WASM — Limiter, EQ, Comp, Pitch, Reverb, Delay, LUFS…) |
| 3 | Real-Time Automation (lane’y; **host Tick Engine** SSOT — bez client musical clock) |
| 4 | MIDI Tracks + **Standalone VSTi Controller** (PC/CC); **MIDI Patch Matrix**; wbudowane synthy WebAudio = Later 6.x+ |

**Zero-Crash:** native DSP w WebAudio/Worklet/WASM; ciężkie VST tylko jako zewnętrzne procesy MIDI. **SSOT czasu** bez zmian ([ADR 0002](./adr/0002-timebase-ssot.md)). Recording OUT w 5.x ([ADR 0017](./adr/0017-live-show-control-contracts.md) §5); **IN w 6.0** z prostymi narzędziami edycji ([ADR 0018](./adr/0018-future-audio-architecture.md) §5). Flex / Take Folders = nie must 6.0.

Specy design (nie SSOT): [inspiracje/spec-5.2+/](./analysis/inspiracje/spec-5.2+/).

## Zasady operacyjne

1. **Jeden aktywny etap w TODO** — po tagu `v5.0.0-alpha.N` pełne czyszczenie
   [TODO.md](./TODO.md) i wyłącznie sekcja alpha.N+1 (procedura w TODO).
2. **Scope report** `docs/analysis/reports/report-scope-alphaN.md` (lub `…-betaN`)
   tuż przed kodem danego etapu; ROADMAP trzyma hero + done na wysokim poziomie.
3. **Pull-forward** (alpha.4–7): drobne zadania z alpha.N+1 można wciągnąć do
   bieżącego TODO bez zmiany numeracji etapów w ROADMAP.
4. **Beta:** po green PO smoke (zachowanie v4) + α9 migrator → β1 (host) →
   β2 (audio/MIDI) → 5.0.0. **P8 green 2026-07-21** — tag β tylko na prośbę.
5. **Fundament** przypisany do etapu (α4, β1 host, β2 audio), nie osobny work bucket.
6. **Dług layoutu shelli** (α3): nie blokuje release α3; domknięcie w α4 must PR #1.
7. **Snap / edit grid** ([ADR 0007](./adr/0007-snap-grid.md)): faza 0 (API shared) — done; faza 1 → α4; UI picker → 5.0.0; drag/scissors → α7; Cmd-off → α7.
8. **Edycja klipów** ([ADR 0008](./adr/0008-timeline-clip-editing.md)): Forma α7; audio β2; fade/crossfade → 5.0.0.
9. **Desktop** ([ADR 0010](./adr/0010-desktop-shell-tauri.md)): Tauri w β1; audio/MIDI nie w procesie shella.
10. **Parity vs v4** ([ADR 0011](./adr/0011-ui-parity-behavior.md)): źródło = zachowanie w
    `STAGESYNC-APP-LEGACY`; **nie** clone chrome; inventarz wtórny; zakaz *engineering ready*
    bez PO smoke. **§1a:** funkcja v4 → must `5.0.0` (chyba że usunięta); **zakaz stubów**.
    Audyt: [report-v4-v5-parity-audit.md](./analysis/reports/report-v4-v5-parity-audit.md) ·
    UI-diff: [report-v4-v5-ui-diff-inventory.md](./analysis/reports/report-v4-v5-ui-diff-inventory.md).
11. **Audio 6.0+** ([ADR 0018](./adr/0018-future-audio-architecture.md)): Zero-Crash (Worklet/WASM vs
    VST external); sekwencja **5.3 Colors & Channels → 5.x Pitch & FX Busses → 6.0+** Input /
    Automation / Standalone VSTi; **bez** otwierania recording/VSTi w 5.x
    ([ADR 0017](./adr/0017-live-show-control-contracts.md) §5).

## Granica 0

Zmiana aksjomatów czasu (takt 1 / pre-roll ≤ 0 / ticks) lub izolacji folderów
projektów = nowa edycja, nie pozycja roadmapy „feature”. Zob.
[ADR 0005](./adr/0005-domain-axioms.md).
