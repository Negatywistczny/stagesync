# StageSync — desktop shell (Tauri)

Thin **WebView** window for Admin / Timeline / Client — [ADR 0010](./adr/0010-desktop-shell-tauri.md).

**β1:** aplikacja uruchamia wbudowany serwer w postaci **Node sidecar**, wystawia lokalny API na `http://127.0.0.1:4000`, a shell ładuje UI z tego adresu.  
**Domyślny widok desktop:** **Admin** (`/admin`) — okno operatora (ADR 0010). Klient (`/client`) w shellu; w przeglądarce / Dockerze root `/` nadal to Client.  
**Nawigacja desktop:** menu OS **Widok** (Admin / Timeline / Klient) + **StageSync → Zakończ** — bez osobnego chrome `ShellModeNav` (ADR 0010).  
**Bez** MIDI / zegara muzycznego w procesie Tauri.

> **Dane projektów** są przechowywane przez serwer w katalogu użytkownika (OS standard) —
> shell nie trzyma żadnych danych. Szczegóły: [ADR 0012](./adr/0012-user-data-location.md).

## Instalacja (gotowe instalatory)

Pobierz instalator dla swojej platformy z [GitHub Releases](https://github.com/Negatywistczny/stagesync/releases):

| Platforma | Plik |
|-----------|------|
| macOS | `StageSync_x.y.z_aarch64.dmg` lub `x64.dmg` |
| Windows | `StageSync_x.y.z_x64_en-US.msi` |

### Instalacja bez podpisu cyfrowego (beta)

Instalatory beta nie są podpisane certyfikatem OS. Obejście:

**macOS — Gatekeeper:**
1. Prawym klikiem na `.dmg` → **Otwórz** → **Otwórz** (potwierdzenie).
2. Alternatywnie: System Settings → Privacy & Security → **Otwórz mimo to**.

**Windows — SmartScreen:**
1. Kliknij **Więcej informacji** w ostrzeżeniu SmartScreen.
2. Kliknij **Uruchom mimo to**.

## Aktualizacja desktop shell

Gdy jest dostępna nowa wersja:

1. Uruchom aplikację StageSync.
2. W Adminie → sekcja **O aplikacji** → **Sprawdź aktualizacje**.
3. Jeśli jest nowsza wersja shella: **Aktualizuj aplikację**.
4. Shell pobierze podpisany bundle (minisign), zamknie się i zainstaluje nową wersję.

> Aktualizacja shella wymaga połączenia z internetem. Dane projektów są w serwerze — shell ich nie przechowuje.

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
- Brak device MIDI I/O wyłącznie w procesie Tauri
- Auto-update w tle / sklepy OS — OUT β1 (β2+)
