# Scope beta.1 — Desktop standalone-first host / dystrybucja

**Wersja docelowa:** `5.0.0-beta.1` (tag / bump **tylko na prośbę**)  
**Podstawa:** [ROADMAP.md](../../ROADMAP.md) · [TODO.md](../../TODO.md) · [ADR 0004](../../adr/0004-updates-docker.md) · [ADR 0010](../../adr/0010-desktop-shell-tauri.md) · [ADR 0002](../../adr/0002-timebase-ssot.md)  
**Bramka wejścia:** α9 wydane + P8 green ([report-po-smoke-p8.md](./report-po-smoke-p8.md))

## Cel

Dostarczyć **host i dystrybucję** na scenę / laptop operatora:

1. **Tauri** — desktop standalone (Win + mac) → Node sidecar uruchamia lokalny serwer na `:4000`, a shell czeka na health-check i dopiero potem ładuje UI.
2. **Docker Compose** — ścieżka drugorzędna (rack/server): immutable obraz + volume `data/` (update = bump tagu).
3. **Stabilność volume / data dir** — OCC `409`, shadow backup, migracja schematu przy starcie.

**Bez** nowych funkcji produktowych (audio, MIDI, Live Desk, wand, Timeline Help feature, P1 Timeline).

## Kontrakt IN / OUT

| IN β1 | OUT β1 (najwcześniej β2 / 5.0.0) |
|-------|----------------------------------|
| Docker Compose + volume `data/` | Audio playback / clip / gain / mute |
| Tauri desktop standalone (Node sidecar; Win + mac) | Host MIDI I/O |
| Stabilność hosta (backup, OCC, migracje volume) | AD-01…03 Live Desk |
| CI / docs instalacji | Wand, Timeline Help **feature**, P1 Timeline gaps |
| ESLint ACL shared + Zod `details` | git-apply / „Zaktualizuj teraz” (nigdy) |
| | Android / store auto-update |

Feature **Should** z wcześniejszego szkicu TODO (Help, wand, P1) → **β2 / 5.0.0 OUT**, nie must-path β1.

## IN (must)

| # | Wycinek | Uwagi |
|---|---------|--------|
| H1 | Scope report (ten plik) + TODO/ROADMAP hygiene | Faza 0 |
| H2 | `Dockerfile` + `compose.yml`; volume `./data` → `/app/data` — ścieżka drugorzędna (rack/server) | [ADR 0004](../../adr/0004-updates-docker.md); [INSTALL.md](../../INSTALL.md) |
| H3 | Serwer serwuje static `apps/web` w obrazie (`STAGESYNC_STATIC_DIR`) | Jeden proces HTTP/WS |
| H4 | OCC: `PUT /api/projects/:id` z `updatedAt` klienta → mismatch **409** | Fail-fast; bez last-write-wins |
| H5 | Shadow backup przed destrukcyjnym overwrite / migracją na volume | `.bak` / timestamped |
| H6 | Migracja schematu library/projects **przy starcie** (write-back v5) | Zod fail-fast; bez cichej naprawy |
| H7 | ESLint ACL: web ↛ server; shared ↛ DOM / Node FS | `no-restricted-imports` |
| H8 | API błędy Zod: `{ ok: false, error, details? }` | Shared `ApiErrorSchema` |
| H9 | `apps/desktop` Tauri standalone: startuje **Node sidecar** → `http://127.0.0.1:<port>`; health-check przed WebView; przy konflikt portu 4000 pokazuje czytelny błąd; kill sidecara przy zamknięciu okna | [ADR 0010](../../adr/0010-desktop-shell-tauri.md) |
| H10 | CI: build/packaging sidecara + Tauri smoke (mac lub docs manual Win) | Release tag tylko na prośbę |
| H11 | Node runtime per architektura: build dociąga właściwy binary Node i pakuje go do `apps/desktop/src-tauri/bin/` | Unika problemów z cross-arch |
| H12 | Read-only assets vs user storage: seed (`library.template.json`, web dist) pochodzi z resources (read-only), a dane runtime idą do `STAGESYNC_DATA_DIR` | Brak zapisu do katalogu instalacji |

## IN (should — host only)

| # | Wycinek | Uwagi |
|---|---------|--------|
| S1 | Doprecyzowanie ADR 0002 (tempo/metrum pre-roll) — jeśli nadal otwarte | Nie bloker Compose/Tauri |
| S2 | E2E smoke Forma + transport (carry) | Nie bloker obrazu |

## OUT (świadome)

| Temat | Etap |
|-------|------|
| Audio playback / clip edit / gain / mute | β2 |
| Host MIDI I/O | β2 |
| AD-01…03 Live Desk | β2 |
| Timeline Help (overlay + skróty) jako feature | β2 / 5.0.0 |
| Różdżka (wand) przywrócenie | β2 / 5.0.0 |
| P1 Timeline gaps (np. TE-13) | β2 / 5.0.0 |
| Tauri thin-shell przez `STAGESYNC_URL` | OUT β1 (dev / thin-shell tylko) |
| git-apply / „Zaktualizuj teraz” | Nigdy ([ADR 0004](../../adr/0004-updates-docker.md)) |
| Android / store auto-update | Poza β1 |
| Clone chrome v4 | Zakaz ([ADR 0011](../../adr/0011-ui-parity-behavior.md)) |

## Architektura (domyślna)

```mermaid
flowchart TB
  subgraph desktop [Operator desktop]
    tauri[apps_desktop_Tauri]
    sidecar[Node sidecar: apps_server]
    tauri -->|"WebView UI"| sidecar
    sidecar --> userData[(user data dir)]
  end
  subgraph stage [Scena (secondary Docker)]
    compose[Docker_Compose]
    vol[volume_data]
    compose --> serverNode[apps_server]
    serverNode --> vol
  end
```

- **Compose** = ścieżka drugorzędna (rack/server): immutable image; update = bump tagu; `data/` na volume.
- **Tauri** = standalone shell: startuje **Node sidecar** lokalnie, czeka na health-check i dopiero potem ładuje UI; **bez** zegara muzycznego w procesie shella.

## Admin UI (kontrakt ADR 0004 — amendement β1)

- Pokazuje wersję oprogramowania.
- **Sprawdź aktualizacje** na żądanie → porównanie semver (GitHub Releases); **Aktualizuj host** (Watchtower HTTP) z confirmem.
- W Tauri: dodatkowy wiersz **Aktualizuj aplikację** (plugin-updater + minisign).
- **git-apply / auto-update w tle** — nadal OUT.

## Release

1. Must H1–H12 green w CI / docs — **done** w α10–α13.
2. Bump root `package.json` → `5.0.0-beta.1` + CHANGELOG + tag — **wydane 2026-07-21** (milestone dystrybucyjny; G1–G10 ręczne + menu Faza B = carry).
3. TODO → sekcja β2 po zamknięciu β1.
