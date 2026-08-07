# StageSync v5 (Overture) — Skonsolidowane Podsumowanie Projektu dla Modelu LLM

Niniejszy dokument stanowi kompletne, techniczne i domenowe podsumowanie systemu **StageSync v5 (Overture)**, przygotowane specjalnie jako kontekst wprowadzający (system prompt / reference guide) dla modeli LLM pracujących nad tym repozytorium.

---

## 1. Czym jest StageSync?

**StageSync** to specjalistyczny system estradowy, kontroler pokazów na żywo (Live Show Control) oraz uproszczona stacja robocza (DAW-like playback engine). Służy do precyzyjnej synchronizacji audio, komunikatów MIDI (Program Change, Control Change, Clock), partytur muzycznych (OSMD/MusicXML) oraz tekstów (Karaoke, chords, teleprompter) podczas koncertów i eventów na żywo.

System działa w architekturze **monorepo** opartej o pnpm i turborepo.

---

## 2. Architektura Monorepo i Pace Layers

Projekt podzielony jest na precyzyjnie odizolowane warstwy logiczne (zgodnie z zasadą Pace Layering i prawem "Granicy 0"):

```
stagesync/
├── apps/
│   ├── server/          # Główny silnik (Express, Node 22) - transport SSOT, API, persystencja
│   ├── web/             # Aplikacja frontendowa (Vite + React) - Admin Shell, Client Shell, Timeline
│   ├── desktop/         # Shell desktopowy (Tauri + Node.js Sidecar) - Launcher & Menu OS (Faza D)
│   ├── performer/       # Android App (Kotlin WebView) -> widok /client
│   └── console/         # Android App (Kotlin WebView) -> pełne SPA i lokalny host (Faza 4 IN)
├── packages/
│   ├── shared/          # Domenowy Core (TypeScript) - czyste schematy Zod, czysty czas, bez DOM/Node FS
│   ├── ui/              # Design System (React) - tokeny CSS, bazowy button, zero logiki biznesowej
│   └── eslint-config/   # Reguły statycznej analizy (w tym acl.js)
└── data/                # Katalog runtime (izolowane podfoldery projektów, biblioteki, logi)
```

### Reguły Granic Monorepo (Strict Rules):
1. **Zależności do wewnątrz:** Kod frontendowy i backendowy importuje `@stagesync/shared`.
2. **Zakaz importu w górę:** `@stagesync/shared` jest czystym pakietem TypeScript. Nie może importować niczego z Node.js (FS) ani z przeglądarki (DOM).
3. **Purity pakietu UI:** `@packages/ui` zawiera wyłącznie komponenty prezentacyjne i tokeny. Nie może importować logiki biznesowej, routera ani kontekstów transportu.
4. **Izolacja UI:** Aplikacja kliencka nie importuje bezpośrednio kodu serwera. Cała komunikacja odbywa się przez REST API i WebSockets.

---

## 3. Domenowe Aksjomaty i "Granica 0" (Domain Axioms)

Najważniejsze, niezmienne fundamenty systemu (ADR 0005). Zmiana któregokolwiek z tych założeń oznacza całkowity rewrite aplikacji:

### A. Czysty Czas (Timebase SSOT - ADR 0002)
* **Kanon pozycji:** Wszystkie zdarzenia, klipy, cue i pozycje transportu zapisywane są jako **integer ticks** oparte o stałą rozdzielczość **PPQ** (Pulses Per Quarter Note - np. 960).
* **Brak floatów i sekund:** Czas w postaci floatów (np. `absBeat`) jest kategorycznie zabroniony w rdzeniu silnika. Sekundy i sample występują wyłącznie na krawędzi audio (`tempoMap` -> ms -> sample).
* **Takt 1 = Start:** Takt 1 (bar 1) to początek właściwego utworu (zgodnie z zapisem nutowym).
* **Pre-roll / Countdown:** Countdown i pre-roll są reprezentowane jako pozycje niedodatnie (**ticks <= 0**).
* **BBT (Bar:Beat:Tick):** To wyłącznie warstwa prezentacji (projekcji) w UI i na API. Silnik przechowuje i kalkuluje wyłącznie ticki.
* **Serwer jako SSOT:** Serwer (`apps/server`) zarządza zegarem muzycznym i transportem. Klient (`apps/web`) jedynie wygładza (interpoluje) playhead między tickami otrzymywanymi z serwera (~25 Hz przez WebSockets). Klient nie posiada własnego niezależnego zegara.

