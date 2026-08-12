# Raport: Bazowe Pokrycie Testami (Coverage Baseline)

**Data:** 2026-08-12  
**Powiązane:** [STANDARDS.md](../../../STANDARDS.md) · [TESTING.md](../../../TESTING.md) · [codecov.yml](../../../../../codecov.yml) · [.clinerules](../../../../../.clinerules)

---

## 🎯 Cel i Filozofia Pokrycia w StageSync

W architekturze monorepo StageSync stosujemy zasadę **izolacji odpowiedzialności per warstwa**. Nie gonimy za ogólnym, uśrednionym wskaźnikiem `%` dla całego repozytorium, ponieważ różne warstwy mają odmienną specyfikę:

1. **Czysta Domena (`@stagesync/shared`)**: Brak efektów ubocznych, brak I/O i DOM — testowalność bliska 100%.
2. **Serwer & Storage (`@stagesync/server`)**: Autorytatywny stan, zegar transportu SSOT, transakcyjny zapis dyskowy — wysokie wymagania bezpieczeństwa (≥75% minimalnie, docelowo ≥90%).
3. **Rdzeń Kliencki (`apps/web` — `web-core`)**: Silnik DSP audio, Smart Tempo, WebAudio, matematyka osi czasu — krytyczny kod algorytmiczny (≥85% minimalnie).
4. **Widoki UI (`apps/web` — `web-ui`)**: Logika renderowania i układu — pokrycie komponentów w Vitest na poziomie bazowym (≥50%), natomiast kluczowe interakcje (drag & drop, resize) weryfikowane są przez scenariusze **Playwright E2E**.
5. **Design System (`@stagesync/ui`)**: Atomowe komponenty UI o wysokiej powtarzalności (≥75% minimalnie, docelowo ≥95%).

---

## 📊 1. Główne Warstwy Monorepo (Bramki CI & Codecov)

| Flaga Codecov  | Ścieżka                        | Obecne pokrycie (Lines) | Obecne (Branches) | Minimalne (Bramka CI) | Zalecane (Target) |
| :------------- | :----------------------------- | :---------------------: | :---------------: | :-------------------: | :---------------: |
| **`shared`**   | `packages/shared`              | **94.6%** _(4753/5024)_ |       82.1%       |       **≥ 85%**       |     **≥ 95%**     |
| **`server`**   | `apps/server`                  | **88.5%** _(3249/3670)_ |       77.6%       |       **≥ 75%**       |     **≥ 90%**     |
| **`web-core`** | `apps/web/src/{lib,transport}` | **90.2%** _(6657/7381)_ |       77.4%       |       **≥ 85%**       |     **≥ 92%**     |
| **`web-ui`**   | `apps/web/src/shells`          | **43.6%** _(3973/9113)_ |       34.5%       |       **≥ 50%**       |     **≥ 65%**     |
| **`ui`**       | `packages/ui`                  |  **100.0%** _(72/72)_   |       86.7%       |       **≥ 75%**       |     **≥ 95%**     |

---

## 🔍 2. Szczegółowy Podział na Moduły i Podkatalogi

### A. Aplikacja Webowa (`@stagesync/web`)

#### Rdzeń Kliencki (`web-core`):

| Moduł / Podkatalog       | Obecne (Lines) | Obecne (Branches) | Minimalne | Zalecane | Kluczowe pliki / komponenty                                      |
| :----------------------- | :------------: | :---------------: | :-------: | :------: | :--------------------------------------------------------------- |
| `src/lib/timeline-edit`  |   **97.2%**    |       80.7%       |  **85%**  | **95%**  | `formaEdit.ts`, `formaCanvas.ts`, `cueEdit.ts`, `tekstBlocks.ts` |
| `src/lib/timeline`       |   **96.0%**    |       86.8%       |  **85%**  | **95%**  | `timelineTracks.ts`, `timelineGesture.ts`, `mapLaneEdit.ts`      |
| `src/transport`          |   **94.7%**    |       82.6%       |  **85%**  | **95%**  | `transportSocket.ts`, `playheadInterpolation.ts`, `api.ts`       |
| `src/lib/audio`          |   **87.1%**    |       72.0%       |  **85%**  | **90%**  | `audioPlayback.*`, `audioTempoAnalysis.*`, `metronome.ts`        |
| `src/lib/shell-operator` |   **85.5%**    |       74.4%       |  **80%**  | **90%**  | `libraryApi.ts`, `operatorPin.ts`, `operatorPinSession.ts`       |
| `src/lib/client`         |   **84.8%**    |       73.2%       |  **80%**  | **90%**  | `clientKaraoke.ts`, `clientForma.ts`, `pushNotifications.ts`     |

#### Powłoki i Widoki UI (`web-ui`):

