# StageSync Root Scripts (`scripts/`)

Ten katalog zawiera skrypty narzędziowe i automatyzacje poziomu monorepo (przeniesione z dawnego folderu `launch/scripts/`), wspierające procesy wydaniowe, generowanie dokumentacji oraz lintery specyficzne dla projektu.

## Spis skryptów

| Plik | Opis |
| :--- | :--- |
| `build-release-notes.mjs` | Generuje informacje o wydaniu (Release Notes) na podstawie historii zmian i konwencji. |
| `extract-changelog-section.mjs` | Wyciąga konkretną sekcję z pliku `CHANGELOG.md` dla zadanej wersji. |
| `generate-repo-map.mjs` | Generuje mapę monorepo (`docs/REPO_MAP.md`): domyślnie slim (kolaps assetów, limit głębokości). Flagi: `--full`, `--include-untracked`. |
| `integrate-pr.sh` | Skrypt pomocniczy do integracji Pull Requestów w trunk-based development. |
| `lint-ss-css.mjs` | Linter sprawdzający poprawność użycia tokenów CSS (`--ss-*`) i reguł stylów. |
| `merge-train.sh` | Zarządzanie kolejką merge (Merge Train) dla CI/CD. |
| `release-title.mjs` | Formatuje nagłówek/tytuł release'u na podstawie wersji. |
| `run-merge-train.sh` | Skrypt uruchamiający automatyzację kolejki mergowania. |
| `run-train-batch.sh` | Przetwarzanie wsadowe pociągu merge'y. |
| `sync-version.mjs` | Synchronizuje wersję SemVer z głównego `package.json` do plików konfiguracyjnych i paczek podrzędnych. |
