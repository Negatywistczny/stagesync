> [📦 StageSync](../../README.md) / [docs](../README.md)

# 🧪 docs/standards/TESTING.md — Standardy Testowania i Pokrycia Kodu

Dokument określa kanoniczne standardy jakości, architekturę testów oraz wymagane progi pokrycia kodu w monorepo **StageSync**.

---

## 🏛️ Filozofia i Architektura Testów

W StageSync stosujemy zasadę **bramkowania per warstwa technologiczna** ([`codecov.yml`](../../codecov.yml)). Nie gonimy za ogólnym, uśrednionym procentem dla całego repozytorium — każda warstwa posiada specyficzny profil testowalności:

1. **Czysta Domena (`@stagesync/shared`)**: Brak DOM, sieci i filesystemu. Logika czysto funkcyjna — testowalność bliska 100%.
2. **Serwer & Czas SSOT (`@stagesync/server`)**: Silnik transportu `TransportEngine`, autorytatywny zegar, transakcyjny storage projektów i REST API — rygorystyczne testy integracyjne i jednostkowe.
3. **Rdzeń Kliencki (`web-core` w `apps/web/src/{lib,transport}`)**: Algorytmy DSP audio, detekcja tempa (Smart Tempo), synchronizacja WebAudio, silnik edycji Timeline — krytyczny kod algorytmiczny.
4. **Powłoki UI (`web-ui` w `apps/web/src/shells`)**: Komponenty widoków ekranowych. Podstawowe pokrycie komponentów w Vitest, natomiast kluczowe interakcje użytkownika (drag & drop, resize) weryfikowane są scenariuszami **Playwright E2E**.
5. **Design System (`@stagesync/ui`)**: Atomowe komponenty interfejsu o wysokiej powtarzalności i determinizmie.

---

## 📊 1. Główne Warstwy Monorepo (Bramki CI & Codecov)

| Flaga Codecov  | Zakres w repozytorium            | Minimalne (Bramka CI) | Zalecane (Target) | Rola i charakterystyka                                                     |
| :------------- | :------------------------------- | :-------------------: | :---------------: | :------------------------------------------------------------------------- |
| **`shared`**   | `packages/shared`                |       **≥ 90%**       |     **≥ 98%**     | Czysta domena, schematy Zod, Timebase SSOT (ticks/PPQ), import.            |
| **`server`**   | `apps/server`                    |       **≥ 75%**       |     **≥ 90%**     | TransportEngine SSOT (WS), storage projektów, trasy REST, MIDI.            |
| **`web-core`** | `apps/web/src/lib` + `transport` |       **≥ 85%**       |     **≥ 92%**     | DSP audio, Smart Tempo, WebAudio, interpolacja playheada, edycja Timeline. |
| **`web-ui`**   | `apps/web/src/shells`            |       **≥ 50%**       |     **≥ 65%**     | Widoki UI (Timeline, Admin, Client). Uzupełniane przez Playwright E2E.     |
| **`ui`**       | `packages/ui`                    |       **≥ 90%**       |     **≥ 98%**     | Atomowy Design System (`Button`, `Field`, `Slider`, tokeny CSS).           |

---

## 🔍 2. Szczegółowy Podział na Moduły i Podkatalogi

### A. Aplikacja Webowa (`@stagesync/web`)

#### Rdzeń Kliencki (`web-core`):

| Moduł                    | Rola                                                        | Minimalne (Bramka) | Zalecane (Target) |
| :----------------------- | :---------------------------------------------------------- | :----------------: | :---------------: |
| `src/lib/timeline-edit`  | Snapping, operacje na klipach, cięcia, logika canvasu Formy |     **≥ 95%**      |     **≥ 98%**     |
| `src/lib/timeline`       | Modele osi czasu, przeliczanie siatki, zoom, gesty          |     **≥ 90%**      |     **≥ 98%**     |
| `src/transport`          | Klient WS, wygładzanie pozycji playheada, zegar transportu  |     **≥ 85%**      |     **≥ 95%**     |
| `src/lib/audio`          | DSP, onsety, Smart Tempo, WebAudio, metronom, buforowanie   |     **≥ 85%**      |     **≥ 92%**     |
| `src/lib/shell-operator` | Klient API biblioteki, blokady PIN, kopie zapasowe          |     **≥ 80%**      |     **≥ 90%**     |
| `src/lib/client`         | Logika widoku wykonawcy (partytury, karaoke, IME)           |     **≥ 80%**      |     **≥ 90%**     |

#### Powłoki i Widoki UI (`web-ui`):

| Moduł                   | Rola                                                              | Minimalne (Bramka) | Zalecane (Target) |
| :---------------------- | :---------------------------------------------------------------- | :----------------: | :---------------: |
| `src/shells/components` | Nagłówki, modale, ustawienia systemowe, nawigacja                 |     **≥ 50%**      |     **≥ 75%**     |
| `src/shells/admin`      | Ekran Admina, kreatory importu, zarządzanie projektami            |     **≥ 50%**      |     **≥ 65%**     |
| `src/shells/client`     | Widoki sceniczne muzyków (`ScorePane`, `KaraokePane`, `GridPane`) |     **≥ 50%**      |     **≥ 75%**     |
| `src/shells/timeline`   | Widok Timeline, inspektory, tory ścieżek, mikser _(+ Playwright)_ |     **≥ 45%**      |     **≥ 65%**     |

---

### B. Backend Serwera (`@stagesync/server`)

