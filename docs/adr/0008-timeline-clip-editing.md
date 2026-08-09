# ADR 0008 — Edycja klipów Timeline (Forma, audio, Smart Tool)

- **Status:** Zaakceptowany
- **Data:** 2026-07-20
- **Podstawa:** synteza wymagań produktowych + wzorce z audytu Logic Pro (STAGESYNC-V5-PLAN)
- **Zaakceptowany dla:** `5.0.0-alpha.7` (Forma editing); audio → β2

## Kontekst

StageSync v5 to **narzędzie sceniczne z Timeline** — nie pełny DAW, ale docelowo
obsługuje **backingi audio** (0…N ścieżek per projekt), sekcje Formy, oraz lane’y
Tekst/Akordy/Cue. Pozycje klipów = **integer ticks** ([ADR 0002](./0002-timebase-ssot.md));
kwantyzacja edycji = [ADR 0007](./0007-snap-grid.md).

Alpha.3 dostarczyła **pencil click** na Formie (1 takt, overwrite + split sąsiadów).
Brakuje: drag move/resize, Smart Tool, audio clipów, spójnej polityki kolizji.

Pełna specyfikacja Logic Pro (overlap modes, Flex Time, MIDI recording, join bounce)
**nie** jest celem StageSync 5.x — to **Playback & Show Control**, nie DAW rejestracji.
Flex Time / time-stretching, nagrywanie wielościeżkowe, Take Folders, Join/Bounce =
**permanent OUT dla linii 5.x** ([ADR 0017](./0017-live-show-control-contracts.md) §5;
[ADR 0015](./0015-daw-reference-and-product-decisions.md)). Powrót tylko MAJOR + nowy ADR.

## Decyzja

### 1. Model produktowy (hybryda)

| Faza                          | Zakres audio / edycji                                                                                                                    |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **MVP sceniczny**             | import, clip na Timeline, sync z transportem, trim/move, gain/mute, prosty waveform                                                      |
| **Później w 5.x (gdy PO)**    | fade, crossfade, loop-region, overlap mode — **bez** Flex / Takes / recording / join bounce                                              |
| **Permanent OUT (linia 5.x)** | Flex Time / time-stretching, nagrywanie wielościeżkowe, Take Folders, Join/Bounce ([ADR 0017](./0017-live-show-control-contracts.md) §5) |

Clipy audio i MIDI (przyszłość) są **powiązane z projektem** (`data/projects/<id>/`),
nie z globalną biblioteką mediów ([ADR 0001](./0001-storage-layout.md)).

Liczba ścieżek audio (i kiedyś MIDI): **0…N** — brak twardego limitu w UI (jak Logic).

### 2. Polityka kolizji — jeden tryb na start

**Domyślny i jedyny tryb edycji geometrycznej:** **No Overlap** (w obrębie jednej ścieżki).

**Terminologia Logic:** ten tryb = Tracks Area Drag Mode „No Overlap”. Parametr
Inspectora „No Overlap” (Score / notacja) — **N/A** (brak Score Editor w StageSync).

| Operacja                            | Zachowanie                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Przeciągnięcie klipu na zajęty span | **Auto-trim** klipu leżącego pod spodem (Logic „No Overlap”); ewentualny split reszty |
| Resize brzegu                       | Docina sąsiada w punkcie styku                                                        |
| Delete                              | Usuwa klip; **luki pozostają** (brak Shuffle L/R)                                     |
| Pencil / insert (Forma)             | Overwrite spanu + split sąsiadów — jak α3 `pencilFormaClick`                          |

**OUT na start:** Overlap, X-Fade, Shuffle L/R (możliwe w przyszłości dla audio).

Kolizje **między różnymi ścieżkami** (audio 0…N) — dozwolone (niezależne lane’e).

### 3. Forma (sekcje) — narzędzia α7