### B. Przenośne Storage (ADR 0001)
* System nie korzysta z monolitycznej, globalnej bazy danych.
* Każdy projekt to w pełni izolowany, przenośny folder: `data/projects/<id>/`.
* Wszelkie operacje zapisu i odczytu odbywają się w granicach tego folderu.

---

## 4. Standardy UI, Gęstość i Ergonomia (Design System)

Wysoko nasycony interfejs (estrada/DAW) rządzi się restrykcyjnymi zasadami (ADR 0011, `ui-density.mdc`):

1. **Absolutny Zakaz Tailwind CSS i Inline-Styles:** Wszelkie style muszą być pisane w **CSS Modules** (`*.module.css`). Wyjątkiem są wartości wyliczane dynamicznie (np. pozycjonowanie playhead w %).
2. **Tokeny `--ss-*`:** Kolory, typografia, marginesy i zaokrąglenia pochodzą wyłącznie ze zmiennych zdefiniowanych w `tokens.css`.
3. **Siatka Przestrzenna:** Paddingi, marginesy i odstępy muszą być wielokrotnością 4px/8px (od `--ss-space-1` do `--ss-space-16`).
4. **Kontrast sceniczny (APCA):** Kategoryczny zakaz czystego białego tekstu (`#ffffff`) na czarnym tle (`#000000`). Stosowane są tokeny: tekst główny `--ss-color-text` (#fafafa), pomocniczy `--ss-color-text-muted` (#a3a3a3).
5. **Obsługa Focus (Focus Clip Prevention):** Przy `overflow: hidden` ramka focusa musi używać ujemnego offsetu (`outline-offset: -2px`) lub wewnętrznego cienia (`box-shadow`), aby uniknąć ucięcia.
6. **Brak Atrap / Stubów:** Jeśli dana funkcja nie jest w pełni zaimplementowana i sprawna, jej kontrolka **nie może** znajdować się w UI (np. jako zablokowany/szary button). Brak implementacji = brak elementu w interfejsie.
7. **Parytet z wersją v4 (ADR 0011):** Zachowanie i mechanika edycji muszą być zgodne z wersją legacy v4 (referencją zachowań edycyjnych jest Logic Pro), ale bez kopiowania starego kodu HTML/CSS 1:1.

---

## 5. Kluczowe Modele Danych i Walidacja

Konsekwentnie stosowana jest zasada **Fail Fast** z walidacją na krawędziach systemu (HTTP, WS, pliki) przy użyciu biblioteki **Zod** w `@stagesync/shared`.

### Podstawowe elementy projektu (Project Schema):
* **Project Metadata:** podstawowe informacje, `defaultBpm`, `defaultMeter` (metrum).
* **Tempo Map & Meter Map:** Tablice zdarzeń zmian tempa i metrum na osi ticków.
* **Tracks:** Ścieżki reprezentujące konkretne role (np. Audio, MIDI, Cues, Lyrics, Chords, Score).
* **Clips:** Klipy osadzone na ścieżkach posiadające `startTicks`, `durationTicks` oraz specyficzny content (np. plik audio z parametrami `fadeInMs`/`fadeOutMs` i regionem pętli).

---

## 6. Szybki start dla agenta (Development Guidelines)

Pracując z tym kodem, pamiętaj o:
1. **Trunk-based Development:** Domyślnie pracuj bezpośrednio na gałęzi `main`, wprowadzając małe, atomowe, przetestowane kroki.
2. **Higienie TODO:** Plik `docs/TODO.md` zawiera wyłącznie aktywne zadania. Zadania wykonane są z niego usuwane (nie oznaczane jako `[x]`).
3. **Higienie CHANGELOG:** Wpisy w `CHANGELOG.md` są przeznaczone dla użytkownika końcowego. Nie mogą zawierać żargonu technicznego (np. "G1-G10", "soft-gate", "residual"). Dodajemy wpis tylko wtedy, gdy zmiana jest bezpośrednio odczuwalna dla użytkownika.
4. **Testach:** Przed zakończeniem pracy uruchom pełny zestaw testów (`pnpm test`) oraz weryfikację typów i lintera (`pnpm check-types && pnpm lint`).
5. **Nazewnictwie w Docs:** Raporty kanoniczne trafiają do `docs/analysis/reports/{current,milestones,hygiene}/report-<nazwa>.md` (są commitowane), a notatki robocze do `docs/analysis/working/working-<nazwa>.md` (są w `.gitignore`).

---

*Podsumowanie skonsolidowane na bazie wersji StageSync v5.0.0 (Overture) — Sierpień 2026.*
