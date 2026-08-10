# 🛠️ StageSync Root Scripts (`scripts/`)

Katalog `scripts/` zawiera skrypty automatyzacji, narzędzia wydań SemVer, skrypty pre-flight, generatory dokumentacji oraz pociągi integracyjne CI/CD.

> 📘 **Szukasz instrukcji uruchomienia projektu i pracy deweloperskiej?**  
> Przejdź do dedykowanego przewodnika: **[StageSync DX Guide](../docs/guides/DX.md)**.

---

## 📁 1. Architektura Katalogu `scripts/`

```text
scripts/
├── release/        # 🏷️ Wydania SemVer, changelog & wersjonowanie monorepo
├── setup/          # ⚙️ Pre-flight & instalatory zależności (Windows / Unix)
├── quality/        # 📊 Mapa kodu, lintery CSS/Knip i walidacja dokumentacji
├── merge-train/    # 🚆 Pociągi integracyjne PR-ów (trunk/batch)
├── dev-hub.ts      # 🎛️ Główny skrypt DX Suite (Dev Hub TUI / CLI)
└── README.md       # 📚 Niniejsza dokumentacja (Indeks skryptów)
```

---

## 🏷️ 2. Release & Wersjonowanie (`scripts/release/`)

| Plik | Opis | Przykładowe użycie |
| :--- | :--- | :--- |
| [`cut-release.mjs`](./release/cut-release.mjs) | Pełna procedura cut SemVer: zmiana CHANGELOG, bump wersji, propagacja i commit/tag. | `pnpm cut-release patch --yes` |
| [`sync-version.mjs`](./release/sync-version.mjs) | Propaguje wersję z głównego `package.json` do web, server, Tauri, Android i Docker. | `pnpm sync-version` |
| [`build-release-notes.mjs`](./release/build-release-notes.mjs) | Generuje opis GitHub Release z sekcji CHANGELOG. | `node scripts/release/build-release-notes.mjs 5.4.8` |
| [`release-title.mjs`](./release/release-title.mjs) | Formatuje nazwę wydania na podstawie tzw. *hero name* z CHANGELOG. | `node scripts/release/release-title.mjs 5.4.8` |
| [`extract-changelog-section.mjs`](./release/extract-changelog-section.mjs) | Wyodrębnia pojedynczą sekcję z pliku CHANGELOG. | `node scripts/release/extract-changelog-section.mjs 5.4.8` |

---

## ⚙️ 3. Przygotowanie Środowiska (`scripts/setup/`)

| Plik | Opis | Przykładowe użycie |
| :--- | :--- | :--- |
| [`setup.ps1`](./setup/setup.ps1) | Natywny skrypt dla Windows. Pobiera Node.js 22, pnpm, Rust, MSVC C++ i WebView2 via `winget`. | `powershell -ExecutionPolicy Bypass -File .\scripts\setup\setup.ps1` |
| [`setup.sh`](./setup/setup.sh) | Natywny skrypt dla Linux/macOS. Konfiguruje `fnm`, `pnpm` oraz zależności systemowe GTK/Xcode. | `bash ./scripts/setup/setup.sh` |

---

## 📊 4. Dokumentacja & Jakość (`scripts/quality/`)

| Plik | Opis | Przykładowe użycie |
| :--- | :--- | :--- |
| [`generate-repo-map.mjs`](./quality/generate-repo-map.mjs) | Generuje automatyczną mapę repozytorium w [`docs/REPO_MAP.md`](../docs/REPO_MAP.md). | `pnpm generate:map` |
| [`check-docs-links.mjs`](./quality/check-docs-links.mjs) | Weryfikuje względne odnośniki w plikach `.md` w całym projekcie. | `node scripts/quality/check-docs-links.mjs` |
| [`lint-ss-css.mjs`](./quality/lint-ss-css.mjs) | Weryfikuje stosowanie tokenów CSS (`--ss-*`) i zakaz ad-hoc HEX. | `pnpm lint:ss-css` |

---

## 🚆 5. Merge Train (`scripts/merge-train/`)

| Plik | Opis |
| :--- | :--- |
| [`integrate-pr.sh`](./merge-train/integrate-pr.sh) | Nakłada patch z PR (`gh pr diff`) na bieżącą gałąź. |
| [`merge-train.sh`](./merge-train/merge-train.sh) | Łączy sekwencję PR-ów w jedną gałąź integracyjną. |
| [`run-merge-train.sh`](./merge-train/run-merge-train.sh) | Pełna automatyzacja budowania i squash-merge'owania PR-ów w CI. |
| [`run-train-batch.sh`](./merge-train/run-train-batch.sh) | Wersja batch dla zbiorczych otwartych PR-ów. |