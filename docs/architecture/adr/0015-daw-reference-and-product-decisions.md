# ADR 0015 — Referencja DAW (Logic) i stałe decyzje produktowe

- **Status:** Zaakceptowany
- **Data:** 2026-07-25
- **Etap:** po `5.2.0` (SSOT decyzji PO; Pocket Stage dostarczone; residual w [TODO](../../TODO.md))
- **Uzupełnia:** [ADR 0011](./0011-ui-parity-behavior.md) (parity / zakaz stubów), [ADR 0008](./0008-timeline-clip-editing.md) (edycja), [ADR 0002](./0002-timebase-ssot.md) (MIDI / transport)

## Kontekst

Po fali Q&A PO pojawiły się **trwałe decyzje produktowe** oraz wiele pozycji **backlogu**. Trzeba je rozdzielić w SSOT: decyzja ≠ „zaparkowane w TODO”. Backlog bez PO nie staje się decyzją „OUT na zawsze”.

## Decyzja

### 0. Higiena: backlog ≠ decyzja

- **Decyzja produktowa** = stabilny kontrakt (ADR / konstytucja / jawny OUT).
- **Backlog** = praca do zrobienia (TODO / issue). Sam wpis w TODO **nie** jest decyzją OUT.
- Nie przenoś deferrali z triage / starych docs do „permanent OUT” bez PO.

### 1. Reguła referencji Logic Pro _(amend 2026-07-26 — [ADR 0017](./0017-live-show-control-contracts.md) §4)_

W sytuacjach wątpliwości UX i logiki **edycji na Timeline** (klipy, narzędzia, geometria, import): **Logic Pro jest pierwszą referencją** sprawdzonych mechanik DAW (nie pixel-clone chrome).

**Zakres Logic-First:** wyłącznie Timeline / clip / tools. **Poza zakresem Logic** (własna domena sceniczna StageSync): sieć LAN, Safety Net, mobile (Performer/Console), PIN operatora, Panic, Apply UI Offline-First, pozycjonowanie lokalnego hosta.

**Kolejność konfliktów:**

1. SSOT czasu + zakaz stubów ([ADR 0002](./0002-timebase-ssot.md), [ADR 0011](./0011-ui-parity-behavior.md))
2. Kontrakty Live Show Control ([ADR 0017](./0017-live-show-control-contracts.md)) — gdy temat należy do domeny scenicznej
3. Logic Pro (gdy temat = edycja Timeline i StageSync nie ma własnej specyfikacji)
4. Inne DAW / inspiracje — wtórne

### 2. Zakres UI

| Decyzja                    | Treść                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Brak funkcji = brak UI     | Potwierdzenie [ADR 0011 §1a](./0011-ui-parity-behavior.md) — bez stubów / `disabled` „na zapas”    |
| Multi-out (Out 3–4+)       | **Oficjalna decyzja: wprowadzić** (klasyczny DAW). Implementacja = backlog; **nie** „limit bez PO” |
| Motywy / auth / multi-user | Backlog — **nie** wymyślać permanent OUT bez PO                                                    |

### 3. Mixer / audio (stałe)

| Temat                                             | Decyzja                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| True Balance centrum unity / +3 dB mono↔stereo    | Zamierzone OK                                                           |
| Dual-mono equal-power downmix (+3 dB skorelowane) | Zamierzone OK                                                           |
| Track solo vs bus solo                            | **Track solo wygrywa**                                                  |
| Click w Mixerze                                   | Na start proste Mute/Volume jako Cue; **interfejs otwarty** na ewolucję |
| Mixer Zoom                                        | Tylko skala UI — **bez** niezależnego Zoom H/V                          |
| Safari scratch (WebAudio)                         | Empty-buffer release po `stop()` (WA-MEM-02 fixed)                      |

### 4. Edycja audio / Timeline

| Temat                                                   | Decyzja                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pencil na ścieżce **audio**                             | Jak Logic: klik w pustym + Pencil → Import → wstawienie w miejscu kliknięcia (**wdrożone**)                                                                                                                                                                                                                                      |
| No Overlap only; bez time-stretch w MVP                 | Bez zmiany względem [ADR 0008](./0008-timeline-clip-editing.md)                                                                                                                                                                                                                                                                  |
| Flex Time / MIDI recording / Take Folders / join bounce | **Permanent OUT dla całej linii 5.x** ([ADR 0017](./0017-live-show-control-contracts.md) §5). Powrót rejestracji + proste edit = major **6.0** — IN/OUT wg [ADR 0018](./0018-future-audio-architecture.md) §5; Dual Engine = [ADR 0019](./0019-dual-engine-studio-live.md); Flex / Takes / Comping / DAW Join nadal nie must 6.0 |
| **Smart Tempo (5.4.2)**                                 | Mapa tempa **podąża za nagraniem** (wall-clock + Beat Mapper) — **nie** time-stretch / warp audio do siatki (to nie Flex Time). Import US+UG: audio = ground truth na krawędzi importu; ticks SSOT bez zmian ([ADR 0002](./0002-timebase-ssot.md))                                                                               |
| Locator vs playhead                                     | Osobne pojęcia (jak Logic); kolory: locator `primary`, playhead `info`; scrub/seek = komenda do serwera (SSOT)                                                                                                                                                                                                                   |