| Moduł                 | Rola                                                       | Minimalne (Bramka) | Zalecane (Target) |
| :-------------------- | :--------------------------------------------------------- | :----------------: | :---------------: |
| `src/storage`         | Zapis/odczyt projektów, migracje wolumenów, zapis atomowy  |     **≥ 90%**      |     **≥ 98%**     |
| `src/transport`       | Autorytatywny silnik czasu (`TransportEngine`), WS 25 Hz   |     **≥ 90%**      |     **≥ 98%**     |
| `src/stage & midi`    | Cykl życia utworu na scenie, obsługa wejść/wyjść MIDI      |     **≥ 85%**      |     **≥ 95%**     |
| `src/system & static` | Eksport diagnostyki zip, zmienne env, obsługa aktualizacji |     **≥ 80%**      |     **≥ 90%**     |
| `src/routes`          | Trasy REST API, walidacja Zod, obsługa błędów HTTP         |     **≥ 75%**      |     **≥ 90%**     |

---

### C. Logika Współdzielona (`@stagesync/shared`)

| Moduł                    | Rola                                                | Minimalne (Bramka) | Zalecane (Target) |
| :----------------------- | :-------------------------------------------------- | :----------------: | :---------------: |
| `src/transport`          | Typy transportu, zegar bazowy                       |     **≥ 90%**      |    **≥ 100%**     |
| `src/music`              | Teoria muzyki, tonacje, akordy, metrum              |     **≥ 90%**      |     **≥ 98%**     |
| `src/audio-clip`         | Modele i struktury danych klipów audio              |     **≥ 90%**      |     **≥ 98%**     |
| `src/time-tempo`         | Matematyka czasowa (ticks/PPQ/BBT), stałe czasowe   |     **≥ 92%**      |     **≥ 99%**     |
| `src/mixer`              | Schematy miksera audio, kanały, tłumiki             |     **≥ 85%**      |     **≥ 95%**     |
| `src/ui-helpers`         | Funkcje pomocnicze dla narzędzia Wand, formatowanie |     **≥ 85%**      |     **≥ 95%**     |
| `src/import`             | Parsery UltraStar TXT, Ultimate Guitar, MusicXML    |     **≥ 90%**      |     **≥ 98%**     |
| `src/tempo-map-solver`   | Solver siatki tempa i zmian metrum                  |     **≥ 90%**      |     **≥ 98%**     |
| `src/project`            | Schematy Zod projektu, walidacja i migracje         |     **≥ 90%**      |     **≥ 98%**     |
| `src/text-anchor-bridge` | Synchronizacja tekstu i akordów ze ścieżką czasową  |     **≥ 90%**      |     **≥ 98%**     |
| `src/smart-tempo`        | Modele Smart Tempo, aproksymacja siatki uderzeń     |     **≥ 90%**      |     **≥ 98%**     |

---

### D. Design System (`@stagesync/ui`)

| Moduł              | Rola                                                                                  |   Minimalne (Bramka)   | Zalecane (Target) |
| :----------------- | :------------------------------------------------------------------------------------ | :--------------------: | :---------------: |
| `src/components/*` | Komponenty atomowe (`Button`, `Field`, `Slider`, `Badge`, `Segmented`, `ContextMenu`) |       **≥ 90%**        |     **≥ 98%**     |
| `src/tokens.css`   | Tokeny CSS `--ss-*` (kolory, typografia, odstępy)                                     | **100% (lint-ss-css)** |     **100%**      |

---

## 🛡️ 3. Specjalistyczne Obszary Weryfikacji Jakości (Poza Vitest Line %)

| Obszar               | Ścieżka w repozytorium                                                  | Narzędzie weryfikacji                            |    Wymóg Minimalny (CI Gate)    |                Wymóg Zalecany                 |
| :------------------- | :---------------------------------------------------------------------- | :----------------------------------------------- | :-----------------------------: | :-------------------------------------------: |
| **E2E UI Smoke**     | [`apps/web/e2e/`](../../apps/web/e2e/README.md)                         | Playwright Chromium                              | **100% pass** w CI przed mergem |       Rozszerzone flow importu i edycji       |
| **Smart Tempo DSP**  | `apps/web/scripts/benchmark/`                                           | Referencyjny dataset 4 utworów                   |  **Brak regresji** vs baseline  |  DAW Grade **≥ 80%**, Stage Grade **≥ 95%**   |
| **Desktop Launcher** | `apps/desktop/`                                                         | Node Test Runner + Cargo check                   | **100% pass** testów launchera  |     Weryfikacja cyklu życia Node sidecar      |
| **Android Shells**   | `apps/console/`, `apps/performer/`                                      | Gradle JVM unit tests (`./scripts/unit-test.sh`) | Czysty build APK bez ostrzeżeń  |        Testy mostka WebView i intentów        |
| **Bramka Release**   | [`report-beta-gate.md`](./analysis/reports/current/report-beta-gate.md) | Checklista manualna G1–G10                       |     Brak błędów krytycznych     | Weryfikacja na fizycznym HW (mac/Win/Android) |

---

## ⚙️ Komendy Wykonawcze

```bash
# Uruchomienie wszystkich testów jednostkowych i integracyjnych
pnpm test

# Generowanie raportu pokrycia per pakiet
pnpm test:coverage

# Uruchomienie testów E2E Playwright
pnpm --filter @stagesync/shared build
pnpm --filter @stagesync/web test:e2e

# Uruchomienie testów launchera desktopowego
pnpm --filter @stagesync/desktop test

# Benchmark dokładności algorytmu Smart Tempo DSP
pnpm benchmark:record
```
