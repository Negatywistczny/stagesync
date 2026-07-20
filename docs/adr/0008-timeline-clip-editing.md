# ADR 0008 — Edycja klipów Timeline (Forma, audio, Smart Tool)

- **Status:** Zaakceptowany
- **Data:** 2026-07-20
- **Podstawa:** synteza wymagań produktowych + wzorce z audytu Logic Pro (STAGESYNC-V5-PLAN)
- **Zaakceptowany dla:** `5.0.0-alpha.7` (Forma editing); audio → β1

## Kontekst

StageSync v5 to **narzędzie sceniczne z Timeline** — nie pełny DAW, ale docelowo
obsługuje **backingi audio** (0…N ścieżek per projekt), sekcje Formy, oraz lane’y
Tekst/Akordy/Cue. Pozycje klipów = **integer ticks** ([ADR 0002](./0002-timebase-ssot.md));
kwantyzacja edycji = [ADR 0007](./0007-snap-grid.md).

Alpha.3 dostarczyła **pencil click** na Formie (1 takt, overwrite + split sąsiadów).
Brakuje: drag move/resize, Smart Tool, audio clipów, spójnej polityki kolizji.

Pełna specyfikacja Logic Pro (overlap modes, Flex Time, MIDI recording, join bounce)
**nie** jest celem — wybieramy podzbiór zgodny z workflow show + backingi.

## Decyzja

### 1. Model produktowy (hybryda)

| Faza | Zakres audio / edycji |
|------|------------------------|
| **MVP sceniczny** | import, clip na Timeline, sync z transportem, trim/move, gain/mute, prosty waveform |
| **Później (β.x / 5.0.0)** | fade, crossfade, loop-region, overlap mode, time-stretch zaawansowany |
| **OUT** | Flex Time, transient editing, MIDI recording / Take Folders, join audio bounce |

Clipy audio i MIDI (przyszłość) są **powiązane z projektem** (`data/projects/<id>/`),
nie z globalną biblioteką mediów ([ADR 0001](./0001-storage-layout.md)).

Liczba ścieżek audio (i kiedyś MIDI): **0…N** — brak twardego limitu w UI (jak Logic).

### 2. Polityka kolizji — jeden tryb na start

**Domyślny i jedyny tryb edycji geometrycznej:** **No Overlap** (w obrębie jednej ścieżki).

| Operacja | Zachowanie |
|----------|------------|
| Przeciągnięcie klipu na zajęty span | **Auto-trim** klipu leżącego pod spodem (Logic „No Overlap”); ewentualny split reszty |
| Resize brzegu | Docina sąsiada w punkcie styku |
| Delete | Usuwa klip; **luki pozostają** (brak Shuffle L/R) |
| Pencil / insert (Forma) | Overwrite spanu + split sąsiadów — jak α3 `pencilFormaClick` |

**OUT na start:** Overlap, X-Fade, Shuffle L/R (możliwe w przyszłości dla audio).

Kolizje **między różnymi ścieżkami** (audio 0…N) — dozwolone (niezależne lane’e).

### 3. Forma (sekcje) — narzędzia α7

| Gest | Narzędzie | Efekt |
|------|-----------|-------|
| Click | Pencil | Nowa sekcja 1 takt @ snap (istniejące α3) |
| Drag | Pencil | Nowa sekcja na zakres taktów (snap początek/koniec) |
| Click | Pointer / Smart | Zaznaczenie; **Delete** usuwa clip |
| Drag body | Pointer / Smart | Przesunięcie sekcji (no overlap) |
| Drag brzeg | Pointer / Smart | Zmiana `lengthTicks` (no overlap) |

Countdown (`kind: countdown`) — **zablokowany** do edycji geometrycznej (jak α3).

### 4. Audio — narzędzia β1

| Dozwolone | Zakazane |
|-----------|----------|
| Pointer / Smart: select, move, trim brzegów | **Pencil** na ścieżce audio |
| Trim/move w granicach pliku źródłowego | Rozciągnięcie `lengthTicks` **ponad** długość materiału (bez time-stretch) |
| Gain clip, Mute clip, Mute track, Fader track | Automatyzacja gain/mute |

**Time-stretch / pitch:** OUT — odtwarzanie w **oryginalnym tempie** pliku; pozycja na
osi = `startTicks` + `trimIn`/`trimOut` względem pliku. Zaawansowany stretch → przyszłość.

