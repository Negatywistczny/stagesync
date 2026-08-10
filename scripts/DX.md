# 🛠️ StageSync DX Guide

Informacje dotyczące trybu deweloperskiego, uruchamiania i automatyzacji w projekcie StageSync.

## 🚀 Uruchamianie (Entrypoint)

Użyj odpowiedniego pliku w zależności od używanego systemu i powłoki:

<details>
<summary><b>🪟 Windows</b></summary>
<br>

**CMD (Wiersz Poleceń) — skrypt `.cmd`**

   ```cmd
   dev
   ```

**PowerShell — skrypt `.cmd` (zalecane)**

   ```powershell
   .\dev.cmd
   ```

**PowerShell — natywny skrypt `.ps1`**

   ```powershell
   # Jednorazowe przyznanie uprawnień
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

   .\dev
   # lub
   .\dev.ps1
   ```

</details>
<details>
<summary><b>🍏 macOS / 🐧 Linux</b></summary>
<br>

**Bash (zalecane)**

   ```bash
   bash dev
   ```

**Wywołanie pliku**

   ```bash
   ./dev
   ```

<br>
</details>
<details>
<summary><b>🌐 Uniwersalne (wymaga node.js & pnpm)</b></summary>
<br>

```bash
pnpm dev:hub
```
</details>

## ⚙️ Wymagania środowiskowe
- **Node.js**: >= 22 (zalecane użycie `fnm` lub `nvm` do zarządzania wersjami).
- **pnpm**: Zarządzane przez `corepack` (dołączone w skryptach launchera).
- **Git**: Do zarządzania repozytorium.
- **Tauri / Rust**: Wymagane do budowania natywnego shella (sprawdź `docs/guides/DESKTOP.md`).

## 🎛️ Centrum Dowodzenia — Dev Hub ([`scripts/dev-hub.ts`](./dev-hub.ts))

Dev Hub to interaktywne TUI, które zarządza wszystkimi aspektami projektu.

### 📂 Kategorie Zadań w Interaktywnym Menu Dev Hub

<details>
<summary><b>1. 🏥 Szybka Diagnostyka</b> - Automatyczny, bezinwazyjny skan środowiska deweloperskiego (Preflight Scan)</summary>

> - **Node.js**: Weryfikacja wersji w systemie (wymagany min. Node 22 LTS).
> - **pnpm**: Sprawdzenie dostępności menedżera pakietów.
> - **Rust / Cargo**: Weryfikacja środowiska dla powłoki desktopowej (Tauri).
> - **Docker**: Sprawdzenie obecności klienta Docker.
> - **WebView2 Runtime**: Sprawdzenie wpisów rejestru systemowego Windows dla Tauri.
> - **Port Guard**: Skan dostępności i zajętości portów `:3000` (Web UI) oraz `:4000` (Server API).
> - **Konfiguracja Środowiska**: Sprawdzenie pliku `.env` oraz zmiennej `STAGESYNC_DATA_DIR`.

</details>

<details>
<summary><b>2. 🚀 Uruchomienie & Dev</b> - Profile uruchomieniowe i procesy deweloperskie w monorepo</summary>

> 1. **🚀 Web UI + API**: Równoległe uruchomienie Vite UI (:3000) oraz serwera API (:4000) (`pnpm dev`).
> 2. **🌐 Web Only**: Uruchomienie wyłącznie frontendu Vite (`pnpm --filter @stagesync/web dev`).
> 3. **⚙️ API Only**: Uruchomienie wyłącznie backendu Node.js (`pnpm --filter @stagesync/server dev`).
> 4. **💻 Desktop Shell**: Uruchomienie powłoki Tauri w trybie deweloperskim wraz z synchronizacją UI (`pnpm --filter @stagesync/desktop dev`).
> 5. **📦 Buduj instalator**: Pełna kompilacja instalatora natywnego Tauri (`pnpm --filter @stagesync/desktop tauri:build`).
> 6. **🧪 Pusty instalator NSIS**: Szybki test wyglądu instalatora Windows NSIS bez budowania sidecarów (`tauri:build:nsis-smoke`).
> 7. **🐳 Stack produkcyjny**: Uruchomienie kontenerów za pomocą Docker Compose (`docker compose up --build`).

</details>

<details>
<summary><b>3. 🌐 Sieć & Diagnostyka LAN</b> - Narzędzia sieciowe i orkiestracja procesów</summary>

