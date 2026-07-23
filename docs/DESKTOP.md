# StageSync — desktop shell (Tauri)

Thin **WebView** window for Admin / Timeline / Client — [ADR 0010](./adr/0010-desktop-shell-tauri.md), [ADR 0014](./adr/0014-desktop-launcher.md).

**Start (Launcher):** po włączeniu aplikacji widać ekran wyboru hosta (nie od razu Admin):
- **Uruchom lokalny host** — spawnuje wbudowany Node sidecar na `http://127.0.0.1:4000`, czeka na `/api/health`, potem otwiera Admin;
- **Wykryte w sieci** — lista hostów z mDNS (`_stagesync._tcp`); wymaga włączonego mDNS na hoście i bind ≠ tylko localhost; wybór IP preferuje LAN (pomija loopback / link-local, odsuwa most Docker `172.17`);
- **Połącz ręcznie** / **Ostatnio używane** — wpisz `http://host:port` (probe health, timeout ~3 s → Admin). Przy różnicy wersji host/aplikacja — ostrzeżenie (nie twardy blok).

Błędy startu lokalnego hosta (port zajęty, timeout, uprawnienia, zła wersja, crash sidecara) pokazuje Launcher z logiem i **Ponów** — bez białego ekranu. Gdy lokalny host padnie w trakcie sesji, shell wraca do Launchera z komunikatem. Przy utracie WS: banner „Utracono połączenie…” + **Wróć do wyboru hosta** (gdy IPC Tauri dostępne, zwykle lokalny `127.0.0.1:4000`).

**β1+:** lokalny API sidecara na `http://127.0.0.1:4000` gdy wybrano lokalny host.  
Zamknięcie okna albo **Zakończ** (⌘/Ctrl+Q) zatrzymuje lokalny host; przy kolejnym starcie shell sprząta porzucony `stagesync-host` na porcie 4000 (np. po Force Quit).  
**Domyślny widok po połączeniu:** **Admin** (`/admin`) — okno operatora (ADR 0010). Klient (`/client`) w shellu; w przeglądarce / Dockerze root `/` nadal to Client.  
**Nawigacja desktop ([ADR 0010](./adr/0010-desktop-shell-tauri.md)):** menu OS **StageSync** | **Plik** | **Edycja** | **Widok** | **Transport** | **Host** | **Pomoc** — bez osobnego chrome `ShellModeNav`.

| Menu | Pozycje |
|------|---------|
| **StageSync** | O programie; Sprawdź aktualizacje…; Zakończ |
| **Plik** | Otwórz ostatnie; Zapisz (`⌘/Ctrl+S`); Zamknij projekt |
| **Edycja** | Wytnij / Kopiuj / Wklej / Zaznacz wszystko (`⌘/Ctrl+X/C/V/A`) — `PredefinedMenuItem` (macOS First Responder; skróty w polach tekstowych WebView) |
| **Widok** | Admin / Timeline / Klient (`⌘/Ctrl+1…3`); Zakładki Admina (`⌥/Alt+1…4`); Pełny ekran |
| **Transport** | Odtwórz; Stop; Poprzedni / Następny utwór (`⌥/Alt+←/→`) — SSOT `/api/transport/*` |
| **Host** | Status; Klienci / urządzenia; Kod QR… (LAN URL); Restart hosta; Ustawienia… |
| **Pomoc** | Dokumentacja online; Zgłoś problem; O programie (Win/Linux) |

**Faza A** = StageSync / Widok / Pomoc (**α12**). **Faza B+C** = Plik / Host / Transport (**β2**). **Faza D** = Edycja (Usuń + Undo grey-out) / Widok zoom / Pomoc skróty — **wydane w `v5.0.0` Overture** ([#460](https://github.com/Negatywistczny/stagesync/pull/460)) — [ROADMAP.md](./ROADMAP.md) § Desktop OS menu.  
**Bez** MIDI / zegara muzycznego w procesie Tauri — Host MIDI I/O + clock żyje wyłącznie w `apps/server` (`GET/PUT /api/midi`, [ADR 0010](./adr/0010-desktop-shell-tauri.md) / [ADR 0002](./adr/0002-timebase-ssot.md)). Akcje menu → `navigate` albo `CustomEvent` w WebView (shell nie jest autorytetem czasu); Admin → Host pokazuje status MIDI.

> **Dane projektów** są przechowywane przez serwer w katalogu użytkownika (OS standard) —
> shell nie trzyma żadnych danych. Szczegóły: [ADR 0012](./adr/0012-user-data-location.md).

## Instalacja (gotowe instalatory)

Pobierz instalator dla swojej platformy z [GitHub Releases](https://github.com/Negatywistczny/stagesync/releases):

| Platforma | Plik |
|-----------|------|
| macOS | `StageSync_x.y.z_aarch64.dmg` lub `x64.dmg` |
| Windows | `StageSync_x.y.z_x64.msi` |

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

Od Launchera (ADR 0014): UI pokazuje **status + log sidecara** z akcją **Ponów** (nie surowy whitescreen).

Komunikat o zajętym porcie `4000` bywał **mylący**: shell czekał na `GET /api/health`, a prawdziwy błąd (crash sidecara Node, `ERR_MODULE_NOT_FOUND`, blokada Defendera) był ignorowany.

Od α12+ / Launcher:
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
> `latest.json` musi zawierać **darwin-aarch64** i **windows-x86_64** — macOS buduje target `app` (`.app.tar.gz` + `.sig`) obok `dmg`; bez `app` bundler pomija updater artifacts i zostaje tylko Windows (last-writer).

## Wymagania (dev / build)

- Rust toolchain (`rustup`) + platform deps Tauri 2  
  — https://v2.tauri.app/start/prerequisites/
- W β1 host jest uruchamiany automatycznie przez aplikację (sidecar Node).
- W dev / thin-shell możesz użyć zewnętrznego hosta przez `STAGESYNC_URL`.
- **CI na PR nie odpala Rust / Tauri** — tylko `lint-types-test-build`. Pełny
  build `.dmg` / `.msi` i `cargo` są w [Release workflow](../.github/workflows/release.yml)
  (tagi `v*`). Lokalnie: `cargo check` w `apps/desktop/src-tauri` przed zmianami shelła.

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

**Drag-and-drop plików:** okno ma `dragDropEnabled: false` — Tauri nie przejmuje dropów OS, więc działają HTML5 `onDrop` / `dataTransfer` w Admin (import biblioteki) i drag setlisty. Natywne ścieżki plików z `onDragDropEvent` nie są używane (upload idzie przez `File` + HTTP jak w przeglądarce).

## Build lokalny (macOS / Windows)

```sh
pnpm --filter @stagesync/desktop tauri build
```

| Platforma | Artefakt | CI |
|-----------|----------|----|
| macOS | `.dmg` | Release workflow (tag `v*`) — macOS runner |
| Windows | `.msi` | Release workflow (tag `v*`) — Windows runner |

## Zakazy (ADR 0010)

- Transport SSOT tylko w `apps/server`
- Brak device MIDI I/O wyłącznie w procesie Tauri — MIDI = `apps/server` (`/api/midi`); Tauri nie otwiera portów MIDI
- Auto-update w tle / sklepy OS — OUT β1 (β2+)
