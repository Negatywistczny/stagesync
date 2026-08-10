# 🗺️ REPO MAP & CONTEXT (Automatycznie wygenerowano)

> ⚠️ **Uwaga dla Agentów AI / LLM:** Ten plik zawiera wygenerowaną mapę struktury wyłącznie plików śledzonych w Git (bez untracked) w repozytorium StageSync (drzewo slim (kolaps assetów, limit głębokości; `--full` = bez skrótów)). Nie edytuj go ręcznie.

---

## 📊 Statystyki Repozytorium (Śledzone w Git)

* **Liczba wszystkich plików:** 1284
* **Liczba katalogów:** 196
* **Data aktualizacji:** 2026-08-10T15:34:04.629Z

### Kategorie

| Kategoria | Liczba plików |
| :--- | ---: |
| Kod | 800 |
| Docs | 216 |
| Config | 118 |
| Assety | 120 |
| Inne | 30 |

### Top rozszerzenia

| Rozszerzenie | Liczba plików |
| :--- | ---: |
| `.ts` | 460 |
| `.md` | 194 |
| `.tsx` | 161 |
| `.png` | 94 |
| `.kt` | 71 |
| `.css` | 52 |
| `.json` | 36 |
| `.xml` | 35 |
| `.mjs` | 29 |
| `brak rozszerzenia` | 23 |
| _(pozostałe)_ | 129 |

---

## 🏛️ Przegląd Architektury

