# 🛠️ StageSync Root Scripts (`scripts/`)

Katalog `scripts/` grupuje skrypty automatyzacji, narzędzia wydań SemVer, weryfikację środowiska uruchomieniowego, generator mapy repozytorium oraz narzędzia utrzymania jakości w StageSync.

Narzędzia są podzielone na 4 dziedzinowe podkatalogi:

---

## 📁 Struktura Katalogów i Narzędzi

```
scripts/
├── release/                        # 🏷️ Wydania SemVer, changelog & wersjonowanie
├── setup/                          # ⚙️ Pre-flight & setup środowiska (Windows / Unix)
├── quality/                        # 📊 Mapa kodu, linki w docs i lintery
├── merge-train/                    # 🚆 Pociągi integracyjne PR-ów (trunk/batch)
├── dev-hub.ts                      # 🎛️ Główny skrypt DX Suite (Dev Hub CLI)
├── tsconfig.json                   # Konfiguracja TS dla katalogu scripts/
└── README.md                       # 📚 Niniejsza dokumentacja
```

---

## 🚀 0. Główne Skrypty Uruchomieniowe (Root Launchers)

Skrypty launchera środowiska deweloperskiego znajdują się w **katalogu głównym projektu (root)** i automatycznie wykrywają oraz uruchamiają Dev Hub (`scripts/dev-hub.ts`).

| Plik w Root | System / Powłoka | Opis |
| :--- | :--- | :--- |
| `dev` | macOS / Linux (Bash) | Uniksowy skrypt uruchomieniowy: sprawdza node, instaluje/włącza pnpm przez corepack i startuje Dev Hub. |
| `dev.cmd` | Windows (CMD / Wiersz Poleceń) | Klasyczny launcher CMD dla środowiska Windows. |
| `dev.ps1` | Windows (PowerShell) | Zaawansowany launcher PowerShell z automatycznym pre-flight środowiska, sprawdzeniem narzędzi i uruchomieniem TUI. |

---

## 🎛️ 1. Centrum Dowodzenia DX — Dev Hub (`scripts/dev-hub.ts`)
>>>>>>>
`dev-hub.ts` to interaktywne TUI w oparciu o `@clack/prompts`, stanowiące pojedynczy punkt wejścia do pracy z projektem StageSync.

### Uruchamianie (Root Entrypoint)
```bash
dev           # Windows (CMD)
.\dev         # Windows (PowerShell)
./dev         # macOS / Linux
```
>>>>>>>

### Szybkie Skróty Bezpośrednie CLI
Możesz uruchamiać poszczególne moduły bez otwierania interaktywnego menu:

| Skrót CLI | Działanie |
| :--- | :--- |
| `.\dev doctor` | **Moduł Doctor / Preflight:** Lekki skan Node (≥22), pnpm, Rust, Docker, WebView2, portów `:3000`/`:4000`, `.env` i `STAGESYNC_DATA_DIR`. |
| `.\dev ports` | **Safe Port Guard & Kill-Zombies:** Tabela procesów zajmujących porty, dwustopniowe zamykanie `SIGTERM` ➔ `SIGKILL` oraz czyszczenie sidecarów Tauri. |
| `.\dev knip` | **Dead Code Detector:** Wykrywanie nieużywanego kodu i paczek za pomocą Knip. |
| `.\dev ss-css` | **CSS Token Guard:** Walidacja tokenów w arkuszach stylów CSS. |
| `.\dev links` | **Docs Link Checker:** Sprawdzanie poprawności łączy w dokumentacji. |
| `.\dev web` | **Dev Profile:** Uruchomienie pełnego stacka Web UI + API Server. |
| `.\dev desktop` | **Dev Profile:** Uruchomienie powłoki desktopowej Tauri. |
| `.\dev map` | **Generator Mapy:** Zbudowanie aktualnej mapy repozytorium w `docs/REPO_MAP.md`. |
| `.\dev types` | **TypeScript Check:** Sprawdzenie typów w 10 pakietach monorepo. |
| `.\dev release` | Otwarcie podmenu wydań GitHub Release Hub 2.0. |
| `.\dev network` | Otwarcie diagnostyki LAN IP z kodami QR i wyborem NIC. |
| `.\dev clean` | Głębokie czyszczenie `dist`, `.turbo`, `.vite`, `target`, `coverage`, `.cache` w monorepo. |

---

### 📂 Kategorie Zadań w Interaktywnym Menu Dev Hub