> 1. **📱 Podgląd LAN IP + Kod QR**: Wybór karty sieciowej (NIC), wygenerowanie adresów LAN (`/client`, `/admin`, `/api/health`) oraz wyrysowanie kodu QR dla urządzeń mobilnych.
> 2. **🔌 Port Guard & Kill-Zombies**: Wykrywanie i zamykanie procesów blokujących porty `:3000`/`:4000` oraz czyszczenie zablokowanych sidecarów Tauri.

</details>

<details>
<summary><b>4. 🧪 Testy & Jakość</b> - Kompleksowy zestaw weryfikatorów, linterów i testów jednostkowych</summary>

> 1. **✅ One-Click Full Verify**: Zbiórka głównych weryfikacji w jednym kroku (typy TS, linter, knip, testy).
> 2. **🗺 Wygeneruj mapę kodu**: Aktualizacja pliku `docs/REPO_MAP.md` (`pnpm generate:map`).
> 3. **🔍 Sprawdź typy TypeScript**: Statyczna kontrola typowania (`pnpm check-types`).
> 4. **🎨 CSS Token Guard (ss-css)**: Walidacja zgodności zmiennych CSS (`--ss-*`) i zakaz stosowania ad-hoc kolorów HEX (`pnpm lint:ss-css`).
> 5. **📦 Dead Code & Dependency Detector (knip)**: Skanowanie nieużywanych plików i pakietów (`pnpm lint:knip`).
> 6. **🔗 Weryfikacja linków w dokumentacji**: Skanowanie odnośników w dokumentacji Markdown (`node scripts/quality/check-docs-links.mjs`).
> 7. **🔍 Znajdź niepodlinkowane pliki**: Wykrywanie sierocych dokumentów (`check-unlinked.mjs`).
> 8. **🛠 Napraw niepodlinkowane linki**: Automatyczny naprawiacz odnośników (`fix-unlinked-links.mjs`).
> 9. **⚡ Testy PPQ/Ticks (@stagesync/shared)**: Testy jednostkowe pakietu współdzielonego.
> 10. **🎼 Testy serwera transportu (@stagesync/server)**: Testy jednostkowe backendu.
> 11. **🎨 Testy UI Admin/Client (@stagesync/web)**: Testy interfejsu użytkownika.
> 12. **🎯 Smart Tempo DSP Benchmark**: Benchmark wydajnościowy algorytmów audio DSP.
> 13. **🧹 Auto-Fixer (Format & Lint)**: Automatyczne poprawki lintera i formatowanie kodu (`pnpm format` + `pnpm lint`).
> 14. **🏗 Pełny Build (Turbo)**: Kompilacja produkcyjna całego monorepo (`pnpm build`).
> 15. **📊 Testy z pokryciem (Coverage)**: Generowanie raportów pokrycia kodu testami (`pnpm test:coverage`).
> 16. **💾 Migracja Legacy**: Skrypty migracyjne starych struktur danych (`pnpm migrate:legacy`).
> 17. **🔄 Sync Launcher UI**: Synchronizacja zasobów interfejsu użytkownika launchera (`pnpm sync:launcher-ui`).

</details>

<details>
<summary><b>5. 🐙 GitHub & Wydania (Release Hub)</b> - Orkiestracja cyklu wydań i wersji SemVer</summary>

> 1. **🔍 Status Git & Hygiene**: Odczyt bieżącej gałęzi, ostatnich commitów i modyfikowanych plików.
> 2. **🏷 Synchronizacja Wersji Monorepo**: Propagacja numeru wersji z `package.json` do aplikacji web, server, Tauri, Android i Docker.
> 3. **📋 Pre-Release Checklist 2.0**: Zbiór testów pre-release (typy, CSS, linki, lint, mapa repo).
> 4. **👁 Podgląd Informacji o Wydaniu**: Generowanie tytułu i nagłówków notatki wydania (Release Notes) w trybie podglądu.
> 5. **✂️ Wyodrębnij sekcję Changeloga**: Ekstrakcja pojedynczej wersji z CHANGELOG.
> 6. **🚀 Przygotowanie Taga (`cut-release`)**: Podbicie wersji SemVer (`patch`, `minor`, `major`, `alpha`, `beta`).
> 7. **⚡ Release (`exec-release`)**: Wykonanie procedury publikacji wydania.

</details>

<details>
<summary><b>6. 📦 Zależności & Pakiety</b> - Zarządzanie pakietami monorepo przez pnpm</summary>

