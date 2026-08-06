# StageSync — Roadmapa

Kierunek produktu (długoterminowy). **Bieżąca checklista:** [TODO.md](./TODO.md)
(tylko aktywny etap). Historia wydań: [CHANGELOG.md](../CHANGELOG.md).

## Etapy wydania

| Wersja | Hero | Done (kryterium zamknięcia) | Scope |
|--------|------|-----------------------------|-------|
| **5.0.0-alpha.3** | Pion treści w ticks: Forma + mapy + zapis + transport + sekcja | Create → Timeline → pencil → save → play → Admin „Sekcja” | [report-scope-alpha3](./analysis/reports/report-scope-alpha3.md) |
| **5.0.0-alpha.4** | Timeline layout + operacyjne domknięcie Formy | Track grid (nagłówek↔lane); eye per ślad; specjalne nad treścią; picker; inspector; mapy read-only | [report-scope-alpha4](./analysis/reports/report-scope-alpha4.md) |
| **5.0.0-alpha.5** | Client roles poza Formą/`drums` | Karaoke wired z transportem + kontekstem projektu | [report-scope-alpha5](./analysis/reports/report-scope-alpha5.md) |
| **5.0.0-alpha.6** | Admin Live Desk — setlista, scena, pliki | Import audio do projektu; metadata clipów; setlista; pliki w inspectorze | [report-scope-alpha6](./analysis/reports/report-scope-alpha6.md) |
| **5.0.0-alpha.7** | Edycja Timeline (Forma + lane’y treści) | Smart Tool; Forma move/resize/pencil drag; Tekst/Akordy/Cue (start); Tap/UG/Różdżka wg cut | [report-scope-alpha7](./analysis/reports/report-scope-alpha7.md) |
| **5.0.0-alpha.8** | Parity workflow 4.x | Code freeze 2026-07-20 — engineering must + rebuild; residual → α9 | [freeze](./analysis/reports/report-alpha8-code-freeze.md) · [QA](./analysis/reports/report-qa-signoff-alpha8.md) |
| **5.0.0-alpha.9** | Migrator + dokończenie rebuild | **Wydane** — Migrator M1–M9; Client CL-01/04/05; P8 green | [report-scope-alpha9](./analysis/reports/report-scope-alpha9.md) |
| **5.0.0-alpha.10** | Standalone desktop (β1 spike) | **Wydane** — Tauri + Node sidecar; pierwszy `.dmg`/`.msi` | [report-standalone-spike-beta1](./analysis/reports/report-standalone-spike-beta1.md) |
| **5.0.0-alpha.11** | Desktop shell polish | **Wydane** — menu OS Widok, shell detect, draft updater | [report-beta-gate](./analysis/reports/report-beta-gate.md) |
| **5.0.0-alpha.12** | OS menu Faza A + hotfixy shella | **Wydane** — StageSync/Widok/Pomoc; sidecar fail-fast | [ADR 0010](./adr/0010-desktop-shell-tauri.md) |
| **5.0.0-alpha.13** | Hotfix Windows sidecar `EISDIR` / `C:` | **Wydane** — MSI: Node bez `\\?\…` jako main module | [DESKTOP.md](./guides/DESKTOP.md) |
| **5.0.0-beta.1** | Host / dystrybucja | **Wydane** — H1–H12; residual → β2 | [report-scope-beta1](./analysis/reports/report-scope-beta1.md) |
| **5.0.0-beta.1.1** | Docs cut residual | **Wydane** — residual β1 → must β2 | [report-scope-beta2](./analysis/reports/report-scope-beta2.md) |
| **5.0.0-beta.2** | Audio + MIDI + menu B/C | **Wydane** — Audio 0…N; MIDI serwera; menu B+C; Countdown; updater | [report-scope-beta2](./analysis/reports/report-scope-beta2.md) |
| **5.0.0** | **Overture** — stabilne + parytet v4 | **Wydane 2026-07-23** — tag `v5.0.0`; G1–G10 residual operatorski (⬜ HW) | [report-scope-5.0.0](./analysis/reports/report-scope-5.0.0.md) |
| **5.1.0** | **Launch & Mix** — Launcher + Mixer + narzędzia Timeline | **Wydane 2026-07-24** — tag `v5.1.0` | [CHANGELOG](../CHANGELOG.md) · [ADR 0014](./adr/0014-desktop-launcher.md) |
| **5.2.0** | **Pocket Stage** — PIN, Safety Net, Sampler, bus→bus, Performer/Console | **Wydane 2026-07-25** — tag `v5.2.0` | [CHANGELOG](../CHANGELOG.md) · [spec-5.2+](./analysis/inspiracje/README.md) |
| **5.3.0** | **Colors & Channels** — multi-out HW + nazwane skóry | **Wydane 2026-07-27** — tag `v5.3.0`; gate `maxChannelCount ≥ 4` | [CHANGELOG](../CHANGELOG.md) · [ADR 0018](./adr/0018-future-audio-architecture.md) |
| **5.4.0** | **Syllables** — Lyrics AST (ticks) + UltraStar → Karaoke | **Wydane 2026-08-02** — tag `v5.4.0`; format V6 + import UltraStar + highlight Karaoke | [CHANGELOG](../CHANGELOG.md) · [report-scope-5.4](./analysis/reports/report-scope-5.4.md) |
| **5.4.1** | Syllables patch — US+UG eksperymentalny, transport AlongMap… | **Wydane 2026-08-03** — tag `v5.4.1` | [CHANGELOG](../CHANGELOG.md) |
| **5.4.2** | **Smart Tempo** — mapa tempa z audio (nie z sylab US) | **Wydane 2026-08-04** — tag `v5.4.2`; Import US+UG stable (etykieta „eksperymentalny" usunięta) | [CHANGELOG](../CHANGELOG.md) |
| **5.4.3** | Smart Tempo polish — downbeat/faza, `/smart-tempo` | **Wydane 2026-08-05** — tag `v5.4.3` | [CHANGELOG](../CHANGELOG.md) |
| **5.4.4** | Smart Tempo accuracy + YouTube download resilience | **Wydane 2026-08-05** — tag `v5.4.4` | [CHANGELOG](../CHANGELOG.md) |
| **5.4.5** | Smart Tempo dev polish — Dev panel, benchmark history, chrome cleanup | **Wydane 2026-08-05** — tag `v5.4.5` | [CHANGELOG](../CHANGELOG.md) |
| **5.5** | **Pitch & FX** — Track Pitch + expanded send-return | Most do Live Suite 6.0; bez Input / automation / recording | [TODO.md](./TODO.md) · [ADR 0018](./adr/0018-future-audio-architecture.md) |
| **6.0** | **Live Suite** | Major: Input, Automation, Standalone VSTi Controller (+ Suite, recording + proste edit, MIDI Patch Matrix, STEM / mute lead) | [ADR 0018](./adr/0018-future-audio-architecture.md) · [TODO.md](./TODO.md) |
| **6.1** | **Karaoke & Jukebox** | Po 6.0: `/karaoke`, `/request`, Gig/Jukebox; zależność od Syllables **5.4**, Pitch **5.5**, STEM/pitch **6.0** | [#824](https://github.com/Negatywistczny/stagesync/issues/824) · [TODO.md](./TODO.md) |
| **5.3+ residual (ops)** | Auto-election, Offline delta, OAuth, mobile GUI… | Równolegle / Later — nie mylić z filarami 6.0 | [TODO.md](./TODO.md) · [spec-5.2+](./analysis/inspiracje/README.md) |

Zamknięte cuty (α3–5.4): hero w tabeli; historia wydań w [CHANGELOG.md](../CHANGELOG.md);
scope reports w `docs/analysis/reports/`. Aktywny plan tylko poniżej + [TODO.md](./TODO.md).

### 5.4.0 — **Syllables** — **wydane 2026-08-02**

Tag `v5.4.0`. Historia: [CHANGELOG.md](../CHANGELOG.md). Scope: [report-scope-5.4.md](./analysis/reports/report-scope-5.4.md).

**Dostarczone:** `formatVersion` 6 + migrator V5→V6; Lyrics AST (bloki na `tekst`); import UltraStar → ticks; Client Karaoke highlight bloku; UG/ChordPro; **Text-Anchor Bridging (US+UG)** — Forma/akordy na tickach wokalu + wizard Import US+UG.

**Residual 5.4.x / Later:** Import US+UG mostek / higiena — [TODO.md](./TODO.md); jakość mapy Smart Tempo (żywy groove / MIR Later) — [AST triage](./analysis/inspiracje/spec-5.2+/Implementacja-Smart-Tempo-w-Antigravity.triage.md). MusicXML/MIDI jako siatka taktowa — Later.

### 5.4.1 — Syllables patch — **wydane 2026-08-03**

Tag `v5.4.1`. Import US+UG w UI jako **eksperymentalny** (sync MP3 przybliżony). Historia: [CHANGELOG.md](../CHANGELOG.md).

### 5.4.2 — Smart Tempo — **wydane 2026-08-04**

Tag `v5.4.2`. Historia: [CHANGELOG.md](../CHANGELOG.md).

**Dostarczone:** mapa tempa z **pliku audio** (wall-clock + Beat Mapper, Drift Gate); seed BPM z mediany IBI siatki (nie z peak ACF); metronom nieprzerwany przy przełączaniu zakładek; jawne anulowanie kliknięcia przy seeku (bez podwójnego kliknięcia); benchmark 3-tier ms + pasek postępu importu; sortowanie UG wg zgodności; 3-kolumnowy import audio z DnD; Import US+UG bez etykiety „eksperymentalny" — **stable**.

### 5.4.3 — Smart Tempo polish — **wydane 2026-08-05**

Tag `v5.4.3`. Historia: [CHANGELOG.md](../CHANGELOG.md). Downbeat/faza w siatce beatów; strona `/smart-tempo` w Adminie; BPM z analizy audio w układzie Beat 1 przy US+UG.

### 5.4.4 — Smart Tempo accuracy + YouTube — **wydane 2026-08-05**

Tag `v5.4.4`. Historia: [CHANGELOG.md](../CHANGELOG.md). Lepsze kotwiczenie downbeatu / kolce energii w siatce; wykres konturu tempa na `/smart-tempo`; wielostopniowy fallback yt-dlp przy imporcie YouTube.

### 5.4.5 — Smart Tempo dev polish — **wydane 2026-08-05**

Tag `v5.4.5`. Historia: [CHANGELOG.md](../CHANGELOG.md). Sekcja `Dev` w Adminie dla buildów deweloperskich; historia benchmarków Smart Tempo; odświeżony chrome shelli na desktopie; ujednolicona diagnostyka analizy.

### 5.5.0 — **Desk & Audio Polish**
Hero: Szybka organizacja miksu scenicznego, odsłuch realizatora i płynny transport.
- Solo / Mute Off for All (globalny przycisk resetujący wyciszenia/solo w Mikserze)
- Odsłuch podglądowy realizatora (Audition Window / PFL na dedykowane wyjście słuchawkowe)
- Kopiowanie właściwości klipów (Paste Properties: routing, gain, fade, wyjścia HW Out)
- Śledzenie trwających nut MIDI po skoku (Chase MIDI Notes po operacji Seek)
- Szybkie przełączanie / rozłączanie hostów w sieci LAN

### 5.6.0 — **Studio Shell & Multi-Window**
Hero: Ergonomia pracy na wielu monitorach, wygoda muzyków i raportowanie.
- Obsługa wielu okien na Desktopie (Multi-Window via Tauri: odpinanie Timeline/Mikser/Klient)
- Synchronizacja nieaktywnych okien i kart przeglądarki (Web Worker + performance.now)
- Obsługa pedałów Bluetooth (AirTurn / PageFlip / HID keydown debounced)
- Generowanie raportów odtworzeń dla ZAiKS (Setlist History CSV export)

### 5.7.0 — **Extended Notation & Chords**
Hero: Personalizacja widoków partytur i tekstu na ekranach wykonawców.
- Filtry widoczności w Partyturze (Selection Filter ukrywające warstwy w OSMD)
- Wybór notacji akordów (English / German / Solfege per klient)
- Dwukolumnowy układ tekstu (Two Column Layout w module Karaoke)
- Litery orientacyjne na osi czasu i partyturze (Rehearsal Marks [A], [B], [C])

### 5.8.0 — **Advanced Timeline Editing**
Hero: Szybkie i bezpieczne zarządzanie zawartością osi czasu.
- Globalne wstawianie ciszy i wycinanie czasu (Insert Silence / Delete Time na wszystkich warstwach)
- Szturchanie klipów i sylab z klawiatury (Nudge skróty Alt + Strzałki)
- Zaznaczanie ciągłe od kursora (Select All Following skrót Shift + F)
- Rozcinanie klipów pod playheadem (Split at Playhead skrót Cmd/Ctrl + S)
- Wyszukiwarka i zamiana fraz (Find & Replace dla tekstu i akordów)
- Pakowanie projektu i zbieranie zasobów (Collect All and Save do folderu assets/)

### 6.0.0 — **Dual Engine: Studio vs Live** (MAJOR RELEASE)
Hero: Bezpieczny podział na pancerną Scenę i produkcyjne Studio z obsługą VST.
- Dwa tryby pracy aplikacji – Live (Scena z blokadą PIN) vs Studio (Edycja)
- Wtyczki VST/AU z funkcją automatycznego "Freeze" (wymóg renderu do WAV przed wejściem w Live)
- Blokowanie warstw kłódką (Toggle Lock Lane przed przypadkową edycją)

### 6.1.0 — **Live Show Automation & DMX**
Hero: Pełna kontrola nad światłem i czasową mikro-synchronizacją.
- Kompensacja opóźnień na pojedynczych ścieżkach (Track Delays w ms)
- Dedykowana warstwa sterowania oświetleniem DMX / Art-Net (UDP 30 Hz na osi czasu)

### 6.2.0 — **Pre-flight & Hardware Setup**
Hero: Pewność przed wejściem na scenę, uniwersalne mapowanie i wsparcie wykonawcy.
- Warstwa abstrakcji sprzętu MIDI (Rig Manager – aliasy portów)
- Tryb przypisywania kontrolerów (MIDI Learn)
- Tuner instrumentalny w widoku Performera (`/client`)
- Globalne nadpisania wysyłek sygnałów (Override Controls w Admin Host)
- Zbiorczy raport gotowości setlisty (Setlist Pre-flight Check)

### 6.3.0 — **Karaoke & Jukebox**
Hero: Ekosystem rozrywkowy w lokalnej sieci Wi-Fi.
- Moduł publiczny LAN (`/karaoke` & `/request` z moderacją w Adminie)

### 7.0.0 — **Integrated Notation Studio** (MAJOR RELEASE)
Hero: Wbudowany, lekki edytor partytur nutowych MusicXML.
- Podstawowa edycja i korekta nut (Studio Notation Edit bezpośrednio w drzewie XML)

### 7.1.0 — **Enterprise Rig & OSC**
Hero: Zaawansowany podgląd sygnałów, pełna diagnostyka i redundancja.
- Podgląd logów MIDI / OSC w czasie rzeczywistym z wirtualizacją
- Redundancja i integracja mikserów (OSC Matrix & Zero-Glitch HA Master/Spare 50ms heartbeat)

## Zasady operacyjne

1. **Jeden aktywny etap w TODO** — tylko otwarte Must / Should / Later; zamknięte → [CHANGELOG](../CHANGELOG.md), potem usuń z TODO ([todo-hygiene](../.cursor/rules/todo-hygiene.mdc)).
2. **Scope report** przed kodem hero cutu (`docs/analysis/reports/report-scope-…`); ROADMAP trzyma hero + done na wysokim poziomie.
3. **Parity vs v4** ([ADR 0011](./adr/0011-ui-parity-behavior.md)): zachowanie w `STAGESYNC-APP-LEGACY`; **nie** clone chrome; **zakaz stubów**. Audyt: [parity](./analysis/reports/report-v4-v5-parity-audit.md) · [ui-diff](./analysis/reports/report-v4-v5-ui-diff-inventory.md).
4. **Audio 6.0+** ([ADR 0018](./adr/0018-future-audio-architecture.md)): sekwencja **5.5 Pitch & FX → 6.0 Live Suite → 6.1 Karaoke** (Syllables **5.4** wydane); **bez** recording/VSTi w 5.x ([ADR 0017](./adr/0017-live-show-control-contracts.md) §5).
5. **G1–G10** — residual operatorski na HW; **bez claim green** bez dowodu ([report-beta-gate](./analysis/reports/report-beta-gate.md); [TODO](./TODO.md)).

## Granica 0

Zmiana aksjomatów czasu (takt 1 / pre-roll ≤ 0 / ticks) lub izolacji folderów
projektów = nowa edycja, nie pozycja roadmapy „feature”. Zob.
[ADR 0005](./adr/0005-domain-axioms.md).