- **apps/** (888) — Aplikacje wykonawcze i powłoki klienckie w monorepo
  - **console/** (98) — Android WebView shell dla interfejsu /admin (ADR 0016)
  - **desktop/** (100) — Tauri thin shell dla serwera lokalnego na desktop (ADR 0010)
  - **performer/** (72) — Android WebView shell dla interfejsu /client (ADR 0016)
  - **server/** (134) — Główny backend Node.js — SSOT Host, Master Clock, REST/WS API
  - **web/** (454) — Aplikacja webowa React/Vite (Admin, Client, Timeline, Mikser)
    - **e2e/** (2) — Testy integracyjne E2E (Playwright)
    - **public/** (10) — Zasoby statyczne i favicon
      - **brand/** (5) — Materiały brandingowe i logotypy StageSync
    - **scripts/** (10) — Skrypty pomocnicze builda i benchmarków webowych
      - **benchmark/** (8) — Skrypty benchmarków wydajnościowych UI/Audio
    - **src/** (413) — Kod źródłowy UI i logiki klienta
      - **dev/** (18) — Narzędzia i panele deweloperskie wewnątrz aplikacji
      - **lib/** (185) — Biblioteki klienta (5 kategorii — bez plików w lib root)
        - **audio/** (30) — DSP, AudioContext, tempo, waveform
        - **client/** (60) — Preferencje, mostek desktop, i18n shell, utilities UI
        - **shell-operator/** (23) — Operatory CRUD API / aktywny projekt
        - **timeline/** (46) — Silnik renderowania timeline (bez mutacji treści)
        - **timeline-edit/** (26) — Mutacje treści klipów (akordy, cue, forma, tekst)
      - **shells/** (189) — Powłoki Admin / Client / Timeline
      - **transport/** (13) — Transport WS, playhead, probe wydajności
    - **test/** (9) — Testy jednostkowe i mocki aplikacji webowej
      - **benchmark/** (1) — Testy wydajnościowe struktur danych
      - **fixtures/** (8) — Przykładowe dane testowe projektów i timeline
  - **www/** (29) — Strona domowa, portal informacyjny oraz aktualności StageSync
- **data/** (10) — Lokalne dane uruchomieniowe, projekty, pakiety i logi systemowe
  - **downloads/** (3) — Lokalne pliki wyjściowe i instalatory APK
  - **host/** (1) — Lokalne pliki środowiska uruchomieniowego Hosta
  - **library/** (3) — Główny plik bazy utworów (library.json) oraz szablony projektów
  - **logs/** (1) — Buffer logów systemowych, diagnostyka i ślady wykonania
  - **projects/** (1) — Katalog projektów użytkownika z lokalnymi zasobami assets/
- **docs/** (163) — Dokumentacja techniczna, specyfikacje architektoniczne i audyty
  - **adr/** (20) — Architectural Decision Records (Decyzje architektoniczne)
  - **analysis/** (122) — Audyty kodu, analizy wydajności, referencje DAW i specyfikacje
    - **inspiracje/** (90) — Dumpy zewnętrzne + triage (nie SSOT produktu)
    - **reports/** (29) — Raporty kanoniczne (current / milestones / hygiene)
    - **working/** (2) — Notatki robocze (gitignored treści, tylko README/.gitignore)
  - **api/** (1) — Specyfikacje interfejsów programistycznych REST i WebSocket
  - **examples/** (1) — Przykładowe pliki baz danych i pakiety projektowe v5
  - **guides/** (4) — Podręczniki operatorskie (INSTALL, DESKTOP, MOBILE, MIGRATION)
  - **ui/** (9) — Dokumentacja systemu designu, tokenów i komponentów UI
- **packages/** (139) — Współdzielone pakiety wewnętrzne monorepo
  - **android-keystore/** (2) — Keystore do sideloadu / podpisywania APK (lokalny, nie sekret produkcyjny CI)
  - **eslint-config/** (5) — Wspólne reguły ESLint dla całego repozytorium
  - **plugins/** (4)
  - **shared/** (98) — Logika domenowa SSOT, Zod schematy, przeliczenia czasu i akordów
  - **typescript-config/** (4) — Bazowe pliki tsconfig.json dla paczek i aplikacji
  - **ui/** (25) — Biblioteka komponentów UI (przycisk, pole, menu, badge)
- **scripts/** (23) — Skrypty monorepo (mapa repo, release notes, lint CSS, merge-train)
  - **merge-train/** (4) — Automatyzacja merge train i walidacji PR
  - **quality/** (5) — Narzędzia jakości kodu, linków i generator mapy repozytorium
  - **release/** (9) — Skrypty wydań SemVer, budowania paczek i release notes
  - **setup/** (2) — Skrypty inicjalizacyjne i setupu środowiska deweloperskiego

---

## ⚙️ Konfiguracja i Środowisko (Katalogi Narzędziowe)

- **.agents/** (1) — Instrukcje i kontekst operacyjny dla autonomicznych agentów AI
- **.cursor/** (16) — Konfiguracja środowiska Cursor (agenci, komendy, reguły MDC, umiejętności)
  - **agents/** (1) — Definicje agentów Cursor (np. night-auditor)
  - **commands/** (3) — Komendy slash / prompt templates
  - **rules/** (9) — Reguły MDC (konstytucja, changelog, parity, layout)
  - **skills/** (3) — Umiejętności agentów (night-audit, triage-verify)
- **.github/** (15) — Szablony zgłoszeń GitHub, wytyczne społeczności oraz workflows CI/CD
  - **ISSUE_TEMPLATE/** (3) — Szablony issue
  - **codeql/** (1) — Konfiguracja analizy statycznej CodeQL
  - **workflows/** (4) — Pipeline’y GitHub Actions (CI, release, codeql)
- **.husky/** (2) — Haki Git (m.in. pre-commit sanity gate do walidacji typów i mapy)
- **.vscode/** (1) — Ustawienia przestrzeni roboczej VS Code / Cursor (np. explorer file nesting)

---

## 📎 Pliki w root monorepo

### Repozytorium & Tooling
- [`.clineignore`](../.clineignore)
- [`.clinerules`](../.clinerules)
- [`.cursorignore`](../.cursorignore)
- [`.cursorindexingignore`](../.cursorindexingignore)
- [`.dockerignore`](../.dockerignore)
- [`.editorconfig`](../.editorconfig)
- [`.gitignore`](../.gitignore)
- [`.npmrc`](../.npmrc)
- [`.nvmrc`](../.nvmrc)
- [`codecov.yml`](../codecov.yml)
- [`commitlint.config.js`](../commitlint.config.js)
- [`knip.jsonc`](../knip.jsonc)
- [`package.json`](../package.json)
- [`pnpm-lock.yaml`](../pnpm-lock.yaml)
- [`pnpm-workspace.yaml`](../pnpm-workspace.yaml)
- [`turbo.json`](../turbo.json)

### Dokumentacja
- [`CHANGELOG.md`](../CHANGELOG.md)
- [`LICENSE`](../LICENSE)
- [`README.md`](../README.md)

### Docker & Compose
- [`compose.prod.yml`](../compose.prod.yml)
- [`compose.yml`](../compose.yml)
- [`Dockerfile`](../Dockerfile)

### Skrypty
- [`dev`](../dev)
- [`dev.cmd`](../dev.cmd)
- [`dev.ps1`](../dev.ps1)

### Pozostałe
- [`.env.example`](../.env.example)

---

## 📂 Drzewo Katalogów i Plików

```text
stagesync/
├── .agents/
│   └── AGENTS.md
├── .cursor/
│   ├── agents/
│   │   └── night-auditor.md
│   ├── commands/
│   │   ├── night-audit.md
│   │   ├── triage-next.md
│   │   └── turn-red.md
│   ├── rules/
│   │   ├── changelog.mdc
│   │   ├── constitution.mdc
│   │   ├── docs-analysis-naming.mdc
│   │   ├── lib-structure.mdc
│   │   ├── root-layout.mdc
│   │   ├── todo-hygiene.mdc
│   │   ├── ui-density.mdc
│   │   ├── ui-parity.mdc
│   │   └── versioning.mdc
│   └── skills/
│       ├── night-audit/
│       │   └── SKILL.md
│       ├── triage-verify/
│       │   └── SKILL.md
│       └── turn-red/
│           └── SKILL.md
├── .github/
│   ├── codeql/
│   │   └── codeql-config.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── codeql.yml
│   │   ├── pages.yml
│   │   └── release.yml
│   ├── CODE_OF_CONDUCT.md
│   ├── CODEOWNERS
│   ├── CONTRIBUTING.md
│   ├── dependabot.yml
│   ├── PULL_REQUEST_TEMPLATE.md
│   ├── release.yml
│   └── SECURITY.md
├── .husky/
│   ├── commit-msg
│   └── pre-commit
├── .vscode/
│   └── settings.json
├── apps/
│   ├── console/
│   │   ├── android/
│   │   │   ├── app/
│   │   │   │   ├── src/  … (82 pliki, 2 podkatalogi)
│   │   │   │   ├── build.gradle.kts
│   │   │   │   ├── google-services.json.example
│   │   │   │   └── proguard-rules.pro
│   │   │   ├── gradle/
│   │   │   │   └── wrapper/  … (2 pliki)
│   │   │   ├── build.gradle.kts
│   │   │   ├── gradle.properties
│   │   │   ├── gradlew
│   │   │   └── settings.gradle.kts
│   │   ├── launcher/
│   │   │   └── README.md
│   │   ├── scripts/
│   │   │   ├── build-apk.sh
│   │   │   ├── prepare-local-host.mjs
│   │   │   └── unit-test.sh
│   │   ├── android-boot.mjs
│   │   ├── package.json
│   │   └── README.md
│   ├── desktop/
│   │   ├── launcher/
│   │   │   ├── brand/
│   │   │   │   └── stagesync-logo.svg
│   │   │   ├── app.js
│   │   │   ├── host-discovery.js
│   │   │   ├── index.html
│   │   │   ├── localErrorActions.js
│   │   │   ├── localErrorActions.test.js
│   │   │   ├── splash.html
│   │   │   ├── styles.css
│   │   │   ├── updateDialog.js
│   │   │   └── updateDialog.test.js
│   │   ├── scripts/
│   │   │   ├── build-desktop-sidecar.mjs
│   │   │   ├── build-nsis-smoke.mjs
│   │   │   ├── check-rust.mjs
│   │   │   ├── generate-bmps.ps1
│   │   │   ├── kill-zombies.mjs
│   │   │   ├── pack-stagesync-setup.mjs
│   │   │   ├── parse-schema.mjs
│   │   │   ├── prepare-stagesync-setup-bin.mjs
│   │   │   ├── sync-launcher-ui.mjs
│   │   │   ├── sync-sidecar-server.mjs
│   │   │   └── sync-sidecar-web.mjs
│   │   ├── src-tauri/
│   │   │   ├── assets/
│   │   │   │   └── installer/  … (6 plików)
│   │   │   ├── capabilities/
│   │   │   │   └── default.json
│   │   │   ├── icons/  … (56 plików: .png ×52, .xml ×2, .icns ×1, .ico ×1)
│   │   │   ├── permissions/
│   │   │   │   └── desktop-bridge.toml
│   │   │   ├── src/
│   │   │   │   ├── bin/  … (1 plik)
│   │   │   │   ├── launcher.rs
│   │   │   │   ├── lib.rs
│   │   │   │   ├── main.rs
│   │   │   │   └── tray.rs
│   │   │   ├── build.rs
│   │   │   ├── Cargo.lock
│   │   │   ├── Cargo.toml
│   │   │   ├── tauri.conf.json
│   │   │   ├── tauri.linux.conf.json
│   │   │   ├── tauri.nsis-smoke.conf.json
│   │   │   └── tauri.windows.conf.json
│   │   ├── ui-placeholder/
│   │   │   └── index.html
│   │   ├── package.json
│   │   └── README.md
│   ├── performer/
│   │   ├── android/
│   │   │   ├── app/
│   │   │   │   ├── src/  … (58 plików, 2 podkatalogi)
│   │   │   │   ├── build.gradle.kts
│   │   │   │   ├── google-services.json.example
│   │   │   │   └── proguard-rules.pro
│   │   │   ├── gradle/
│   │   │   │   └── wrapper/  … (2 pliki)
│   │   │   ├── build.gradle.kts
│   │   │   ├── gradle.properties
│   │   │   ├── gradlew
│   │   │   └── settings.gradle.kts
│   │   ├── launcher/
│   │   │   └── README.md
│   │   ├── scripts/
│   │   │   ├── build-apk.sh
│   │   │   └── unit-test.sh
│   │   ├── package.json
│   │   └── README.md
│   ├── server/
│   │   ├── src/
│   │   │   ├── midi/
│   │   │   │   ├── backend.ts
│   │   │   │   ├── config-persist.test.ts
│   │   │   │   ├── config-persist.ts
│   │   │   │   ├── host.test.ts
│   │   │   │   ├── host.ts
│   │   │   │   ├── mock-backend.ts
│   │   │   │   ├── native-backend.test.ts
│   │   │   │   ├── native-backend.ts
│   │   │   │   ├── program-change-out.ts
│   │   │   │   └── program-change.ts
│   │   │   ├── push/
│   │   │   │   └── tokens.ts
│   │   │   ├── routes/
│   │   │   │   ├── assets-helpers.test.ts
│   │   │   │   ├── assets-helpers.ts
│   │   │   │   ├── assets.ts
│   │   │   │   ├── errors.test.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── import.test.ts
│   │   │   │   ├── import.ts
│   │   │   │   ├── library.ts
│   │   │   │   ├── live-desk.ts
│   │   │   │   ├── midi.ts
│   │   │   │   ├── projects.ts
│   │   │   │   ├── push.test.ts
│   │   │   │   ├── push.ts
│   │   │   │   ├── selective-catches.test.ts
│   │   │   │   ├── setlist.ts
│   │   │   │   ├── stage.ts
│   │   │   │   ├── system.ts
│   │   │   │   ├── transport.ts
│   │   │   │   ├── youtube-audio.test.ts
│   │   │   │   └── youtube-audio.ts
│   │   │   ├── storage/
│   │   │   │   ├── atomic-write.test.ts
│   │   │   │   ├── atomic-write.ts
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── migrate-volume.test.ts
│   │   │   │   ├── migrate-volume.ts
│   │   │   │   ├── paths.test.ts
│   │   │   │   ├── paths.ts
│   │   │   │   ├── restore-backup.test.ts
│   │   │   │   ├── restore-backup.ts
│   │   │   │   ├── shadow-backup.test.ts
│   │   │   │   └── shadow-backup.ts
│   │   │   ├── transport/
│   │   │   │   ├── auto-advance.ts
│   │   │   │   ├── engine.test.ts
│   │   │   │   ├── engine.ts
│   │   │   │   ├── pause-at-end.ts
│   │   │   │   ├── setlist-hub.test.ts
│   │   │   │   ├── setlist-hub.ts
│   │   │   │   ├── stage-hub.test.ts
│   │   │   │   ├── stage-hub.ts
│   │   │   │   ├── ws.integration.test.ts
│   │   │   │   └── ws.ts
│   │   │   ├── ug/
│   │   │   │   ├── fixtures/  … (1 plik)
│   │   │   │   ├── ug-fetch.test.ts
│   │   │   │   └── ug-fetch.ts
│   │   │   ├── usdb/
│   │   │   │   ├── usdb-fetch.test.ts
│   │   │   │   └── usdb-fetch.ts
│   │   │   ├── app.ts
│   │   │   ├── assets-api.test.ts
│   │   │   ├── assets-router-unit.test.ts
│   │   │   ├── client-presence-edges.test.ts
│   │   │   ├── client-presence.ts
│   │   │   ├── diagnostics-zip.ts
│   │   │   ├── diagnostics.test.ts
│   │   │   ├── downloads.test.ts
│   │   │   ├── downloads.ts
│   │   │   ├── env-settings.test.ts
│   │   │   ├── env-settings.ts
│   │   │   ├── file-logger.test.ts
│   │   │   ├── file-logger.ts
│   │   │   ├── host-stability.test.ts
│   │   │   ├── index.ts
│   │   │   ├── json-body-limit.test.ts
│   │   │   ├── library-crud.test.ts
│   │   │   ├── library-router-unit.test.ts
│   │   │   ├── lifecycle-guard.test.ts
│   │   │   ├── lifecycle.create.test.ts
│   │   │   ├── lifecycle.test.ts
│   │   │   ├── lifecycle.ts
│   │   │   ├── live-desk-api.test.ts
│   │   │   ├── live-desk.ts
│   │   │   ├── log-buffer.test.ts
│   │   │   ├── log-buffer.ts
│   │   │   ├── mdns-advertise.test.ts
│   │   │   ├── mdns-advertise.ts
│   │   │   ├── mdns-registry.ts
│   │   │   ├── midi-api.test.ts
│   │   │   ├── midi-pc-handler-edges.test.ts
│   │   │   ├── midi-pc-load.test.ts
│   │   │   ├── midi-pc-out-edges.test.ts
│   │   │   ├── midi-pc-out.test.ts
│   │   │   ├── midi-router-unit.test.ts
│   │   │   ├── near-pure-coverage.test.ts
│   │   │   ├── network-info.ts
│   │   │   ├── operator-pin-api.test.ts
│   │   │   ├── operator-pin.test.ts
│   │   │   ├── operator-pin.ts
│   │   │   ├── path-browser.test.ts
│   │   │   ├── path-browser.ts
│   │   │   ├── pause-at-end.test.ts
│   │   │   ├── presence-logs.test.ts
│   │   │   ├── projects-router-unit.test.ts
│   │   │   ├── resolve-static-dir.test.ts
│   │   │   ├── safety-net-api.test.ts
│   │   │   ├── safety-net.test.ts
│   │   │   ├── safety-net.ts
│   │   │   ├── sentry.test.ts
│   │   │   ├── sentry.ts
│   │   │   ├── setlist-api.test.ts
│   │   │   ├── setlist-auto-advance.test.ts
│   │   │   ├── setlist-router-unit.test.ts
│   │   │   ├── settings-api.test.ts
│   │   │   ├── smoke-e2e.test.ts
│   │   │   ├── song-end-race.test.ts
│   │   │   ├── stage-api.test.ts
│   │   │   ├── stage-router-unit.test.ts
│   │   │   ├── static-web-marker.test.ts
│   │   │   ├── static-web.test.ts
│   │   │   ├── static-web.ts
│   │   │   ├── system-lifecycle-routes.test.ts
│   │   │   ├── system-router-unit.test.ts
│   │   │   ├── system-routes.test.ts
│   │   │   ├── system-settings-routes.test.ts
│   │   │   ├── transport-api.test.ts
│   │   │   ├── ui-meta-role-hashes.test.ts
│   │   │   ├── ui-meta.test.ts
│   │   │   ├── ui-meta.ts
│   │   │   └── update-status.test.ts
│   │   ├── eslint.config.js
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── web/
│   │   ├── e2e/
│   │   │   ├── forma-drag.spec.ts
│   │   │   └── README.md
│   │   ├── public/
│   │   │   ├── brand/
│   │   │   │   ├── btn-download-stagesync.svg
│   │   │   │   ├── btn-official-website.svg
│   │   │   │   ├── stagesync-logo-light.svg
│   │   │   │   ├── stagesync-logo.svg
│   │   │   │   └── stagesync-mark.svg
│   │   │   ├── favicon.svg
│   │   │   ├── manifest.webmanifest
│   │   │   ├── pwa-icon-192.png
│   │   │   ├── pwa-icon-512.png
│   │   │   └── sw.js
│   │   ├── scripts/
│   │   │   ├── benchmark/
│   │   │   │   ├── debug-bar-alignment.ts
│   │   │   │   ├── debug-winner-beats.ts
│   │   │   │   ├── extract-logic-features.ts
│   │   │   │   ├── generate-smart-tempo-benchmark.ts
│   │   │   │   ├── inspect-logic-onsets.ts
│   │   │   │   ├── optimize-logic-weights.ts
│   │   │   │   ├── record-benchmark.ts
│   │   │   │   └── test-real-downbeats.ts
│   │   │   ├── aggregate-role-ui.mjs
│   │   │   └── emit-ui-meta.mjs
│   │   ├── src/
│   │   │   ├── dev/
│   │   │   │   ├── applyDevSurfaceMocks.test.ts
│   │   │   │   ├── applyDevSurfaceMocks.ts
│   │   │   │   ├── DevApp.test.tsx
│   │   │   │   ├── DevApp.tsx
│   │   │   │   ├── devLayoutConfig.test.ts
│   │   │   │   ├── devLayoutConfig.ts
│   │   │   │   ├── DevLayoutMatrix.module.css
│   │   │   │   ├── DevLayoutMatrix.test.tsx
│   │   │   │   ├── DevLayoutMatrix.tsx
│   │   │   │   ├── DevPreviewApp.test.tsx
│   │   │   │   ├── DevPreviewApp.tsx
│   │   │   │   ├── devPreviewConfig.ts
│   │   │   │   ├── devPreviewScreenshot.test.ts
│   │   │   │   ├── devPreviewScreenshot.ts
│   │   │   │   ├── devRoutes.test.tsx
│   │   │   │   ├── devRoutes.tsx
│   │   │   │   ├── devSurfaceState.ts
│   │   │   │   └── devSurfaceTypes.ts
│   │   │   ├── lib/
│   │   │   │   ├── audio/  … (30 plików)
│   │   │   │   ├── client/  … (60 plików)
│   │   │   │   ├── shell-operator/  … (23 pliki)
│   │   │   │   ├── timeline/  … (46 plików)
│   │   │   │   └── timeline-edit/  … (26 plików)
│   │   │   ├── shells/
│   │   │   │   ├── admin/  … (24 pliki, 2 podkatalogi; 19 plików bezpośrednio)
│   │   │   │   ├── client/  … (10 plików)
│   │   │   │   ├── components/  … (9 plików)
│   │   │   │   ├── import/  … (11 plików)
│   │   │   │   ├── pages/  … (3 pliki)
│   │   │   │   ├── settings/  … (5 plików, 1 podkatalog)
│   │   │   │   ├── shared/  … (2 pliki)
│   │   │   │   ├── timeline/  … (43 pliki, 1 podkatalog; 7 plików bezpośrednio)
│   │   │   │   ├── AdminShell.module.css
│   │   │   │   ├── AdminShell.test.tsx
│   │   │   │   ├── AdminShell.tsx
│   │   │   │   ├── AppCrashFallback.module.css
│   │   │   │   ├── AppCrashFallback.test.tsx
│   │   │   │   ├── AppCrashFallback.tsx
│   │   │   │   ├── AppErrorBoundary.test.tsx
│   │   │   │   ├── AppErrorBoundary.tsx
│   │   │   │   ├── BrandName.module.css
│   │   │   │   ├── BrandName.tsx
│   │   │   │   ├── ChangeServerControl.module.css
│   │   │   │   ├── ChangeServerControl.test.tsx
│   │   │   │   ├── ChangeServerControl.tsx
│   │   │   │   ├── ClientShell.module.css
│   │   │   │   ├── ClientShell.test.tsx
│   │   │   │   ├── ClientShell.tsx
│   │   │   │   ├── CombinedUsUgImportForm.module.css
│   │   │   │   ├── CombinedUsUgImportForm.test.tsx
│   │   │   │   ├── CombinedUsUgImportForm.tsx
│   │   │   │   ├── ConnectionIndicator.module.css
│   │   │   │   ├── ConnectionIndicator.test.tsx
│   │   │   │   ├── ConnectionIndicator.tsx
│   │   │   │   ├── ConnectionLostBanner.module.css
│   │   │   │   ├── ConnectionLostBanner.test.tsx
│   │   │   │   ├── ConnectionLostBanner.tsx
│   │   │   │   ├── DesktopMenuBar.module.css
│   │   │   │   ├── DesktopMenuBar.test.tsx
│   │   │   │   ├── DesktopMenuBar.tsx
│   │   │   │   ├── DesktopMenuBridge.module.css
│   │   │   │   ├── DesktopMenuBridge.tsx
│   │   │   │   ├── DesktopRootRedirect.test.tsx
│   │   │   │   ├── DesktopRootRedirect.tsx
│   │   │   │   ├── DesktopTitleBar.module.css
│   │   │   │   ├── DesktopTitleBar.test.tsx
│   │   │   │   ├── DesktopTitleBar.tsx
│   │   │   │   ├── DeviceNameFields.module.css
│   │   │   │   ├── DeviceNameFields.test.tsx
│   │   │   │   ├── DeviceNameFields.tsx
│   │   │   │   ├── DeviceNameGate.module.css
│   │   │   │   ├── DeviceNameGate.test.tsx
│   │   │   │   ├── DeviceNameGate.tsx
│   │   │   │   ├── icons.tsx
│   │   │   │   ├── MemoryPressureBanner.module.css
│   │   │   │   ├── MemoryPressureBanner.test.tsx
│   │   │   │   ├── MemoryPressureBanner.tsx
│   │   │   │   ├── OperatorPinFields.test.tsx
│   │   │   │   ├── OperatorPinFields.tsx
│   │   │   │   ├── OperatorPinGate.test.tsx
│   │   │   │   ├── OperatorPinGate.tsx
│   │   │   │   ├── PreferencesEventBridge.test.tsx
│   │   │   │   ├── PreferencesEventBridge.tsx
│   │   │   │   ├── RouteErrorPage.test.tsx
│   │   │   │   ├── RouteErrorPage.tsx
│   │   │   │   ├── ServerSettingsModal.module.css
│   │   │   │   ├── ServerSettingsModal.styles.test.ts
│   │   │   │   ├── ServerSettingsModal.tsx
│   │   │   │   ├── SettingsPopover.module.css
│   │   │   │   ├── SettingsPopover.test.tsx
│   │   │   │   ├── SettingsPopover.tsx
│   │   │   │   ├── ShellAppearanceFields.module.css
│   │   │   │   ├── ShellAppearanceFields.test.tsx
│   │   │   │   ├── ShellAppearanceFields.tsx
│   │   │   │   ├── ShellBlockingDialog.module.css
│   │   │   │   ├── ShellBlockingDialog.test.tsx
│   │   │   │   ├── ShellBlockingDialog.tsx
│   │   │   │   ├── ShellIconButton.module.css
│   │   │   │   ├── ShellIconButton.test.tsx
│   │   │   │   ├── ShellIconButton.tsx
│   │   │   │   ├── ShellNotificationFields.tsx
│   │   │   │   ├── ShellSwitchRow.module.css
│   │   │   │   ├── ShellSwitchRow.test.tsx
│   │   │   │   ├── ShellSwitchRow.tsx
│   │   │   │   ├── ShellWordmark.module.css
│   │   │   │   ├── ShellWordmark.test.tsx
│   │   │   │   ├── ShellWordmark.tsx
│   │   │   │   ├── TimelineShell.module.css
│   │   │   │   ├── TimelineShell.styles.test.ts
│   │   │   │   ├── TimelineShell.tsx
│   │   │   │   ├── UgImportForm.module.css
│   │   │   │   ├── UgImportForm.tsx
│   │   │   │   ├── UltrastarImportForm.test.tsx
│   │   │   │   └── UltrastarImportForm.tsx
│   │   │   ├── transport/
│   │   │   │   ├── api.test.ts
│   │   │   │   ├── api.ts
│   │   │   │   ├── h01PerfProbe.test.ts
│   │   │   │   ├── h01PerfProbe.ts
│   │   │   │   ├── noteLatencySample.test.ts
│   │   │   │   ├── transportContext.ts
│   │   │   │   ├── TransportProvider.test.tsx
│   │   │   │   ├── TransportProvider.tsx
│   │   │   │   ├── transportReducer.test.ts
│   │   │   │   ├── transportReducer.ts
│   │   │   │   ├── useTransport.ts
│   │   │   │   ├── wsReconnect.test.ts
│   │   │   │   └── wsReconnect.ts
│   │   │   ├── App.tsx
│   │   │   ├── AppClient.tsx
│   │   │   ├── AppConsole.tsx
│   │   │   ├── index.css
│   │   │   ├── main-client.tsx
│   │   │   ├── main-console.tsx
│   │   │   ├── main.tsx
│   │   │   └── vite-env.d.ts
│   │   ├── test/
│   │   │   ├── benchmark/
│   │   │   │   └── smartTempoTrainData.test.ts
│   │   │   └── fixtures/
│   │   │       └── smart-tempo-train-data/  … (8 plików)
│   │   ├── client.html
│   │   ├── console.html
│   │   ├── eslint.config.js
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── playwright.config.ts
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── vitest.config.ts
│   ├── www/
│   │   ├── aktualnosci/
│   │   │   └── index.html
│   │   ├── public/  … (12 plików: .png ×6, .svg ×4, .json ×1, .jpg ×1)
│   │   ├── src/
│   │   │   ├── news/
│   │   │   │   └── content.ts
│   │   │   ├── brand.ts
│   │   │   ├── channels.ts
│   │   │   ├── icons.ts
│   │   │   ├── installationGuideModal.ts
│   │   │   ├── main.ts
│   │   │   ├── news-list.ts
│   │   │   ├── previewLightbox.ts
│   │   │   ├── releases.ts
│   │   │   ├── site.ts
│   │   │   └── styles.css
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   └── README.md
├── data/
│   ├── downloads/
│   │   ├── .gitkeep
│   │   ├── stagesync-console.apk
│   │   └── stagesync-performer.apk
│   ├── host/
│   │   └── .gitkeep
│   ├── library/
│   │   ├── seed-projects/
│   │   │   └── 00000000-0000-4000-8000-000000000001/
│   │   │       └── project.json
│   │   ├── .gitkeep
│   │   └── library.template.json
│   ├── logs/
│   │   └── .gitkeep
│   ├── projects/
│   │   └── .gitkeep
│   └── README.md
├── docs/
│   ├── adr/
│   │   ├── 0001-storage-layout.md
│   │   ├── 0002-timebase-ssot.md
│   │   ├── 0003-ui-direction-booth.md
│   │   ├── 0004-updates-docker.md
│   │   ├── 0005-domain-axioms.md
│   │   ├── 0006-no-json-api.md
│   │   ├── 0007-snap-grid.md
│   │   ├── 0008-timeline-clip-editing.md
│   │   ├── 0009-project-schema-v3.md
│   │   ├── 0010-desktop-shell-tauri.md
│   │   ├── 0011-ui-parity-behavior.md
│   │   ├── 0012-user-data-location.md
│   │   ├── 0013-in-app-vs-github-docs.md
│   │   ├── 0014-desktop-launcher.md
│   │   ├── 0015-daw-reference-and-product-decisions.md
│   │   ├── 0016-android-performer-console.md
│   │   ├── 0017-live-show-control-contracts.md
│   │   ├── 0018-future-audio-architecture.md
│   │   ├── 0019-dual-engine-studio-live.md
│   │   └── README.md
│   ├── analysis/
│   │   ├── inspiracje/
│   │   │   ├── audyty-silnik/  … (17 plików: .md ×17)
│   │   │   ├── referencje-daw/  … (9 plików: .md ×9)
│   │   │   ├── specyfikacje/  … (37 plików: .md ×37)
│   │   │   ├── testy-pokrycie/  … (23 pliki: .md ×23)
│   │   │   ├── www/  … (3 pliki: .md ×3)
│   │   │   └── README.md
│   │   ├── reports/
│   │   │   ├── current/
│   │   │   │   ├── report-adr-dual-engine-vst-align.md
│   │   │   │   ├── report-audit-2026-07-21.md
│   │   │   │   ├── report-build-artifacts-analysis.md
│   │   │   │   ├── report-project-summary-llm.md
│   │   │   │   └── report-scope-5.4.md
│   │   │   ├── hygiene/  … (4 pliki: .md ×4)
│   │   │   ├── milestones/  … (19 plików: .md ×19)
│   │   │   └── README.md
│   │   ├── working/
│   │   │   ├── .gitignore
│   │   │   └── README.md
│   │   └── README.md
│   ├── api/
│   │   └── README.md
│   ├── examples/
│   │   └── v5/
│   │       └── library.pack.sample.stagesync.json
│   ├── guides/
│   │   ├── DESKTOP.md
│   │   ├── DX.md
│   │   ├── INSTALL.md
│   │   └── MOBILE.md
│   ├── ui/
│   │   ├── badge.md
│   │   ├── button.md
│   │   ├── colors.md
│   │   ├── field.md
│   │   ├── README.md
│   │   ├── segmented.md
│   │   ├── spacing.md
│   │   ├── typography.md
│   │   └── ui-shell-inventory.md
│   ├── ARCHITECTURE.md
│   ├── README.md
│   ├── ROADMAP.md
│   ├── STANDARDS.md
│   └── TODO.md
├── packages/
│   ├── android-keystore/
│   │   ├── README.md
│   │   └── sideload.keystore
│   ├── eslint-config/
│   │   ├── acl.js
│   │   ├── base.js
│   │   ├── package.json
│   │   ├── react-internal.js
│   │   └── README.md
│   ├── plugins/
│   │   ├── musescore/
│   │   │   ├── package.json
│   │   │   ├── README.md
│   │   │   └── StageSyncPush.qml
│   │   └── README.md
│   ├── shared/
│   │   ├── src/
│   │   │   ├── fixtures/
│   │   │   │   └── us-ug/  … (8 plików, 4 podkatalogi)
│   │   │   ├── audio-clip.test.ts
│   │   │   ├── audio-clip.ts
│   │   │   ├── bracket-spans.ts
│   │   │   ├── chord-display.test.ts
│   │   │   ├── chord-display.ts
│   │   │   ├── clip-collision.test.ts
│   │   │   ├── clip-collision.ts
│   │   │   ├── countdown-content.test.ts
│   │   │   ├── countdown-content.ts
│   │   │   ├── forma-subsections.test.ts
│   │   │   ├── forma-subsections.ts
│   │   │   ├── harmonic-accent.test.ts
│   │   │   ├── harmonic-accent.ts
│   │   │   ├── host-discovery.test.ts
│   │   │   ├── host-discovery.ts
│   │   │   ├── index.ts
│   │   │   ├── library-import.test.ts
│   │   │   ├── library-import.ts
│   │   │   ├── merge-preserve.test.ts
│   │   │   ├── merge-preserve.ts
│   │   │   ├── meter-map-bbt.test.ts
│   │   │   ├── meter-map-bbt.ts
│   │   │   ├── midi-clock.test.ts
│   │   │   ├── midi-clock.ts
│   │   │   ├── mixer-math.test.ts
│   │   │   ├── mixer-math.ts
│   │   │   ├── mixer-routing.test.ts
│   │   │   ├── mixer-routing.ts
│   │   │   ├── project-bounds.test.ts
│   │   │   ├── project-bounds.ts
│   │   │   ├── project-resolve.test.ts
│   │   │   ├── project-resolve.ts
│   │   │   ├── project-seed.test.ts
│   │   │   ├── project-seed.ts
│   │   │   ├── protocol-version-android.test.ts
│   │   │   ├── schema.test.ts
│   │   │   ├── schema.ts
│   │   │   ├── score-bar-map.test.ts
│   │   │   ├── score-bar-map.ts
│   │   │   ├── section-names.test.ts
│   │   │   ├── section-names.ts
│   │   │   ├── setlist.test.ts
│   │   │   ├── setlist.ts
│   │   │   ├── smart-tempo.test.ts
│   │   │   ├── smart-tempo.ts
│   │   │   ├── snap-grid.test.ts
│   │   │   ├── snap-grid.ts
│   │   │   ├── soft-clock.test.ts
│   │   │   ├── soft-clock.ts
│   │   │   ├── stage-cue-banner.test.ts
│   │   │   ├── stage-cue-banner.ts
│   │   │   ├── tekst-block-text.test.ts
│   │   │   ├── tekst-block-text.ts
│   │   │   ├── tempo-map-ms.ts
│   │   │   ├── tempo-map-solver.test.ts
│   │   │   ├── tempo-map-solver.ts
│   │   │   ├── tempo-map.test.ts
│   │   │   ├── tempo-map.ts
│   │   │   ├── text-anchor-bridge.test.ts
│   │   │   ├── text-anchor-bridge.ts
│   │   │   ├── theme-default.test.ts
│   │   │   ├── theme-default.ts
│   │   │   ├── time.test.ts
│   │   │   ├── time.ts
│   │   │   ├── track-appearance.test.ts
│   │   │   ├── track-appearance.ts
│   │   │   ├── transport-loop.test.ts
│   │   │   ├── transport-loop.ts
│   │   │   ├── transport.test.ts
│   │   │   ├── transport.ts
│   │   │   ├── transpose.test.ts
│   │   │   ├── transpose.ts
│   │   │   ├── ug-api.ts
│   │   │   ├── ug-content.test.ts
│   │   │   ├── ug-content.ts
│   │   │   ├── ug-import.test.ts
│   │   │   ├── ug-import.ts
│   │   │   ├── ug-pipe-bars.test.ts
│   │   │   ├── ug-pipe-bars.ts
│   │   │   ├── ultrastar-api.ts
│   │   │   ├── ultrastar-import.test.ts
│   │   │   ├── ultrastar-import.ts
│   │   │   ├── wand.test.ts
│   │   │   └── wand.ts
│   │   ├── eslint.config.js
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.build.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   ├── typescript-config/
│   │   ├── base.json
│   │   ├── node-library.json
│   │   ├── package.json
│   │   └── react-library.json
│   ├── ui/
│   │   ├── src/
│   │   │   ├── badge.css
│   │   │   ├── badge.tsx
│   │   │   ├── button.css
│   │   │   ├── button.test.tsx
│   │   │   ├── button.tsx
│   │   │   ├── context-menu.css
│   │   │   ├── context-menu.test.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── field.css
│   │   │   ├── field.test.tsx
│   │   │   ├── field.tsx
│   │   │   ├── index.ts
│   │   │   ├── segmented.css
│   │   │   ├── segmented.tsx
│   │   │   ├── slider.css
│   │   │   ├── slider.test.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── tokens.css
│   │   │   └── vite-env.d.ts
│   │   ├── eslint.config.mjs
│   │   ├── package.json
│   │   ├── README.md
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── vitest.setup.ts
│   └── README.md
├── scripts/
│   ├── merge-train/
│   │   ├── integrate-pr.sh
│   │   ├── merge-train.sh
│   │   ├── run-merge-train.sh
│   │   └── run-train-batch.sh
│   ├── quality/
│   │   ├── check-docs-links.mjs
│   │   ├── check-unlinked.mjs
│   │   ├── fix-unlinked-links.mjs
│   │   ├── generate-repo-map.mjs
│   │   └── lint-ss-css.mjs
│   ├── release/
│   │   ├── build-release-notes.mjs
│   │   ├── build-release-notes.test.mjs
│   │   ├── cut-release.mjs
│   │   ├── cut-release.test.mjs
│   │   ├── exec-release.mjs
│   │   ├── extract-changelog-section.mjs
│   │   ├── extract-changelog-section.test.mjs
│   │   ├── release-title.mjs
│   │   └── sync-version.mjs
│   ├── setup/
│   │   ├── setup.ps1
│   │   └── setup.sh
│   ├── dev-hub.ts
│   ├── README.md
│   └── tsconfig.json
├── .clineignore
├── .clinerules
├── .cursorignore
├── .cursorindexingignore
├── .dockerignore
├── .editorconfig
├── .env.example
├── .gitignore
├── .npmrc
├── .nvmrc
├── CHANGELOG.md
├── codecov.yml
├── commitlint.config.js
├── compose.prod.yml
├── compose.yml
├── dev
├── dev.cmd
├── dev.ps1
├── Dockerfile
├── knip.jsonc
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
└── turbo.json
```
