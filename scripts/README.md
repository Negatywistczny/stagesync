# StageSync Root Scripts (`scripts/`)

Narzędzia monorepo: release, mapa repo, lint CSS/tokenów, kolejki merge PR oraz weryfikacja linków w docs.

`tsconfig.json` w tym katalogu służy tylko do podpowiedzi IDE dla plików `*.mjs` (bez emit).

## Spis skryptów

### Release & wersja

| Plik | Opis |
| :--- | :--- |
| `cut-release.mjs` | Pełny cut SemVer: `[Unreleased]` → `## [X.Y.Z]`, bump `package.json`, `sync-version`, smoke notes, commit + annotated tag; `--push` wypycha HEAD i tag (CI Release). Flagi: `--dry-run`, `--yes`, `--no-commit`, `--date`, `--allow-branch`. |
| `sync-version.mjs` | Propaguje wersję z root `package.json` (lub `--version`) do web/server, Docker/compose, Tauri (`tauri.conf.json` / `Cargo.toml`) oraz `versionName`/`versionCode` Android Console/Performer. |
| `build-release-notes.mjs` | Buduje ciało GitHub Release: tabela downloadów + Highlights z sekcji CHANGELOG (nie pełny changelog). Użycie: `node scripts/build-release-notes.mjs <version>`. |
| `release-title.mjs` | Tytuł release’u z hero-nazwy linii w CHANGELOG (`5.1.0 — Launch & Mix`) albo sama wersja. Użycie: `node scripts/release-title.mjs <version>`. |
| `extract-changelog-section.mjs` | Wypisuje ciało jednej sekcji Keep a Changelog (bez nagłówka H2). Użyteczne w testach / tooling; Release CI korzysta z `build-release-notes.mjs`. |

### Przygotowanie środowiska (Setup)

| Plik | Opis |
| :--- | :--- |
| `setup.ps1` | Interaktywny skrypt dla systemu Windows, który weryfikuje i instaluje wymagane środowisko uruchomieniowe i kompilatory (Node.js 22, pnpm, Rust, MSVC C++ Build Tools, WebView2 Runtime) używając `winget`. |
| `setup.sh` | Odpowiednik setupu dla systemów Linux/macOS. Weryfikuje Node.js, używa `fnm` do instalacji brakującej wersji Node, sprawdza zależności Tauri (`apt-get`, `xcode-select`) i pobiera Rusta. |

### Dokumentacja & jakość

| Plik | Opis |
| :--- | :--- |
| `generate-repo-map.mjs` | Generuje `docs/REPO_MAP.md` z plików śledzonych w Git. Domyślnie tryb slim (limit głębokości, kolaps assetów); `--full`, `--include-untracked`. Odpalane też z husky / `pnpm generate:map`. |
| `check-docs-links.mjs` | Sprawdza względne linki w `*.md` / `*.mdc` (pomija m.in. `node_modules`, `inspiracje/` wg konfiguracji w skrypcie). Exit ≠ 0 przy broken links. |
| `lint-ss-css.mjs` | Gate CSS: zakaz ad-hoc HEX i ułamkowych `rem` w shellu web + launcher Desktop (wyjątki: Timeline geometry, komentarz `ss-css-allow`). `pnpm lint:ss-css`. |

### Merge train (trunk / PR batch)

| Plik | Opis |
| :--- | :--- |
| `integrate-pr.sh` | Wkleja diff jednego PR (`gh pr diff` → `git apply`) na bieżącą gałąź i robi commit z tytułu PR (dostosowanym pod commitlint). Przy konfliktach preferuje stronę PR. |
| `merge-train.sh` | Tworzy gałąź od `origin/main` i po kolei `git merge` headów podanych PR-ów. Użycie: `merge-train.sh <branch> <pr…>`. |
| `run-merge-train.sh` | Pełny pociąg: `integrate-pr` dla listy PR → lint/types/test/build → push gałęzi → PR zbiorczy → czekanie na CI → squash merge → zamykanie oryginałów. |
| `run-train-batch.sh` | Lżejszy batch train: integruje tylko otwarte PR-y, buduje/testuje, push, PR „Merge train batch”, merge squash; pomija zamknięte numery. |

### Testy jednostkowe skryptów

| Plik | Opis |
| :--- | :--- |
| `cut-release.test.mjs` | Testy bump SemVer, cut CHANGELOG, hero linii, parse args. |
| `build-release-notes.test.mjs` | Smoke/regresja generatora Highlights. |
| `extract-changelog-section.test.mjs` | Smoke ekstrakcji sekcji CHANGELOG. |

Uruchomienie: `node scripts/<name>.test.mjs`.

## Cut release

```bash
# podgląd (bez zapisów)
pnpm cut-release patch --dry-run --yes

# lokalny commit + tag (bez push)
pnpm cut-release patch --yes

# pełny cut + push → CI Release na tagu v*
pnpm cut-release patch --yes --push

# minor / major (pierwszy cut linii X.Y.0 dopina hero-nazwę z versioning.mdc)
pnpm cut-release minor --yes --push
```

Wymaga czystego working tree, gałęzi `main`, niepustego `[Unreleased]` oraz poprawnego ownera GitHub (`Negatywistczny`) w CHANGELOG / docs produktowych.

## Inne częste komendy

```bash
pnpm sync-version
node scripts/sync-version.mjs --version 5.4.8 --dry-run

node scripts/build-release-notes.mjs 5.4.7
node scripts/release-title.mjs 5.4.7

pnpm generate:map
node scripts/generate-repo-map.mjs --full

pnpm lint:ss-css
node scripts/check-docs-links.mjs
```
