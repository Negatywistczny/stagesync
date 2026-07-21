# Standalone beta.1 spike — Tauri + Node sidecar

**Data:** 2026-07-21  
**Cel spike’a:** doprowadzić desktop `.dmg`/`.msi` do trybu **standalone-first**: aplikacja uruchamia lokalny serwer wbudowanym **Node sidecarem**, a UI ładuje się dopiero po zdrowiu hosta (`/api/health`).

## Co zostało zrobione (kod + artefakty)

### 1. Packaging PoC: Node runtime + server JS + web resources

- Dodano skrypt budujący i przygotowujący sidecara:
  - `launch/scripts/build-desktop-sidecar.mjs`
- Skrypt tworzy:
  - `apps/desktop/src-tauri/bin/stagesync-host` (bundlowany Node)
  - `apps/desktop/src-tauri/resources/sidecar/server` (server dist + `apps/server/node_modules`)
  - `apps/desktop/src-tauri/resources/sidecar/web` (`apps/web/dist`)
  - `apps/desktop/src-tauri/resources/sidecar/seed/library.template.json`

Weryfikacja lokalna została wykonana dla targetu `aarch64-apple-darwin`.

### 2. Tauri bundling: externalBin + zasoby

- Zaktualizowano `apps/desktop/src-tauri/tauri.conf.json`:
  - `bundle.externalBin = ["bin/stagesync-host"]`
  - `bundle.resources` obejmuje `resources/sidecar/**` oraz katalogi Node runtime (`lib/**`, `share/**`)

### 3. Rust lifecycle: spawn → health-check → navigate → shutdown

- Zaimplementowano standalone lifecycle w `apps/desktop/src-tauri/src/lib.rs`:
  - start Node sidecara (`stagesync-host`) z argumentem do `resources/sidecar/server/dist/index.js`
  - ustawienie env:
    - `PORT=4000`
    - `STAGESYNC_STATIC_DIR=<.../resources/sidecar/web>`
    - `STAGESYNC_DATA_DIR=<app_data>/StageSync`
    - `STAGESYNC_SEED_DIR=<.../resources/sidecar/seed>`
    - `npm_package_version` z `app.package_info().version`
  - polling `GET /api/health` do `200` (timeout 30s, interwał 250ms)
  - na success: `window.navigate("http://127.0.0.1:4000")`
  - na timeout/port-conflict: czytelny ekran błędu (data URL)
  - na `RunEvent::ExitRequested`: kill sidecara (brak sierot Node)
  - dev fallback: jeśli `sidecar/server/dist/index.js` nie istnieje w bundle, zachowujemy stary flow przez `STAGESYNC_URL`

### 4. Storage seed wbudowany w bundle

- Zmieniono `apps/server/src/storage/paths.ts`:
  - dodano `STAGESYNC_SEED_DIR` jako override lokalizacji `library.template.json`
  - standalone może seedować z `resources/sidecar/seed/`

## Wynik lokalnego PoC (smoke-test)

Wykonano uruchomienie servera bez Dockera:

1. Start servera z zasobów sidecara:
   - `apps/desktop/src-tauri/bin/stagesync-host`
   - `apps/desktop/src-tauri/resources/sidecar/server/dist/index.js`
2. Health-check:
   - `GET http://127.0.0.1:4011/api/health` zwraca `200`.

Dowód: log `stagesync-sidecar-4011.log` zawiera wpisy `[stagesync-server] listening ...` oraz transport WS.

## Beta.1 checklist — co jeszcze trzeba potwierdzić

Bazując na [report-beta-gate.md](./report-beta-gate.md), poniższe punkty nadal wymagają uruchomienia na docelowych instalatorach / środowisku operatora:

- **G1**: `.dmg` działa bez Dockera/Node u użytkownika
- **G2**: `.msi` działa bez Dockera/Node u użytkownika
- **G3**: dane runtime zapisują się w katalogu użytkownika (nie w `.app` / Program Files)
- **G4**: zamknięcie okna zabija Node sidecara
- **G5**: konflikt portu `4000` → czytelny komunikat błędu (nie biała WebView)
- **G6**: desktop update działa (Tauri updater + relaunch)
- **G7–G9**: Docker secondary (health → host update → rollback)
- **G10**: docs zgodne z flow

## Odblokowania / wymagania operacyjne

- Desktop updater w release pipeline wymaga skonfigurowanych GitHub Secrets:
  - `TAURI_SIGNING_PRIVATE_KEY`
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

Skrypt keypair został wygenerowany i `plugins.updater.pubkey` jest już uzupełnione w `apps/desktop/src-tauri/tauri.conf.json` — pozostaje konfiguracja secrets w repo.