> 1. **🔍 Sprawdź nieaktualne pakiety**: Podgląd nieaktualnych zależności (`pnpm outdated -r`).
> 2. **🆙 Interaktywna aktualizacja pakietów**: Wygodna aktualizacja pakietów (`pnpm up -i -r --latest`).
> 3. **📥 Wymuś ponowną instalację**: Wymuszenie czystej instalacji (`pnpm install --force`).
> 4. **🛡️ Audyt bezpieczeństwa**: Skanowanie podatności w pakietach (`pnpm audit`).
> 5. **🧹 Czyszczenie pnpm store**: Usuwanie nieużywanych pakietów z magazynu pnpm (`pnpm store prune`).

</details>

<details>
<summary><b>7. 🧹 Konserwacja & Cache</b> - Głębokie czyszczenie środowiska kompilacji</summary>

> - Automatyczne wykrywanie i usuwanie katalogów `dist`, `.vite`, `.turbo`, `coverage`, `.cache` ze wszystkich aplikacji i pakietów.
> - Czyszczenie katalogu `src-tauri/target` dla aplikacji desktopowej.
> - Precyzyjne raportowanie usuniętych i zablokowanych katalogów.

</details>

<details>
<summary><b>8. 💾 Zarządzanie danymi & Logi</b> - Operacje na plikach wykonawczych i dziennikach zdarzeń</summary>

> 1. **📝 Podgląd ostatnich logów**: Wyświetlenie ostatnich 2000 znaków z najnowszego pliku w `data/logs/`.
> 2. **🗑 Wyczyść katalog danych (data/)**: Czyszczenie plików danych aplikacji z pominięciem pliku `README.md`.

</details>

<details>
<summary><b>9. 🛠 Setup Środowiska</b> - Natywny instalator zależności systemowych</summary>

> - Automatyczne rozróżnienie systemu operacyjnego.
> - Uruchomienie natywnego skryptu `setup.ps1` (Windows via PowerShell) lub `setup.sh` (macOS/Linux via Bash).

</details>
<br>

---

### 💡 Wszystkie Bezpośrednie Skróty CLI (Headless Mode)

Możesz uruchamiać moduły bezpośrednio z terminala z pominięciem interaktywnego menu 
>`[cmd]` oznacza polecenie uruchomienia np. `dev`, `.\dev` lub `./dev`

| Skrót CLI | Aliasy | Opis i Działanie |
| :--- | :--- | :--- |
| `[cmd] doctor` | — | **Preflight Scan**: Skan środowiska (Node, pnpm, Rust, porty, `.env`). |
| `[cmd] ports` | — | **Safe Port Guard**: Wykrywanie i zamykanie kolizyjnych procesów (:3000 / :4000). |
| `[cmd] clean` | — | **Cache Cleaner**: Głębokie czyszczenie pamięci podręcznej i artefaktów buildów. |
| `[cmd] network` | `ip` | **LAN Info & QR**: Podgląd IP w sieci lokalnej i kod QR dla urządzeń mobilnych. |
| `[cmd] web` | `dev` | **Dev Profile**: Web UI (:3000) + API Server (:4000). |
| `[cmd] desktop` | — | **Dev Profile**: Powłoka Tauri w trybie deweloperskim. |
| `[cmd] types` | — | **TypeScript Check**: Weryfikacja typów w całym monorepo. |
| `[cmd] knip` | — | **Dead Code Detector**: Wykrywanie nieużywanego kodu i zależności. |
| `[cmd] ss-css` | `css` | **CSS Token Guard**: Walidacja zmiennych CSS (`--ss-*`). |
| `[cmd] links` | — | **Docs Link Checker**: Weryfikacja odnośników w dokumentacji Markdown. |
| `[cmd] map` | — | **Repo Map Generator**: Aktualizacja pliku `docs/REPO_MAP.md`. |
| `[cmd] test` | — | **Testing Suite**: Przejście do sub-menu testów jednostkowych i benchmarków. |
| `[cmd] release` | — | **Release Hub**: Interaktywne zarządzanie wydaniami i tagami SemVer. |
| `[cmd] deps` | `dependencies`, `pnpm` | **Pakiety & Zależności**: Przejście do sub-menu zarządzania pakietami. |
| `[cmd] outdated` | — | **Outdated Check**: Sprawdzanie nieaktualnych pakietów w monorepo. |
| `[cmd] up` | `update` | **Interactive Update**: Interaktywna aktualizacja pakietów (`pnpm up`). |
| `[cmd] audit` | — | **Security Audit**: Audyt bezpieczeństwa zależności (`pnpm audit`). |

---

### 🛠️ Pozostałe Narzędzia (`scripts/`)
*Szczegółowe opisy automatyzacji znajdują się w [scripts/README.md](./README.md).*