| Moduł / Podkatalog                 | Obecne (Lines) | Obecne (Branches) | Minimalne | Zalecane | Kluczowe pliki / komponenty                                    |
| :--------------------------------- | :------------: | :---------------: | :-------: | :------: | :------------------------------------------------------------- |
| `src/shells/components & settings` |   **54.1%**    |       44.1%       |  **50%**  | **70%**  | `AppHeader.tsx`, `SettingsModalShell.tsx`, `ShellWordmark.tsx` |
| `src/shells/admin`                 |   **46.3%**    |       40.5%       |  **50%**  | **65%**  | `AdminShell.tsx`, `useAdminImportHandlers.ts`                  |
| `src/shells/client`                |   **43.8%**    |       47.1%       |  **50%**  | **65%**  | `ScorePane.tsx`, `KaraokePane.tsx`, `GridPane.tsx`             |
| `src/shells/timeline`              |   **37.3%**    |       24.2%       |  **45%**  | **60%**  | `TimelineShell.tsx`, inspektory, mikser _(+ Playwright E2E)_   |

---

### B. Serwer Backend (`@stagesync/server`)

| Moduł / Podkatalog    | Obecne (Lines) | Obecne (Branches) | Minimalne | Zalecane | Kluczowe pliki / komponenty                                  |
| :-------------------- | :------------: | :---------------: | :-------: | :------: | :----------------------------------------------------------- |
| `src/storage`         |   **96.9%**    |       89.7%       |  **90%**  | **98%**  | `project-store.ts`, `library-store.ts`, `atomic-write.ts`    |
| `src/transport`       |   **95.1%**    |       87.8%       |  **90%**  | **98%**  | `transport-engine.ts`, `transport-socket.ts`                 |
| `src/stage & midi`    |   **92.6%**    |       88.0%       |  **85%**  | **95%**  | `song-end-race.ts`, backendy MIDI                            |
| `src/system & static` |   **90.1%**    |       80.0%       |  **80%**  | **90%**  | `diagnostics.ts`, `env-settings.ts`, `resolve-static-dir.ts` |
| `src/routes`          |   **85.3%**    |       68.3%       |  **75%**  | **90%**  | `projects.ts`, `library.ts`, `system-settings-routes.ts`     |

---

### C. Logika Współdzielona (`@stagesync/shared`)

| Moduł / Podkatalog         | Obecne (Lines) | Obecne (Branches) | Minimalne | Zalecane | Kluczowe pliki / komponenty                         |
| :------------------------- | :------------: | :---------------: | :-------: | :------: | :-------------------------------------------------- |
| `src/transport`            |   **100.0%**   |      100.0%       |  **90%**  | **100%** | `transport-types.ts`, `clock.ts`                    |
| `src/music` & `audio-clip` |   **99.3%**    |       86.4%       |  **90%**  | **98%**  | Teoria muzyki, tonacje, akordy, audio clip models   |
| `src/ui-helpers`           |   **96.2%**    |       86.4%       |  **85%**  | **95%**  | `wand-chords.ts`, `wand-lyrics.ts`, `wand-types.ts` |
| `src/time-tempo`           |   **96.1%**    |       91.6%       |  **90%**  | **98%**  | `ticksToBbt`, `bbtToTicks`, stałe PPQ               |
| `src/mixer`                |   **95.9%**    |       89.8%       |  **85%**  | **95%**  | Schematy miksera audio, kanały, tłumiki             |
| `src/import`               |   **95.2%**    |       82.8%       |  **85%**  | **95%**  | `ultrastar/`, `ug/`, parsery formatów               |
| `src/tempo-map-solver`     |   **94.9%**    |       80.1%       |  **85%**  | **95%**  | Rozwiązywanie mapy tempa i zmian metrum             |
| `src/project`              |   **94.4%**    |       77.5%       |  **85%**  | **95%**  | Schematy Zod projektu v5, walidacja                 |
| `src/text-anchor-bridge`   |   **92.3%**    |       77.3%       |  **85%**  | **95%**  | Mostki synchronizacji tekstu i akordów              |
| `src/smart-tempo`          |   **90.1%**    |       73.6%       |  **85%**  | **95%**  | Modele DSP Smart Tempo, siatki rytmiczne            |

---

## 🛡️ 3. Dodatkowe Mechanizmy Zapewnienia Jakości

| Obszar                  | Ścieżka                                             | Narzędzie                            | Wymóg                                     |
| :---------------------- | :-------------------------------------------------- | :----------------------------------- | :---------------------------------------- |
| **End-to-End UI**       | `apps/web/e2e`                                      | Playwright Chromium                  | **100% pass** w CI przed każdym mergem    |
| **DSP Accuracy**        | `apps/web/scripts/benchmark`                        | Dataset 4 referencyjnych utworów     | **Brak regresji** DAW Grade / Stage Grade |
| **Desktop Shell**       | `apps/desktop`                                      | Node test runner + Tauri cargo check | **100% pass** testów launchera            |
| **Android Shells**      | `apps/console`, `apps/performer`                    | Gradle JVM unit tests                | Czysty build i poprawne działanie WebView |
| **Bramka Beta/Release** | `docs/analysis/reports/current/report-beta-gate.md` | Checklista G1–G10                    | Weryfikacja operatorska na fizycznym HW   |
