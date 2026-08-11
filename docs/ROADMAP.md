# StageSync — Roadmapa

Kierunek produktu (długoterminowy). **Bieżąca checklista:** [TODO.md](./TODO.md)
(tylko aktywny etap). Historia wydań: [CHANGELOG.md](../CHANGELOG.md).

## Etapy wydania

Historia cutów spoza tabeli poniżej: wyłącznie [CHANGELOG.md](../CHANGELOG.md).
Aktywne scope/reporty: [`reports/current/`](./analysis/reports/current/). Checklist: [TODO.md](./TODO.md).

| Wersja           | Hero                                                                  | Done (kryterium zamknięcia)                                                                                                              | Scope                                                                                                                                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5.4.0**        | **Syllables** — Lyrics AST (ticks) + UltraStar → Karaoke              | **Wydane 2026-08-02** — tag `v5.4.0`; format V6 + import UltraStar + highlight Karaoke                                                   | [CHANGELOG](../CHANGELOG.md) · [report-scope-5.4](./analysis/reports/current/report-scope-5.4.md)                                                                                                                                                                                  |
| **5.4.1**        | Syllables patch — US+UG eksperymentalny, transport AlongMap…          | **Wydane 2026-08-03** — tag `v5.4.1`                                                                                                     | [CHANGELOG](../CHANGELOG.md)                                                                                                                                                                                                                                                       |
| **5.4.2**        | **Smart Tempo** — mapa tempa z audio (nie z sylab US)                 | **Wydane 2026-08-04** — tag `v5.4.2`; Import US+UG stable                                                                                | [CHANGELOG](../CHANGELOG.md)                                                                                                                                                                                                                                                       |
| **5.4.3**        | Smart Tempo polish — downbeat/faza, `/smart-tempo`                    | **Wydane 2026-08-05** — tag `v5.4.3`                                                                                                     | [CHANGELOG](../CHANGELOG.md)                                                                                                                                                                                                                                                       |
| **5.4.4**        | Smart Tempo accuracy + YouTube download resilience                    | **Wydane 2026-08-05** — tag `v5.4.4`                                                                                                     | [CHANGELOG](../CHANGELOG.md)                                                                                                                                                                                                                                                       |
| **5.4.5**        | Smart Tempo dev polish — Dev panel, benchmark history, chrome cleanup | **Wydane 2026-08-05** — tag `v5.4.5`                                                                                                     | [CHANGELOG](../CHANGELOG.md)                                                                                                                                                                                                                                                       |
| **5.5**          | **Pitch & FX** — Track Pitch + expanded send-return                   | Most do Live Suite 6.0; bez Input / automation / recording                                                                               | [TODO.md](./TODO.md) · [ADR 0018](./adr/0018-future-audio-architecture.md)                                                                                                                                                                                                         |
| **5.6**          | **Studio Shell & Multi-Window**                                       | Multi-Window Tauri, sync tła, pedały HID, eksport ZAiKS CSV                                                                              | [TODO.md](./TODO.md)                                                                                                                                                                                                                                                               |
| **5.7**          | **Extended Notation & Chords**                                        | Selection Filter OSMD, notacja akordów, 2-col Karaoke, Rehearsal Marks                                                                   | [TODO.md](./TODO.md)                                                                                                                                                                                                                                                               |
| **5.8**          | **Advanced Timeline Editing**                                         | Insert Silence / Delete Time, Nudge, Split, Find & Replace, Collect All                                                                  | [TODO.md](./TODO.md)                                                                                                                                                                                                                                                               |
| **6.0**          | **Live Suite** + Dual Engine                                          | Major: Input, Automation, Standalone VSTi; Plugin Host (Studio) + Freeze; Suite; recording; MIDI Patch Matrix; STEM (w tym split Demucs) | [ADR 0018](./adr/0018-future-audio-architecture.md) · [ADR 0019](./adr/0019-dual-engine-studio-live.md) · [#832](https://github.com/Negatywistczny/stagesync/issues/832) · [TODO.md](./TODO.md)                                                                                    |
| **6.1**          | **Karaoke & Jukebox**                                                 | Po 6.0: `/karaoke`, `/request`, Gig/Jukebox; zależność od Syllables **5.4**, Pitch **5.5**, STEM/pitch **6.0**                           | [#824](https://github.com/Negatywistczny/stagesync/issues/824) · [TODO.md](./TODO.md)                                                                                                                                                                                              |
| **6.2**          | **Pre-flight & Hardware Setup**                                       | Rig Manager, MIDI Learn, Tuner `/client`, Setlist Pre-flight                                                                             | [TODO.md](./TODO.md)                                                                                                                                                                                                                                                               |
| **6.3**          | **Live Show Automation & DMX**                                        | Track Delays (ms), warstwa DMX / Art-Net (UDP 30 Hz)                                                                                     | [TODO.md](./TODO.md)                                                                                                                                                                                                                                                               |
| **6.4**          | **Smart Ingest ACL**                                                  | Satellite/CLI ingest + `import-bundle`; core bez scrapingu zewnętrznego                                                                  | [#840](https://github.com/Negatywistczny/stagesync/issues/840) · [TODO.md](./TODO.md)                                                                                                                                                                                              |
| **7.0**          | **Integrated Notation Studio**                                        | Edycja MusicXML w drzewie + most MuseScore                                                                                               | [#837](https://github.com/Negatywistczny/stagesync/issues/837) · [TODO.md](./TODO.md)                                                                                                                                                                                              |
| **7.1**          | **Enterprise Rig & OSC**                                              | Podgląd MIDI/OSC, OSC Matrix & Zero-Glitch HA                                                                                            | [TODO.md](./TODO.md)                                                                                                                                                                                                                                                               |
| **7.2**          | **Studio Ecosystem**                                                  | Virtual Performers + Muse Sounds manager                                                                                                 | [#838](https://github.com/Negatywistczny/stagesync/issues/838) · [#839](https://github.com/Negatywistczny/stagesync/issues/839) · [TODO.md](./TODO.md)                                                                                                                             |
| **ops residual** | Auto-election, Offline delta, OAuth, mobile GUI, G1–G10…              | Równolegle / Later — nie mylić z filarami 6.0                                                                                            | [TODO.md](./TODO.md) · [beta-gate](./analysis/reports/current/report-beta-gate.md) · [Safety-Net](./analysis/inspiracje/specyfikacje/Safety-Net-dla-StageSync-v5.2.triage.md) · [Mobile](./analysis/inspiracje/specyfikacje/Specyfikacja-Klienta-Mobile-StageSync-v5.2+.triage.md) |

### 5.4.0 — **Syllables** — **wydane 2026-08-02**

Tag `v5.4.0`. Historia: [CHANGELOG.md](../CHANGELOG.md). Scope: [report-scope-5.4.md](./analysis/reports/current/report-scope-5.4.md).

**Dostarczone:** `formatVersion` 6 + migrator V5→V6; Lyrics AST (bloki na `tekst`); import UltraStar → ticks; Client Karaoke highlight bloku; UG/ChordPro; **Text-Anchor Bridging (US+UG)** — Forma/akordy na tickach wokalu + wizard Import US+UG.

**Residual 5.4.x / Later:** jakość mapy Smart Tempo (żywy groove / MIR Later) — [AST triage](./analysis/inspiracje/specyfikacje/Implementacja-Smart-Tempo-w-Antigravity.triage.md). MusicXML/MIDI jako siatka taktowa — Later. Bieżący trunk patch: pole `"version"` w root [`package.json`](../package.json).

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

### 5.5.0 — **Pitch & FX**

Hero: Track Pitch + expanded send-return; szybka organizacja miksu scenicznego, odsłuch realizatora i płynny transport.

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

### 6.0.0 — **Live Suite + Dual Engine: Studio vs Live** (MAJOR RELEASE)

Hero: Pancerna Scena i produkcyjne Studio — Live Suite z bezpiecznym podziałem trybów.

- Dwa tryby SSOT: **Live** (scena, PIN, bez edycji warstw) vs **Studio** (edycja / rejestracja) — [ADR 0019](./adr/0019-dual-engine-studio-live.md)
- Filary Live Suite: Input, Automation, Audio Suite, Standalone VSTi Controller, MIDI Patch Matrix, STEM / mute lead, recording + proste edit — [ADR 0018](./adr/0018-future-audio-architecture.md)
- Sandboxowany Plugin Host (sidecar) **tylko w Studio**; wejście w Live wymaga Freeze (render ścieżek z wtyczkami → WAV)
- Blokowanie warstw kłódką (Lock Lane w Studio; w Live edycja i tak wyłączona)
- Lokalny STEM split (Demucs / sidecar Python) w Studio → nowe ścieżki audio; Live dostaje wyłącznie zamrożone WAV — [#832](https://github.com/Negatywistczny/stagesync/issues/832)

### 6.1.0 — **Karaoke & Jukebox**

Hero: Ekosystem rozrywkowy w lokalnej sieci Wi-Fi — [#824](https://github.com/Negatywistczny/stagesync/issues/824).

Zależności: Syllables **5.4**, Pitch **5.5**, STEM/pitch **6.0**.

- Multi-role Lyrics AST (duety / backing); wybór roli w `/client`
- Publiczny ekran `/karaoke` (zero-chrome, QR / Up Next między utworami)
- Guest request `/request` (katalog LAN, moderacja w Adminie)
- Tryby setlisty: Gig (stała) vs Jukebox (kolejka na żywo) + auto-pilot

### 6.2.0 — **Pre-flight & Hardware Setup**

Hero: Pewność przed wejściem na scenę, uniwersalne mapowanie i wsparcie wykonawcy.

- Warstwa abstrakcji sprzętu MIDI (Rig Manager – aliasy portów)
- Tryb przypisywania kontrolerów (MIDI Learn)
- Tuner instrumentalny w widoku Performera (`/client`)
- Globalne nadpisania wysyłek sygnałów (Override Controls w Admin Host)
- Zbiorczy raport gotowości setlisty (Setlist Pre-flight Check)

### 6.3.0 — **Live Show Automation & DMX**

Hero: Pełna kontrola nad światłem i czasową mikro-synchronizacją.

- Kompensacja opóźnień na pojedynczych ścieżkach (Track Delays w ms)
- Dedykowana warstwa sterowania oświetleniem DMX / Art-Net (UDP 30 Hz na osi czasu)

### 6.4.0 — **Smart Ingest ACL**

Hero: Anti-Corruption Layer dla pobierania treści zewnętrznych — [#840](https://github.com/Negatywistczny/stagesync/issues/840).

- Satellite / CLI / wtyczka: YT / UG / USDB fetch + analiza poza rdzeniem
- Rdzeń StageSync przyjmuje gotową paczkę (`import-bundle`); walidacja Zod + zapis projektu
- Core bez scrapingu — zgodność z ADR 0005 (Granica 0)

### 7.0.0 — **Integrated Notation Studio** (MAJOR RELEASE)

Hero: Wbudowany, lekki edytor partytur nutowych MusicXML + most zewnętrzny.

- Podstawowa edycja i korekta nut (Studio Notation Edit bezpośrednio w drzewie XML)
- Most integracyjny MuseScore Studio (transport / 1-click push) — [#837](https://github.com/Negatywistczny/stagesync/issues/837)

### 7.1.0 — **Enterprise Rig & OSC**

Hero: Zaawansowany podgląd sygnałów, pełna diagnostyka i redundancja.

- Podgląd logów MIDI / OSC w czasie rzeczywistym z wirtualizacją
- Redundancja i integracja mikserów (OSC Matrix & Zero-Glitch HA Master/Spare 50ms heartbeat)

### 7.2.0 — **Studio Ecosystem**

Hero: Wirtualny zespół i menedżer brzmień w Trybie Studio (po Dual Engine / Plugin Host).

- Virtual Performers / Auto-Accompaniment na bazie Osi Czasu — [#838](https://github.com/Negatywistczny/stagesync/issues/838)
- Menedżer integracji brzmień Muse Sounds — [#839](https://github.com/Negatywistczny/stagesync/issues/839)
- Legal / ADR przed kodem (licencje zewnętrzne, Freeze pipeline)

## Zasady operacyjne

1. **Jeden aktywny etap w TODO** — tylko otwarte Must / Should / Later; zamknięte → [CHANGELOG](../CHANGELOG.md), potem usuń z TODO ([todo-hygiene](../.cursor/rules/todo-hygiene.mdc)).
2. **Scope report** przed kodem hero cutu (`docs/analysis/reports/current/report-scope-…`); ROADMAP trzyma hero + done na wysokim poziomie.
3. **Parity vs v4** ([ADR 0011](./adr/0011-ui-parity-behavior.md)): zachowanie w `STAGESYNC-APP-LEGACY`; **nie** clone chrome; **zakaz stubów**. Historia parytetu → [CHANGELOG.md](../CHANGELOG.md).
4. **Audio / Dual Engine 6.0+** ([ADR 0018](./adr/0018-future-audio-architecture.md), [ADR 0019](./adr/0019-dual-engine-studio-live.md)): sekwencja hero jak w tabeli (**Pitch & FX → Live Suite + Dual Engine → Karaoke & Jukebox**); **bez** recording/VSTi/Plugin Host w linii 5.x ([ADR 0017](./adr/0017-live-show-control-contracts.md) §5). Post-Karaoke minors: Pre-flight → DMX → Smart Ingest; potem Notation / OSC / Studio Ecosystem.
5. **G1–G10** — residual operatorski na HW; **bez claim green** bez dowodu ([report-beta-gate](./analysis/reports/current/report-beta-gate.md); [TODO](./TODO.md)).
