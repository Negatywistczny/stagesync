# 🛠️ StageSync DX Guide

Informacje dotyczące trybu deweloperskiego, uruchamiania i automatyzacji w projekcie StageSync.

## 🚀 Uruchamianie (Entrypoint)

Launchery (`dev`, `dev.cmd`, `dev.ps1`) same przechodzą do roota monorepo. Z innego katalogu podaj ścieżkę do pliku (np. `…/stagesync/dev`, `…\stagesync\dev.cmd`).

**🪟 Windows**

**CMD**

```cmd
dev
```

**PowerShell**

```powershell
.\dev.cmd
```

**PowerShell (`.ps1`)**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\dev
# lub
.\dev.ps1
```

**🍏 macOS / 🐧 Linux**

```bash
bash dev
# lub
./dev
```

**🌐 Bez launchera** — wymaga już Node.js, pnpm i zależności

```bash
pnpm dev:hub
```

## ⚙️ Środowisko i potwierdzenia

**Wymagania**

- **Node.js**: >= 22 (zalecane `fnm` lub `nvm`).
- **pnpm**: przez `corepack` (launchery włączają go w razie potrzeby).
- **Git**: do zarządzania repozytorium.
- **Tauri / Rust**: do budowania natywnego shella (zob. [DESKTOP.md](./DESKTOP.md)).

**Potwierdzenia** (setup / launchery / cut-release)

- `[T/n]` — domyślnie **Tak** (Enter / `t` / `y`); instalacje bezpieczne.
- `[t/N]` — domyślnie **Nie** (Enter = odmawia); operacje destrukcyjne (np. cut release).
- W Dev Hub (clack): etykiety **Tak** / **Nie**; domyślna opcja = `initialValue`.

## 🎛️ Centrum Dowodzenia — Dev Hub ([`scripts/dev-hub.ts`](../../scripts/dev-hub.ts))

Dev Hub to interaktywne TUI, które zarządza wszystkimi aspektami projektu.

### 📂 Kategorie Zadań w Interaktywnym Menu Dev Hub

W TUI opcje z **submenu** kończą się znakiem `›` (np. `Testy & Jakość ›`). Pozycje bez `›` uruchamiają akcję od razu.

**1. 🏥 Szybka Diagnostyka** - Automatyczny, bezinwazyjny skan środowiska deweloperskiego (Preflight Scan)

> - **Node.js**: Weryfikacja wersji w systemie (wymagany min. Node 22 LTS).
> - **pnpm**: Sprawdzenie dostępności menedżera pakietów.
> - **Rust / Cargo**: Weryfikacja środowiska dla powłoki desktopowej (Tauri).
> - **Docker**: Sprawdzenie obecności klienta Docker.
> - **GitHub CLI (`gh`)**: Obecność i status `gh auth` (Release Hub).
> - **WebView2 Runtime**: Sprawdzenie wpisów rejestru systemowego Windows dla Tauri.
> - **Port Guard**: Skan procesów w stanie LISTEN na portach `:3000` (Web UI) oraz `:4000` (Server API).
> - **Konfiguracja Środowiska**: Plik `.env`, efektywny katalog danych (ADR 0012) oraz `STAGESYNC_REPO_DEV` / `STAGESYNC_DATA_DIR`.

**2. 🚀 Uruchomienie & Dev** - Profile uruchomieniowe i procesy deweloperskie w monorepo

> 1. **🚀 Web UI + API**: Równoległe uruchomienie Vite UI (:3000) oraz serwera API (:4000) (`pnpm dev`).
> 2. **🌐 Web Only**: Uruchomienie wyłącznie frontendu Vite (`pnpm --filter @stagesync/web dev`).
> 3. **⚙️ API Only**: Uruchomienie wyłącznie backendu Node.js (`pnpm --filter @stagesync/server dev`).
> 4. **💻 Desktop Shell**: Uruchomienie powłoki Tauri w trybie deweloperskim wraz z synchronizacją UI (`pnpm --filter @stagesync/desktop dev`).
> 5. **📦 Buduj instalator**: Pełna kompilacja instalatora natywnego Tauri (`pnpm --filter @stagesync/desktop tauri:build`).
> 6. **🧪 Pusty instalator NSIS**: Szybki test wyglądu instalatora Windows NSIS bez budowania sidecarów (`tauri:build:nsis-smoke`).
> 7. **🐳 Stack produkcyjny**: Uruchomienie kontenerów za pomocą Docker Compose (`docker compose up --build`).

**3. 🌐 Sieć & Diagnostyka LAN** - Narzędzia sieciowe i orkiestracja procesów

> 1. **📱 Podgląd LAN IP + Kod QR**: Wybór karty sieciowej (NIC), wygenerowanie adresów LAN (`/client`, `/admin`, `/api/health`) oraz wyrysowanie kodu QR dla urządzeń mobilnych.
> 2. **🔌 Port Guard & Kill-Zombies**: Wykrywanie i zamykanie procesów blokujących porty `:3000`/`:4000` oraz czyszczenie zablokowanych sidecarów Tauri.

**4. 🧪 Testy & Jakość** - Podmenu: Verify / Docs i quality / Unit i bench / Build

> **✅ Verify** (rosnąco wg zakresu)
>
> 1. **Lustrzane CI**: tylko `check-types` → `lint:ss-css` → `lint` → `test` (bez formatu / mutacji).
> 2. **Codzienny gate**: j.w. + `format` + docs links + knip (domyślny check przed pushem).
> 3. **Kompletny audyt**: j.w. + unlinked (gate, **auto-fix** linków) → map → coverage → e2e (**env auto-fix**: shared build, wolne :3000/:4000, świeże webServery, Playwright install / `pnpm install` przy typowych brakach + 1 retry) → build. Bez Sync Launcher UI i Smart Tempo.
>
> Podsumowanie każdego Verify wypisuje krótkie `detail` per krok (liczby testów / links; auto-fix / instalacja e2e **tylko gdy faktycznie zaszły**) oraz linię **Zmienione pliki** gdy krok zapisał pliki (`format`, `unlinked`, `generate:map`).
>
> **📚 Docs i quality**
>
> 1. **Wygeneruj mapę kodu**: Aktualizacja [`docs/REPO_MAP.md`](../REPO_MAP.md) (`pnpm generate:map`).
> 2. **CSS Token Guard (ss-css)**: Walidacja tokenów `--ss-*` (`pnpm lint:ss-css`).
> 3. **Dead Code & Dependency Detector (knip)**: `pnpm lint:knip`.
> 4. **Weryfikacja linków w dokumentacji**: `check-docs-links.mjs`.
> 5. **Niepodlinkowane odniesienia (skan → naprawa)**: najpierw `check-unlinked.mjs`, potem pytanie o `fix-unlinked-links.mjs`.
>
> **🧪 Unit i bench**
>
> 1. **@stagesync/shared**, **@stagesync/server**, **@stagesync/web**, **@stagesync/ui** — testy jednostkowe.
> 2. **E2E Playwright** (`pnpm --filter @stagesync/web test:e2e`).
> 3. **Coverage** (`pnpm test:coverage`).
> 4. **Smart Tempo DSP Benchmark**.
>
> **🏗 Build**
>
> 1. **Pełny Build (Turbo)**: `pnpm build`.
> 2. **Sync Launcher UI**: `pnpm sync:launcher-ui`.

**5. 🐙 GitHub & Wydania (Release Hub)** - Orkiestracja cyklu wydań i wersji SemVer

> 1. **🔍 Status Git & Hygiene**: Odczyt bieżącej gałęzi, ostatnich commitów i modyfikowanych plików.
> 2. **🏷 Synchronizacja Wersji Monorepo**: Propagacja numeru wersji z [`package.json`](../../package.json) do aplikacji web, server, Tauri, Android i Docker.
> 3. **📋 Pre-Release Checklist 2.0**: Lustrzane CI (`check-types` → `lint:ss-css` → `lint` → `test`), potem podgląd tytułu i Release Notes.
> 4. **👁 Podgląd Informacji o Wydaniu**: Tytuł i notatka wydania z wersji w [`package.json`](../../package.json).
> 5. **✂️ Wyodrębnij sekcję Changeloga**: Prompt o wersję (domyślnie z [`package.json`](../../package.json)), potem ekstrakcja sekcji CHANGELOG.
> 6. **🚀 Przygotowanie Taga (`cut-release`)**: Podbicie SemVer (`patch` / `minor` / `major` / `alpha` / `beta`) z potwierdzeniem.
> 7. **⚡ Release (`exec-release`)**: Publikacja wydania z potwierdzeniem.

**6. 📦 Zależności & Pakiety** - Zarządzanie pakietami monorepo przez pnpm

> 1. **🔍 Sprawdź nieaktualne pakiety**: Podgląd nieaktualnych zależności (`pnpm outdated -r`).
> 2. **🆙 Interaktywna aktualizacja pakietów**: Wygodna aktualizacja pakietów (`pnpm up -i -r --latest`).
> 3. **📥 Wymuś ponowną instalację**: Wymuszenie czystej instalacji (`pnpm install --force`).
> 4. **🛡️ Audyt bezpieczeństwa**: Skanowanie podatności w pakietach (`pnpm audit`).
> 5. **🧹 Czyszczenie pnpm store**: Usuwanie nieużywanych pakietów z magazynu pnpm (`pnpm store prune`).

**7. 🧹 Konserwacja & Cache** - Głębokie czyszczenie środowiska kompilacji

> - Automatyczne wykrywanie i usuwanie katalogów `dist`, `.vite`, `.turbo`, `coverage`, `.cache` ze wszystkich aplikacji i pakietów.
> - Czyszczenie katalogu `src-tauri/target` dla aplikacji desktopowej.
> - Precyzyjne raportowanie usuniętych i zablokowanych katalogów.

**8. 💾 Zarządzanie danymi & Logi** - Operacje na efektywnym katalogu danych (ADR 0012)

> Efektywna ścieżka: `STAGESYNC_DATA_DIR` → `STAGESYNC_REPO_DEV` (`<repo>/data`) → `~/Documents/StageSync` → fallback `<repo>/data`.
>
> 1. **📝 Podgląd ostatnich logów**: Ostatnie 2000 znaków z najnowszego pliku w `<dataDir>/logs/` (sortowanie po `mtime`).
> 2. **🗑 Wyczyść katalog danych**: Czyszczenie efektywnego katalogu (confirm z pełną ścieżką); w repo `data/` zachowywany jest `README.md`.

**9. 🛠 Setup Środowiska** - Natywny instalator zależności systemowych

> - Automatyczne rozróżnienie systemu operacyjnego.
> - Uruchomienie natywnego skryptu `setup.ps1` (Windows via PowerShell) lub `setup.sh` (macOS/Linux via Bash).

---

### 💡 Wszystkie Bezpośrednie Skróty CLI (Headless Mode)

Możesz uruchamiać moduły bezpośrednio z terminala z pominięciem interaktywnego menu.

> `[cmd]` oznacza polecenie uruchomienia np. `dev`, `.\dev` lub `./dev`

| Skrót CLI        | Aliasy                        | Opis i Działanie                                                                           |
| ---------------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `[cmd] doctor`   | —                             | **Preflight Scan**: Skan środowiska (Node, pnpm, Rust, `gh`, porty, data dir, `.env`).     |
| `[cmd] ports`    | —                             | **Safe Port Guard**: Wykrywanie i zamykanie procesów LISTEN (:3000 / :4000).               |
| `[cmd] clean`    | —                             | **Cache Cleaner**: Głębokie czyszczenie pamięci podręcznej i artefaktów buildów.           |
| `[cmd] network`  | `ip`                          | **LAN Info & QR**: Podgląd IP w sieci lokalnej i kod QR dla urządzeń mobilnych.            |
| `[cmd] web`      | `dev`                         | **Dev Profile**: Web UI (:3000) + API Server (:4000).                                      |
| `[cmd] desktop`  | —                             | **Dev Profile**: Powłoka Tauri w trybie deweloperskim.                                     |
| `[cmd] types`    | —                             | **TypeScript Check**: Weryfikacja typów w całym monorepo.                                  |
| `[cmd] verify`   | `ci`                          | **Lustrzane CI**: `check-types` → `lint:ss-css` → `lint` → `test` (bez format; exit code). |
| `[cmd] pr`       | `before-pr`, `daily`, `gate`  | **Codzienny gate**: Lustrzane CI + `format` + docs links + knip (exit code).               |
| `[cmd] all`      | `full`, `everything`, `audit` | **Kompletny audyt**: + unlinked (auto-fix) + map + coverage + e2e (env auto-fix) + build.  |
| `[cmd] knip`     | —                             | **Dead Code Detector**: Wykrywanie nieużywanego kodu i zależności.                         |
| `[cmd] ss-css`   | `css`                         | **CSS Token Guard**: Walidacja zmiennych CSS (`--ss-*`).                                   |
| `[cmd] links`    | —                             | **Docs Link Checker**: Weryfikacja odnośników w dokumentacji Markdown.                     |
| `[cmd] map`      | —                             | **Repo Map Generator**: Aktualizacja pliku [`docs/REPO_MAP.md`](../REPO_MAP.md).           |
| `[cmd] test`     | —                             | **Testing Suite**: Sub-menu Verify / Docs / Unit / Build.                                  |
| `[cmd] release`  | —                             | **Release Hub**: Interaktywne zarządzanie wydaniami i tagami SemVer.                       |
| `[cmd] deps`     | `dependencies`, `pnpm`        | **Pakiety & Zależności**: Przejście do sub-menu zarządzania pakietami.                     |
| `[cmd] outdated` | —                             | **Outdated Check**: Sprawdzanie nieaktualnych pakietów w monorepo.                         |
| `[cmd] up`       | `update`                      | **Interactive Update**: Interaktywna aktualizacja pakietów (`pnpm up`).                    |
| `[cmd] audit`    | —                             | **Security Audit**: Audyt bezpieczeństwa zależności (`pnpm audit`).                        |

---

### 🛠️ Pozostałe Narzędzia (`scripts/`)

_Szczegółowe opisy automatyzacji znajdują się w [scripts/README.md](../../scripts/README.md)._
