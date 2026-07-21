# StageSync — desktop shell (Tauri)

Thin **WebView** window for Admin / Timeline / Client — [ADR 0010](./adr/0010-desktop-shell-tauri.md).

**β1:** aplikacja uruchamia wbudowany serwer w postaci **Node sidecar**, wystawia lokalny API na `http://127.0.0.1:4000`, a shell ładuje UI z tego adresu.  
**Domyślny widok desktop:** **Admin** (`/admin`) — okno operatora (ADR 0010). Klient (`/client`) w shellu; w przeglądarce / Dockerze root `/` nadal to Client.  
**Nawigacja desktop (Faza A, [ADR 0010](./adr/0010-desktop-shell-tauri.md)):** menu OS **StageSync** | **Widok** | **Pomoc** — bez osobnego chrome `ShellModeNav`.

| Menu | Pozycje |
|------|---------|
| **StageSync** | O programie; Sprawdź aktualizacje…; Zakończ |
| **Widok** | Admin / Timeline / Klient (`⌘/Ctrl+1…3`); Zakładki Admina (`⌥/Alt+1…4`); Pełny ekran |
| **Pomoc** | Dokumentacja online; Zgłoś problem; O programie (Win/Linux) |

Kolejne fazy menu: **Faza B** (Plik / Host) + **Faza C** (Transport) → **must β2**; Faza D → 5.0.0 — [ROADMAP.md](./ROADMAP.md) § Desktop OS menu.  
**Bez** MIDI / zegara muzycznego w procesie Tauri — Host MIDI I/O + clock żyje wyłącznie w `apps/server` (`GET/PUT /api/midi`, [ADR 0010](./adr/0010-desktop-shell-tauri.md) / [ADR 0002](./adr/0002-timebase-ssot.md)). Shell tylko wyświetla status Admin → Host.

> **Dane projektów** są przechowywane przez serwer w katalogu użytkownika (OS standard) —
> shell nie trzyma żadnych danych. Szczegóły: [ADR 0012](./adr/0012-user-data-location.md).

## Instalacja (gotowe instalatory)

Pobierz instalator dla swojej platformy z [GitHub Releases](https://github.com/Negatywistczny/stagesync/releases):

| Platforma | Plik |
|-----------|------|
| macOS | `StageSync_x.y.z_aarch64.dmg` lub `x64.dmg` |
| Windows | `StageSync_x.y.z_x64_en-US.msi` |

### Instalacja bez podpisu cyfrowego (beta)

Instalatory beta nie są podpisane certyfikatem Apple / SmartScreen. Na nowszym macOS Gatekeeper często pokazuje mylący komunikat **„Rzecz … jest uszkodzona”** zamiast „nieznany deweloper”.

**macOS — po skopiowaniu StageSync do `/Applications`:**

```sh
xattr -cr /Applications/StageSync.app
open /Applications/StageSync.app
```

To zdejmuje flagę kwarantanny (Chrome / Safari). Trzeba powtórzyć **po każdej świeżej instalacji** z `.dmg`.

Alternatywy: prawy klik na `.app` → **Otwórz** → **Otwórz**; albo System Settings → Privacy & Security → **Otwórz mimo to**.

**Windows — SmartScreen:**
1. Kliknij **Więcej informacji** w ostrzeżeniu SmartScreen.
2. Kliknij **Uruchom mimo to**.

### Windows — host nie startuje

Komunikat o zajętym porcie `4000` bywał **mylący**: shell czekał na `GET /api/health`, a prawdziwy błąd (crash sidecara Node, `ERR_MODULE_NOT_FOUND`, blokada Defendera) był ignorowany.

Od α12+:
- przy awarii hosta UI pokazuje **log sidecara** (nie zakładaj od razu zajętego portu);
- pierwsze uruchomienie na Windows może potrwać dłużej (skan Defendera) — timeout startu to ~2 min.

**`EISDIR: lstat 'C:'` (α13):** Node dostał ścieżkę Win32 z prefiksem `\\?\` (verbatim) jako main module — `realpathSync` zwija ją do gołego `C:`. Naprawione w shellu (względne `dist/index.js` + cwd bez `\\?\`). Po instalacji α13+ przeinstaluj MSI; jeśli stary build nadal pada z tym logiem — to oczekiwane, potrzebny nowy instalator.

Jeśli nadal pada: zamknij StageSync, w PowerShell `netstat -ano | findstr :4000` (powinno być pusto), uruchom ponownie. Przy `ERR_MODULE_NOT_FOUND` / braku zależności — przeinstaluj z najnowszego [Release](https://github.com/Negatywistczny/stagesync/releases).

## Aktualizacja desktop shell

Gdy jest dostępna nowa wersja:

1. Uruchom aplikację StageSync.
2. W Adminie → sekcja **O aplikacji** → **Sprawdź aktualizacje**.
3. Jeśli jest nowsza wersja shella: **Aktualizuj aplikację**.
4. Shell pobierze podpisany bundle (minisign), zamknie się i zainstaluje nową wersję.

> Aktualizacja shella wymaga połączenia z internetem. Dane projektów są w serwerze — shell ich nie przechowuje.
>
> Manifest updatera: `…/releases/latest/download/latest.json`. Release na GitHub **nie może** być oznaczony jako prerelease (semver `-beta` w tagu jest OK) — inaczej `/releases/latest` zwraca 404.

## Wymagania (dev / build)

- Rust toolchain (`rustup`) + platform deps Tauri 2  
  — https://v2.tauri.app/start/prerequisites/
- W β1 host jest uruchamiany automatycznie przez aplikację (sidecar Node).
- W dev / thin-shell możesz użyć zewnętrznego hosta przez `STAGESYNC_URL`.

## Dev

```sh
# Terminal A — opcjonalny zewnętrzny host (thin-shell)
docker compose up --build
# albo: pnpm dev

# Terminal B — shell
pnpm install
pnpm --filter @stagesync/desktop tauri dev
```

Opcjonalnie (dev / thin-shell): `STAGESYNC_URL=http://127.0.0.1:4000/admin pnpm --filter @stagesync/desktop tauri dev`

**Pełny ekran:** w aplikacji desktop przycisk przełącza **natywne okno** (Tauri); w przeglądarce — HTML Fullscreen API (Klient na tablecie).

## Build lokalny (macOS / Windows)

```sh
pnpm --filter @stagesync/desktop tauri build
```

| Platforma | Artefakt | CI |
|-----------|----------|----|
| macOS | `.dmg` | `cargo check` w CI (ubuntu) + manual mac build |
| Windows | `.msi` | manual na Win (lub CI release workflow) |

## Zakazy (ADR 0010)

- Transport SSOT tylko w `apps/server`
- Brak device MIDI I/O wyłącznie w procesie Tauri — MIDI = `apps/server` (`/api/midi`); Tauri nie otwiera portów MIDI
- Auto-update w tle / sklepy OS — OUT β1 (β2+)