| Gest       | Narzędzie       | Efekt                                               |
| ---------- | --------------- | --------------------------------------------------- |
| Click      | Pencil          | Nowa sekcja 1 takt @ snap (istniejące α3)           |
| Drag       | Pencil          | Nowa sekcja na zakres taktów (snap początek/koniec) |
| Click      | Pointer / Smart | Zaznaczenie; **Delete** usuwa clip                  |
| Drag body  | Pointer / Smart | Przesunięcie sekcji (no overlap)                    |
| Drag brzeg | Pointer / Smart | Zmiana `lengthTicks` (no overlap)                   |

Countdown (`kind: countdown`) — **zablokowany** do edycji geometrycznej (jak α3).

### 4. Audio — narzędzia β2

| Dozwolone                                     | Zakazane (MVP silnika)                                                                                                      |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Pointer / Smart: select, move, trim brzegów   | Rozciągnięcie `lengthTicks` **ponad** długość materiału (bez time-stretch)                                                  |
| Trim/move w granicach pliku źródłowego        | Automatyzacja gain/mute                                                                                                     |
| Gain clip, Mute clip, Mute track, Fader track |                                                                                                                             |
| **Pencil** na ścieżce audio                   | Klik w pustym → Import / File Browser i wstawienie klipu w **dokładnej** pozycji Timeline (jak Logic; implementacja → TODO) |

**Time-stretch / pitch:** poza silnikiem 5.x (**permanent OUT**) — odtwarzanie w **oryginalnym tempie**
pliku; pozycja na osi = `startTicks` + `trimIn`/`trimOut` względem pliku.

**Waveform:** statyczny podgląd **peak/RMS** (precompute przy imporcie lub on-demand) —
nie live FFT.

### 5. Mix — poziomy bez automatyzacji

| Kontrolka         | Zakres                               |
| ----------------- | ------------------------------------ |
| **Mute ścieżki**  | cały lane audio                      |
| **Mute klipu**    | pojedynczy region                    |
| **Gain klipu**    | region (np. Gain Tool w Smart zones) |
| **Fader ścieżki** | lane (dock lub inspector)            |

Brak krzywych automatyzacji w alpha/beta. Wartości persist w [`project.json`](../../apps/desktop/src-tauri/resources/sidecar/seed/seed-projects/00000000-0000-4000-8000-000000000001/project.json) (schema v3+).

### 6. Smart Tool

**Smart Tool** = uniwersalne narzędzie **obok** toolbara (pointer, pencil, eraser, …).

- Strefy geometryczne nad klipami (wzór Logic): góra/dół × brzeg/środek → select, move, trim;
  fade/crossfade **później** w górnych narożnikach audio.
- **Reguła współistnienia:** gdy aktywny **Pencil** — Forma (jak α3/α7) oraz
  ścieżka audio (import @ klik; ADR 0015); Smart Tool / Pointer przejmują resztę
  lane’ów i Formę gdy pencil nieaktywny.
- Logika hit-test i FSM **oddzielona** od renderu canvas (preview transakcyjny).

### 7. Snap ([ADR 0007](./0007-snap-grid.md) — uzupełnienie)

- Domyślnie **`bar`** (takt) dla Formy, map Tempo/Metrum/Tonacja i clipów audio.
- **Cmd/Ctrl przy drag** = chwilowe **`off`** (brak kwantyzacji) — jedyny modyfikator snap na start.
- Relative snap — **OUT**; rozważenie po 5.0.0.

### 8. Stan edycji i Undo

| Okres                            | Wzorzec                                                                    |
| -------------------------------- | -------------------------------------------------------------------------- |
| **Alpha (α4–α7)**                | **Draft** w React (`draftProject`) + **Zapisz / Odrzuć** → PUT             |
| **Gest drag**                    | Snapshot na pointerdown → preview w overlay → commit do draft na pointerup |
| **Pełny Undo/Redo** (stos sesji) | **α8** (done); utrzymanie w β2 przy audio                                  |