### 5. MIDI / transport

| Temat                           | Decyzja                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| MIDI I/O + clock                | Tylko serwer ([ADR 0002](./0002-timebase-ssot.md))                                                                                             |
| Playhead klienta                | Wygładzanie wyłącznie między tickami serwera                                                                                                   |
| Kanał Program Change IN/OUT     | Filtr IN (Omni = `null` albo pojedynczy kanał) + kanał OUT w `MidiHostConfig` + Admin Host — **do wdrożenia teraz** (ochrona przed spill Omni) |
| Flood PC                        | **Debounce 50 ms + latest-wins**; **bez** osobnego Hz-limitera                                                                                 |
| Ujemne ticki                    | Na krawędzi MIDI I/O mapowane do **0** (SPP / clock)                                                                                           |
| Encore poza setlistą            | `resolveSetlistNext` → `null` + hard **STOP**                                                                                                  |
| FOH Seek/Pause vs late disk I/O | FOH wygrywa (already)                                                                                                                          |
| Wsteczne / stale ticki WS       | Cichy drop w UI gdy `serverTimeMs` / monotonic seq niższy niż ostatni przyjęty                                                                 |
| H-01 throttle displayTicks      | Dopiero **po** profilerze @ 120 Hz                                                                                                             |

### 6. Priorytet / bramki (polityka operacyjna)

- Po 5.1.x **Must** = wyłącznie residual **G1–G10** operatorskie (bez nowych feature w Must).
- G2 skip; G3 re-verify HW; G7–G9 Docker deferred — OK jako ops w TODO.
- Should / higiena **nie** blokuje planowania feature.

### 7. Mobile / Backup / shell / packaging

| Temat                                        | Decyzja                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile PWA + lekki Android + `.apk` bez Play | **Zatwierdzony kierunek architektoniczny**; produkty: **Performer** (`apps/performer` → `/client`, read-only) i **Console** (`apps/console` = pełny odpowiednik desktopu: Admin + Timeline + Client + docelowo lokalny host); szczegóły shella → [ADR 0016](./0016-android-performer-console.md)          |
| Console + lokalny host (Android)             | **IN jako booth awaryjny/terenowy** ([ADR 0017](./0017-live-show-control-contracts.md) §1). Console nadal niesie lokalny host w APK, ale **domyślna ścieżka UI = LAN** do hosta desktop; lokalny host = CTA wtórne. Pełny SPA (Admin + Timeline + Client) bez zmiany. Thin-shell-only = nadal superseded. |
| Performer + lokalny host / Admin             | **OUT** — Performer zawsze Client-only (read-only); bez sidecara, bez edycji Timeline/Mixer                                                                                                                                                                                                               |
| Backup Przywróć                              | **IN:** Admin → Przywróć… — `.bak` (pojedynczy / bulk / katalog) oraz archiwum `.zip` (+ PIN gdy włączony)                                                                                                                                                                                                |
| Auto-update bez operatora                    | **Permanentnie NIE** na scenie — zawsze akcja człowieka                                                                                                                                                                                                                                                   |
| Pakiet projektu                              | MVP = `.stagesync.json` (na teraz)                                                                                                                                                                                                                                                                        |
| Menubar OS                                   | **OUT:** ustawienia Audio/MIDI/DMX, Tap Tempo/Pre-count, top-level Setlista (sterowanie w Admin); lekki tray OK                                                                                                                                                                                           |
| git-apply / „Zaktualizuj teraz”              | **Permanentnie OUT**                                                                                                                                                                                                                                                                                      |

## Konsekwencje

- Konstytucja wskazuje ten ADR (reguła Logic + backlog ≠ decyzja); zakres Logic zawężony — [ADR 0017](./0017-live-show-control-contracts.md).
- ADR 0008: Flex/Takes/recording/join bounce = **permanent OUT 5.x** (nie „później wg Logic”).
- TODO: Must = G1–G10 HW + HW smoke multi-out; multi-out + skóry = shipped w **5.3.0**;
  H-01 / Offline delta = Later; MIDI PC kanały = shipped w 5.2.0;
  egzekucja kontraktów 0017 = shipped w 5.2.x.
- CHANGELOG tylko przy zmianach widocznych w produkcie — nie za sam ADR.

## Powiązane

- [ADR 0002](./0002-timebase-ssot.md), [0008](./0008-timeline-clip-editing.md), [0010](./0010-desktop-shell-tauri.md), [0011](./0011-ui-parity-behavior.md)
- [ADR 0004](./0004-updates-docker.md) — aktualizacje (bez auto bez operatora)
- [ADR 0016](./0016-android-performer-console.md), [ADR 0017](./0017-live-show-control-contracts.md) — Live Show Control / mobile
- [ADR 0018](./0018-future-audio-architecture.md) §5 — prosta edycja 6.0; [ADR 0019](./0019-dual-engine-studio-live.md) — Dual Engine