**Waveform:** statyczny podgląd **peak/RMS** (precompute przy imporcie lub on-demand) —
nie live FFT.

### 5. Mix — poziomy bez automatyzacji

| Kontrolka | Zakres |
|-----------|--------|
| **Mute ścieżki** | cały lane audio |
| **Mute klipu** | pojedynczy region |
| **Gain klipu** | region (np. Gain Tool w Smart zones) |
| **Fader ścieżki** | lane (dock lub inspector) |

Brak krzywych automatyzacji w alpha/beta. Wartości persist w `project.json` (schema v3+).

### 6. Smart Tool

**Smart Tool** = uniwersalne narzędzie **obok** toolbara (pointer, pencil, eraser, …).

- Strefy geometryczne nad klipami (wzór Logic): góra/dół × brzeg/środek → select, move, trim;
  fade/crossfade **później** w górnych narożnikach audio.
- **Reguła współistnienia:** gdy aktywny **Pencil** — obsługuje wyłącznie Formę;
  Smart Tool / Pointer przejmują resztę lane’ów i Formę gdy pencil nieaktywny.
- Logika hit-test i FSM **oddzielona** od renderu canvas (preview transakcyjny).

### 7. Snap ([ADR 0007](./0007-snap-grid.md) — uzupełnienie)

- Domyślnie **`bar`** (takt) dla Formy, map Tempo/Metrum/Tonacja i clipów audio.
- **Cmd/Ctrl przy drag** = chwilowe **`off`** (brak kwantyzacji) — jedyny modyfikator snap na start.
- Relative snap — **OUT**; rozważenie po 5.0.0.

### 8. Stan edycji i Undo

| Okres | Wzorzec |
|-------|---------|
| **Alpha (α4–α7)** | **Draft** w React (`draftProject`) + **Zapisz / Odrzuć** → PUT |
| **Gest drag** | Snapshot na pointerdown → preview w overlay → commit do draft na pointerup |
| **Pełny Undo/Redo** (stos sesji) | **β1 lub 5.0.0** — nie blocker α7 |

**Zakaz:** mutacja `draftProject` na każdy `pointermove` bez warstwy preview (antywzorzec DAW).

### 9. Chronologia implementacji (orientacyjna)

| Etap | Zakres |
|------|--------|
| **α4** | Layout track grid; lane Audio **placeholder**; snap faza 1 (pencil) |
| **α6** | Import plików do folderu projektu; metadata; schema clip refs (bez silnika lub stub) |
| **α7** | Forma: pencil drag, pointer move/resize, Smart Tool FSM, Delete; snap + Cmd-off |
| **β1** | Silnik audio; clip na Timeline; sync; trim/move; waveform; gain/mute/fader |
| **5.0.0 / β.x** | fade, crossfade, loop-region; overlap mode; snap picker UI; Undo/Redo opcjonalnie |

Szczegóły checklist → [ROADMAP.md](../ROADMAP.md). Scope per alpha → `report-scope-alphaN.md`.

### 10. Poza zakresem (jawnie OUT)

- Flex Time, transient snap, Tab-to-transient
- Time-stretch audio (β1)
- Overlap / X-Fade / Shuffle drag modes (do czasu osobnej decyzji)
- MIDI I/O i nagrywanie nakładające się regionów
- Join regions (audio bounce)
- Interval tree (wystarczy posortowana lista clipów per lane przy N < 100)
- Walidacja geometrii clipów na serwerze przy PUT (fail fast Zod shape only)

## Konsekwencje

- Nowy **ProjectSchema v3** (β1): `audioTracks[]`, clipy z `fileRef`, trim, gain, mute — osobny PR / ADR rozszerzenia schema gdy implementacja.
- Shared: helpery kolizji no-overlap (Forma + generyczne dla lane) — czyste funkcje, testy Vitest.
- [ui-shell-inventory.md](../ui-shell-inventory.md): Smart Tool, Gain Tool, Mute Tool, fader ścieżki.
- Logic Pro spec (STAGESYNC-V5-PLAN): referencja algorytmiczna, nie checklista implementacji.

## Powiązane ADR

- [0002](./0002-timebase-ssot.md) — ticks, tempoMap → ms na krawędzi audio
- [0003](./0003-ui-direction-booth.md) — Audio 0…N na Timeline
- [0005](./0005-domain-axioms.md) — ACL przy audio engine / migratorze
- [0007](./0007-snap-grid.md) — kwantyzacja; Cmd-off w §7 tego ADR