**Zakaz:** mutacja `draftProject` na każdy `pointermove` bez warstwy preview (antywzorzec DAW).

### 9. Chronologia implementacji (orientacyjna)

| Etap      | Zakres                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------- |
| **α4**    | Layout track grid; lane Audio **placeholder**; snap faza 1 (pencil)                                  |
| **α6**    | Import plików do folderu projektu; metadata; schema clip refs (bez silnika lub stub)                 |
| **α7**    | Forma: pencil drag, pointer move/resize, Smart Tool FSM, Delete; snap + Cmd-off                      |
| **β1**    | Docker + Tauri ([ADR 0010](./0010-desktop-shell-tauri.md)); stabilność hosta — **bez** silnika audio |
| **β2**    | Silnik audio; clip na Timeline; sync; trim/move; waveform; gain/mute/fader; MIDI I/O                 |
| **5.0.0** | fade, crossfade, loop-region; overlap mode; snap picker UI                                           |

Szczegóły checklist → [ROADMAP.md](../ROADMAP.md). Scope per etap → `report-scope-*.md`.

### 10. Permanent OUT (linia 5.x) vs odroczone

**Permanent OUT dla całej linii 5.x** ([ADR 0017](./0017-live-show-control-contracts.md) §5) —
zmiana tylko MAJOR + nowy ADR + decyzja PO:

- Flex Time / time-stretching (w tym transient snap / Tab-to-transient jako część Flex)
- Nagrywanie wielościeżkowe audio/MIDI
- Take Folders
- Join / Bounce regionów

Przy major **6.0**: rejestracja + **prosta edycja** wracają wg IN/OUT w [ADR 0018](./0018-future-audio-architecture.md) §5;
Dual Engine / Lock Lane = [ADR 0019](./0019-dual-engine-studio-live.md). Flex / Takes / Comping / DAW Join
**nie** są must 6.0.

**Odroczone w 5.x** (nie permanent OUT — osobna decyzja PO gdy wrócą):

- Overlap / X-Fade / Shuffle drag modes
- Fade / crossfade / loop-region (gdy jeszcze nie w produkcie)

Nadal poza zakresem implementacyjnym (nie backlog produktowy „nigdy”):

- Interval tree (wystarczy posortowana lista clipów per lane przy N < 100)
- Walidacja geometrii clipów na serwerze przy PUT (fail fast Zod shape only)

## Konsekwencje

- **ProjectSchema v3** ([ADR 0009](./0009-project-schema-v3.md)): refs plików α6; pola trim/gain/mute silnika → β2.
- Shared: helpery kolizji no-overlap (Forma + generyczne dla lane) — czyste funkcje, testy Vitest.
- [ui-shell-inventory.md](../ui/ui-shell-inventory.md): Smart Tool, Gain Tool, Mute Tool, fader ścieżki.
- Logic Pro (inspiracja, **nie** SSOT):
  [Logika-Edycji-Klipow-Logic-Pro.md](../analysis/inspiracje/referencje-daw/Logika-Edycji-Klipow-Logic-Pro.md)
  — referencja algorytmiczna; nie checklista implementacji / TODO.

## Powiązane ADR

- [0002](./0002-timebase-ssot.md) — ticks, tempoMap → ms na krawędzi audio
- [0003](./0003-ui-direction-booth.md) — Audio 0…N na Timeline
- [0005](./0005-domain-axioms.md) — ACL przy audio engine / migratorze
- [0007](./0007-snap-grid.md) — kwantyzacja; Cmd-off w §7 tego ADR
- [0015](./0015-daw-reference-and-product-decisions.md) — Logic-First (Timeline only) + decyzje PO
- [0017](./0017-live-show-control-contracts.md) — permanent OUT Flex/Takes/recording (5.x)
- [0018](./0018-future-audio-architecture.md) §5 — prosta edycja 6.0 (IN/OUT); [0019](./0019-dual-engine-studio-live.md) — Dual Engine / Lock Lane
