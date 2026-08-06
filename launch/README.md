# 🚀 launch/ — Narzędzia Uruchomieniowe, Skrypty i Automatyzacja

Katalog `launch/` zawiera narzędzia, konfiguracje oraz skrypty pomocnicze używane do budowania, testowania, automatyzacji wydań (releases) oraz lokalnego uruchamiania platform wspieranych przez StageSync (takich jak Android czy Desktop sidecar).

## 📁 Struktura katalogu

- **`android/`** — Pliki konfiguracyjne i klucze podpisywania aplikacji mobilnych (`sideload.keystore`), niezbędne do lokalnego budowania pakietów `.apk`.
- **`scripts/`** — Scentralizowany zbiór skryptów operacyjnych uruchamianych z poziomu głównego `package.json` lub w potokach CI/CD:
  - **Dla wydań i wersji:**
    - `sync-version.mjs` — Synchronizuje wersje w monorepo (`package.json`, tauri.conf.json itp.).
    - `build-release-notes.mjs` — Generuje automatyczne opisy wydań na podstawie `CHANGELOG.md`.
    - `extract-changelog-section.mjs` — Wyciąga fragmenty zmian dla konkretnej wersji.
    - `release-title.mjs` — Pobiera przyjazną nazwę linii (np. *Overture* dla 5.0).
  - **Dla deweloperów (bazy danych i analizy):**
    - `generate-repo-map.mjs` — Tworzy mapę repozytorium `docs/REPO_MAP.md`.
    - `lint-ss-css.mjs` — Narzędzie linterujące zgodność z regułami CSS Modules i tokenami `--ss-*`.
    - `debug-bar-alignment.ts` / `debug-winner-beats.ts` — Skrypty diagnostyczne dla algorytmów synchronizacji.
    - `generate-smart-tempo-benchmark.ts` / `record-benchmark.ts` — Testy wydajności i dokładności silnika timingowego.
  - **Dla mostka desktopowego (Desktop sidecar):**
    - `sync-launcher-ui.mjs` — Kopiuje dystrybucję UI launchera do zasobów Tauri.
    - `sync-sidecar-server.mjs` — Koordynuje działanie sidecara Node.js wewnątrz powłoki Tauri.
  - **Procedury integracji:**
    - `integrate-pr.sh` — Pomocnik do lokalnego sprawdzania i integrowania Pull Requestów.
    - `merge-train.sh` / `run-merge-train.sh` — Skrypty kolejki integracyjnej na gałęzi `main`.

## ⚙️ Wykorzystanie w monorepo

Skrypty te są rejestrowane w głównym pliku `package.json` pod komendami typu:
- `pnpm release`
- `pnpm gen:map`
- `pnpm lint:css`

Wszystkie skrypty są dostosowane do uruchamiania w środowisku monorepo i wspierają systematykę **Trunk-based Development**.