1. **🏥 Doctor / Szybka Diagnostyka:** Bezinwazyjny odczyt stanu środowiska i portów.
2. **🚀 Uruchomienie & Dev:** Profile uruchomieniowe (Web+API, Web Only, API Only, Web+Desktop Shell, Docker Compose).
3. **🌐 Sieć & Diagnostyka LAN:** Wybór karty NIC, kody QR dla tabletów (`/client`, `/admin`, `/api/health`) i zarządca procesów/portów.
4. **🧪 Testy & Jakość:** Mapa repozytorium, sprawdzanie typów TS, lintery CSS/Knip, weryfikacja docs, testy jednostkowe i Smart Tempo DSP Benchmark.
5. **🐙 GitHub & Wydania (Release Hub 2.0):** Synchronizacja wersji, Pre-Release Checklist 2.0, Preview Release Notes (podgląd opisów bez tworzenia tagów), przygotowywanie tagów SemVer (w tym alpha/beta) oraz status Git.
6. **🧹 Konserwacja & Cache:** Głębokie usuwanie artefaktów buildów i pamięci podręcznej z pełnym raportem wyczyszczonych i zablokowanych katalogów.
7. **🛠 Setup Środowiska:** Uruchomienie automatycznego instalatora zależności systemowych (`setup.ps1` / `setup.sh`).

---

## 🏷️ 2. Release & Wersjonowanie (`scripts/release/`)

Skrypty odpowiedzialne za cykl życia wydań, wersjonowanie monorepo oraz generowanie notatek wydań.

| Plik | Opis | Przykładowe użycie |
| :--- | :--- | :--- |
| `cut-release.mjs` | Pełna procedura cut SemVer: zmiana `[Unreleased]` na `## [X.Y.Z]`, bump `package.json`, propagacja `sync-version`, smoke notes oraz commit/tag (wspiera również alpha/beta/rc). | `pnpm cut-release patch --yes` |
| `sync-version.mjs` | Propaguje numer wersji z korzenia `package.json` do aplikacji web/server, Tauri (`tauri.conf.json`, `Cargo.toml`), Android Gradle oraz Docker. | `pnpm sync-version` |
| `build-release-notes.mjs` | Generuje podsumowanie i nagłówki GitHub Release z sekcji CHANGELOG. | `node scripts/release/build-release-notes.mjs 5.4.8` |
| `release-title.mjs` | Formatuje nazwę wydania na podstawie tzw. *hero name* linii w CHANGELOG. | `node scripts/release/release-title.mjs 5.4.8` |
| `extract-changelog-section.mjs` | Pomocnicza ekstrakcja pojedynczej sekcji Keep a Changelog. | `node scripts/release/extract-changelog-section.mjs 5.4.8` |
| `*.test.mjs` | Testy jednostkowe dla skryptów wydań. | `node scripts/release/cut-release.test.mjs` |

---

## ⚙️ 3. Przygotowanie Środowiska (`scripts/setup/`)

Natywne skrypty pre-flight i self-healing środowiska uruchomieniowego.

| Plik | Opis | Przykładowe użycie |
| :--- | :--- | :--- |
| `setup.ps1` | Natywny skrypt dla Windows. Sprawdza i pobiera Node.js 22, pnpm, Rust, MSVC C++ Build Tools i WebView2 via `winget`. | `powershell -ExecutionPolicy Bypass -File .\scripts\setup\setup.ps1` |
| `setup.sh` | Natywny skrypt dla Linux/macOS. Zarządza fnm, pnpm oraz zależnościami systemowymi GTK/Xcode. | `./scripts/setup/setup.sh` |

---

## 📊 4. Dokumentacja & Jakość (`scripts/quality/`)

Narzędzia generowania map kodu, walidacji dokumentacji i linterów.

| Plik | Opis | Przykładowe użycie |
| :--- | :--- | :--- |
| `generate-repo-map.mjs` | Generuje automatyczną mapę repozytorium w `docs/REPO_MAP.md` dla LLM i deweloperów. | `pnpm generate:map` |
| `check-docs-links.mjs` | Weryfikuje względne odnośniki w plikach markdown w całym projekcie. | `node scripts/quality/check-docs-links.mjs` |
| `lint-ss-css.mjs` | Weryfikuje stosowanie tokenów CSS (`--ss-*`) i zakaz ad-hoc HEX. | `pnpm lint:ss-css` |

---

## 🚆 5. Merge Train (`scripts/merge-train/`)

Automatyzacja pociągów integracyjnych dla gałęzi `main`.

| Plik | Opis |
| :--- | :--- |
| `integrate-pr.sh` | Nakłada patch z PR (`gh pr diff`) na bieżącą gałąź. |
| `merge-train.sh` | Łączy sekwencję PR-ów w jedną gałąź integracyjną. |
| `run-merge-train.sh` | Pełna automatyzacja budowania i squash-merge'owania PR-ów w CI. |
| `run-train-batch.sh` | Wersja batch dla zbiorczych otwartych PR-ów. |

---

