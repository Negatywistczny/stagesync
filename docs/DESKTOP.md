# StageSync — desktop shell (Tauri)

Thin **WebView** window for Admin / Timeline / Client — [ADR 0010](./adr/0010-desktop-shell-tauri.md).

**β1:** shell ładuje URL lokalnego serwera (`STAGESYNC_URL`, domyślnie `http://127.0.0.1:4000`).  
**Bez** sidecar Node w bundlu; **bez** MIDI / zegara muzycznego w procesie Tauri.

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

1. Uruchom host StageSync (Docker / `pnpm dev`).
2. W Adminie → sekcja **O aplikacji** → **Sprawdź aktualizacje**.
3. Jeśli jest nowsza wersja shella: **Aktualizuj aplikację**.
4. Shell pobierze podpisany bundle (minisign), zamknie się i zainstaluje nową wersję.

> Aktualizacja shella wymaga połączenia z internetem. Dane projektów są w serwerze — shell ich nie przechowuje.

## Wymagania (dev / build)

- Rust toolchain (`rustup`) + platform deps Tauri 2  
  — https://v2.tauri.app/start/prerequisites/
- Działający host StageSync na `:4000` ([INSTALL.md](./INSTALL.md))

## Dev

```sh
# Terminal A — host
docker compose up --build
# albo: pnpm dev

# Terminal B — shell
pnpm install
pnpm --filter @stagesync/desktop tauri dev
```

Opcjonalnie: `STAGESYNC_URL=http://127.0.0.1:4000 pnpm --filter @stagesync/desktop tauri dev`

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
