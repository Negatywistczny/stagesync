# 🗺️ REPO MAP & CONTEXT (Automatycznie wygenerowano)

> ⚠️ **Uwaga dla Agentów AI / LLM:** Ten plik zawiera wygenerowaną mapę struktury wyłącznie plików śledzonych w Git (bez untracked) w repozytorium StageSync (drzewo slim (kolaps assetów, limit głębokości; `--full` = bez skrótów)). Nie edytuj go ręcznie.

---

## 📊 Statystyki Repozytorium (Śledzone w Git)

* **Liczba wszystkich plików:** 1568
* **Liczba katalogów:** 253
* **Data aktualizacji:** 2026-08-12T16:21:43.380Z

### Kategorie

| Kategoria | Liczba plików |
| :--- | ---: |
| Kod | 1151 |
| Docs | 147 |
| Config | 119 |
| Assety | 120 |
| Inne | 31 |

### Top rozszerzenia

| Rozszerzenie | Liczba plików |
| :--- | ---: |
| `.ts` | 711 |
| `.tsx` | 254 |
| `.md` | 125 |
| `.png` | 94 |
| `.kt` | 71 |
| `.css` | 52 |
| `.json` | 37 |
| `.xml` | 35 |
| `.mjs` | 32 |
| `brak rozszerzenia` | 24 |
| _(pozostałe)_ | 133 |

---

## 🏛️ Przegląd Architektury

- **apps/** (1163) — Aplikacje wykonawcze i powłoki klienckie w monorepo
  - **console/** (97) — Android WebView shell dla interfejsu /admin (ADR 0016)
  - **desktop/** (108) — Tauri thin shell dla serwera lokalnego na desktop (ADR 0010)
  - **performer/** (71) — Android WebView shell dla interfejsu /client (ADR 0016)
  - **server/** (161) — Główny backend Node.js — SSOT Host, Master Clock, REST/WS API
  - **web/** (696) — Aplikacja webowa React/Vite (Admin, Client, Timeline, Mikser)
    - **e2e/** (2) — Testy integracyjne E2E (Playwright)
    - **public/** (10) — Zasoby statyczne i favicon
      - **brand/** (5) — Materiały brandingowe i logotypy StageSync
    - **scripts/** (10) — Skrypty pomocnicze builda i benchmarków webowych
      - **benchmark/** (8) — Skrypty benchmarków wydajnościowych UI/Audio
    - **src/** (654) — Kod źródłowy UI i logiki klienta
      - **dev/** (18) — Narzędzia i panele deweloperskie wewnątrz aplikacji
      - **lib/** (239) — Biblioteki klienta (5 kategorii — bez plików w lib root)
        - **audio/** (62) — DSP, AudioContext, tempo, waveform
        - **client/** (66) — Preferencje, mostek desktop, i18n shell, utilities UI
        - **shell-operator/** (29) — Operatory CRUD API / aktywny projekt
        - **timeline/** (50) — Silnik renderowania timeline (bez mutacji treści)
        - **timeline-edit/** (32) — Mutacje treści klipów (akordy, cue, forma, tekst)
      - **shells/** (373) — Powłoki Admin / Client / Timeline
      - **transport/** (15) — Transport WS, playhead, probe wydajności
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
- **docs/** (90) — Dokumentacja techniczna, specyfikacje architektoniczne i audyty
  - **adr/** (20) — Architectural Decision Records (Decyzje architektoniczne)
  - **analysis/** (47) — Audyty kodu, analizy wydajności, referencje DAW i specyfikacje
    - **inspiracje/** (40) — Dumpy zewnętrzne + triage (nie SSOT produktu)
    - **reports/** (4) — Raporty kanoniczne (current / milestones / hygiene)
    - **working/** (2) — Notatki robocze (gitignored treści, tylko README/.gitignore)
  - **api/** (1) — Specyfikacje interfejsów programistycznych REST i WebSocket
  - **examples/** (2) — Przykładowe pliki baz danych i pakiety projektowe v5
  - **guides/** (5) — Podręczniki operatorskie (INSTALL, DESKTOP, MOBILE, MIGRATION)
  - **ui/** (9) — Dokumentacja systemu designu, tokenów i komponentów UI
- **packages/** (210) — Współdzielone pakiety wewnętrzne monorepo
  - **android-keystore/** (2) — Keystore do sideloadu / podpisywania APK (lokalny, nie sekret produkcyjny CI)
  - **eslint-config/** (5) — Wspólne reguły ESLint dla całego repozytorium
  - **plugins/** (4)
  - **shared/** (167) — Logika domenowa SSOT, Zod schematy, przeliczenia czasu i akordów
  - **typescript-config/** (5) — Bazowe pliki tsconfig.json dla paczek i aplikacji
  - **ui/** (26) — Biblioteka komponentów UI (przycisk, pole, menu, badge)
- **scripts/** (33) — Skrypty monorepo (mapa repo, release notes, lint CSS, merge-train)
  - **hub/** (11)
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
- [`.gitattributes`](../.gitattributes)

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
│   │   │   ├── local-host.js
│   │   │   ├── localErrorActions.js
│   │   │   ├── localErrorActions.test.js
│   │   │   ├── manual-connect.js
│   │   │   ├── README.md
│   │   │   ├── recent.js
│   │   │   ├── splash.html
│   │   │   ├── styles.css
│   │   │   ├── updateDialog.js
│   │   │   ├── updateDialog.test.js
│   │   │   └── window.js
│   │   ├── scripts/
│   │   │   ├── sidecar/
│   │   │   │   ├── node-runtime.mjs
│   │   │   │   ├── prune.mjs
│   │   │   │   └── smoke.mjs
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
│   │   ├── scripts/
│   │   │   ├── build-apk.sh
│   │   │   └── unit-test.sh
│   │   ├── package.json
│   │   └── README.md
│   ├── server/
│   │   ├── src/
│   │   │   ├── library/
│   │   │   │   ├── assets-api.test.ts
│   │   │   │   ├── downloads.test.ts
│   │   │   │   ├── downloads.ts
│   │   │   │   ├── library-crud.test.ts
│   │   │   │   ├── path-browser.test.ts
│   │   │   │   └── path-browser.ts
│   │   │   ├── live-desk/
│   │   │   │   ├── live-desk-api.test.ts
│   │   │   │   └── live-desk.ts
│   │   │   ├── midi/
│   │   │   │   ├── backend.ts
│   │   │   │   ├── config-persist.test.ts
│   │   │   │   ├── config-persist.ts
│   │   │   │   ├── host.test.ts
│   │   │   │   ├── host.ts
│   │   │   │   ├── midi-api.test.ts
│   │   │   │   ├── midi-pc-handler-edges.test.ts
│   │   │   │   ├── midi-pc-load.test.ts
│   │   │   │   ├── midi-pc-out-edges.test.ts
│   │   │   │   ├── midi-pc-out.test.ts
│   │   │   │   ├── midi-router-unit.test.ts
│   │   │   │   ├── mock-backend.ts
│   │   │   │   ├── native-backend.test.ts
│   │   │   │   ├── native-backend.ts
│   │   │   │   ├── program-change-out.ts
│   │   │   │   └── program-change.ts
│   │   │   ├── presence/
│   │   │   │   ├── client-presence-edges.test.ts
│   │   │   │   ├── client-presence.ts
│   │   │   │   ├── host-stability.test.ts
│   │   │   │   └── presence-logs.test.ts
│   │   │   ├── push/
│   │   │   │   └── tokens.ts
│   │   │   ├── routes/
│   │   │   │   ├── system/  … (9 plików)
│   │   │   │   ├── youtube-audio/  … (5 plików)
│   │   │   │   ├── assets-helpers.test.ts
│   │   │   │   ├── assets-helpers.ts
│   │   │   │   ├── assets-router-unit.test.ts
│   │   │   │   ├── assets.ts
│   │   │   │   ├── errors.test.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── import.test.ts
│   │   │   │   ├── import.ts
│   │   │   │   ├── library-router-unit.test.ts
│   │   │   │   ├── library.ts
│   │   │   │   ├── live-desk.ts
│   │   │   │   ├── midi.ts
│   │   │   │   ├── projects-router-unit.test.ts
│   │   │   │   ├── projects.ts
│   │   │   │   ├── push.test.ts
│   │   │   │   ├── push.ts
│   │   │   │   ├── selective-catches.test.ts
│   │   │   │   ├── setlist-router-unit.test.ts
│   │   │   │   ├── setlist.ts
│   │   │   │   ├── stage-router-unit.test.ts
│   │   │   │   ├── stage.ts
│   │   │   │   ├── system-lifecycle-routes.test.ts
│   │   │   │   ├── system-router-unit.test.ts
│   │   │   │   ├── system-routes.test.ts
│   │   │   │   ├── system-settings-routes.test.ts
│   │   │   │   ├── system.ts
│   │   │   │   ├── transport.ts
│   │   │   │   ├── youtube-audio-download.test.ts
│   │   │   │   ├── youtube-audio.test.ts
│   │   │   │   └── youtube-audio.ts
│   │   │   ├── security/
│   │   │   │   ├── lifecycle-guard.test.ts
│   │   │   │   ├── lifecycle.create.test.ts
│   │   │   │   ├── lifecycle.test.ts
│   │   │   │   ├── lifecycle.ts
│   │   │   │   ├── operator-pin-api.test.ts
│   │   │   │   ├── operator-pin.test.ts
│   │   │   │   ├── operator-pin.ts
│   │   │   │   ├── safety-net-api.test.ts
│   │   │   │   ├── safety-net.test.ts
│   │   │   │   └── safety-net.ts
│   │   │   ├── setlist/
│   │   │   │   ├── setlist-api.test.ts
│   │   │   │   ├── setlist-auto-advance.test.ts
│   │   │   │   └── settings-api.test.ts
│   │   │   ├── stage/
│   │   │   │   ├── pause-at-end.test.ts
│   │   │   │   ├── song-end-race.test.ts
│   │   │   │   └── stage-api.test.ts
│   │   │   ├── storage/
│   │   │   │   ├── asset-store.ts
│   │   │   │   ├── atomic-write.test.ts
│   │   │   │   ├── atomic-write.ts
│   │   │   │   ├── errors.ts
│   │   │   │   ├── index.test.ts
│   │   │   │   ├── index.ts
│   │   │   │   ├── library-store.ts
│   │   │   │   ├── migrate-volume.test.ts
│   │   │   │   ├── migrate-volume.ts
│   │   │   │   ├── paths.test.ts
│   │   │   │   ├── paths.ts
│   │   │   │   ├── project-migrations.ts
│   │   │   │   ├── project-store.ts
│   │   │   │   ├── restore-backup.test.ts
│   │   │   │   ├── restore-backup.ts
│   │   │   │   ├── setlist-store.ts
│   │   │   │   ├── shadow-backup.test.ts
│   │   │   │   └── shadow-backup.ts
│   │   │   ├── system/
│   │   │   │   ├── diagnostics-zip.test.ts
│   │   │   │   ├── diagnostics-zip.ts
│   │   │   │   ├── diagnostics.test.ts
│   │   │   │   ├── env-settings.test.ts
│   │   │   │   ├── env-settings.ts
│   │   │   │   ├── file-logger.test.ts
│   │   │   │   ├── file-logger.ts
│   │   │   │   ├── log-buffer.test.ts
│   │   │   │   ├── log-buffer.ts
│   │   │   │   ├── mdns-advertise.test.ts
│   │   │   │   ├── mdns-advertise.ts
│   │   │   │   ├── mdns-registry.test.ts
│   │   │   │   ├── mdns-registry.ts
│   │   │   │   ├── network-info.test.ts
│   │   │   │   ├── network-info.ts
│   │   │   │   ├── sentry.test.ts
│   │   │   │   ├── sentry.ts
│   │   │   │   └── update-status.test.ts
│   │   │   ├── transport/
│   │   │   │   ├── auto-advance.ts
│   │   │   │   ├── engine.test.ts
│   │   │   │   ├── engine.ts
│   │   │   │   ├── pause-at-end.ts
│   │   │   │   ├── setlist-hub.test.ts
│   │   │   │   ├── setlist-hub.ts
│   │   │   │   ├── stage-hub.test.ts
│   │   │   │   ├── stage-hub.ts
│   │   │   │   ├── transport-api.test.ts
│   │   │   │   ├── ws.integration.test.ts
│   │   │   │   └── ws.ts
│   │   │   ├── ug/
│   │   │   │   ├── fixtures/  … (1 plik)
│   │   │   │   ├── ug-fetch.test.ts
│   │   │   │   └── ug-fetch.ts
│   │   │   ├── ui-meta/
│   │   │   │   ├── ui-meta-role-hashes.test.ts
│   │   │   │   ├── ui-meta.test.ts
│   │   │   │   └── ui-meta.ts
│   │   │   ├── usdb/
│   │   │   │   ├── usdb-auth.ts
│   │   │   │   ├── usdb-fetch.test.ts
│   │   │   │   ├── usdb-fetch.ts
│   │   │   │   └── usdb-parser.ts
│   │   │   ├── web-static/
│   │   │   │   ├── json-body-limit.test.ts
│   │   │   │   ├── resolve-static-dir.test.ts
│   │   │   │   ├── static-web-marker.test.ts
│   │   │   │   ├── static-web.test.ts
│   │   │   │   └── static-web.ts
│   │   │   ├── app.ts
│   │   │   ├── index.ts
│   │   │   ├── near-pure-coverage.test.ts
│   │   │   ├── README.md
│   │   │   └── smoke-e2e.test.ts
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
│   │   │   │   ├── audio/  … (62 pliki, 2 podkatalogi; 43 pliki bezpośrednio)
│   │   │   │   ├── client/  … (66 plików, 2 podkatalogi; 60 plików bezpośrednio)
│   │   │   │   ├── shell-operator/  … (29 plików, 1 podkatalog; 23 pliki bezpośrednio)
│   │   │   │   ├── timeline/  … (50 plików, 1 podkatalog; 46 plików bezpośrednio)
│   │   │   │   └── timeline-edit/  … (32 pliki, 3 podkatalogi; 26 plików bezpośrednio)
│   │   │   ├── shells/
│   │   │   │   ├── admin/  … (50 plików, 5 podkatalogów; 35 plików bezpośrednio)
│   │   │   │   ├── client/  … (31 plików, 1 podkatalog; 30 plików bezpośrednio)
│   │   │   │   ├── components/  … (59 plików, 1 podkatalog; 50 plików bezpośrednio)
│   │   │   │   ├── desktop/  … (21 plików)
│   │   │   │   ├── import/  … (39 plików, 1 podkatalog; 34 pliki bezpośrednio)
│   │   │   │   ├── pages/  … (3 pliki)
│   │   │   │   ├── settings/  … (22 pliki, 1 podkatalog; 16 plików bezpośrednio)
│   │   │   │   ├── shared/  … (2 pliki)
│   │   │   │   └── timeline/  … (146 plików, 10 podkatalogów; 13 plików bezpośrednio)
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
│   │   │   │   ├── useTransportInterpolation.ts
│   │   │   │   ├── useTransportSocket.ts
│   │   │   │   ├── wsReconnect.test.ts
│   │   │   │   └── wsReconnect.ts
│   │   │   ├── App.tsx
│   │   │   ├── AppClient.tsx
│   │   │   ├── AppConsole.tsx
│   │   │   ├── index.css
│   │   │   ├── main-client.tsx
│   │   │   ├── main-console.tsx
│   │   │   ├── main.tsx
│   │   │   ├── README.md
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
│   │   ├── tsconfig.build.json
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
│   │   │   ├── audyty-silnik/  … (5 plików: .md ×5)
│   │   │   ├── referencje-daw/  … (9 plików: .md ×9)
│   │   │   ├── specyfikacje/  … (25 plików: .md ×25)
│   │   │   └── README.md
│   │   ├── reports/
│   │   │   ├── current/
│   │   │   │   ├── report-adr-dual-engine-vst-align.md
│   │   │   │   ├── report-beta-gate.md
│   │   │   │   └── report-scope-5.4.md
│   │   │   └── README.md
│   │   ├── working/
│   │   │   ├── .gitignore
│   │   │   └── README.md
│   │   └── README.md
│   ├── api/
│   │   └── README.md
│   ├── examples/
│   │   ├── v5/
│   │   │   └── library.pack.sample.stagesync.json
│   │   └── README.md
│   ├── guides/
│   │   ├── DESKTOP.md
│   │   ├── DX.md
│   │   ├── INSTALL.md
│   │   ├── MOBILE.md
│   │   └── README.md
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
│   │   │   ├── audio-clip/
│   │   │   │   ├── audio-clip.test.ts
│   │   │   │   ├── audio-clip.ts
│   │   │   │   ├── clip-collision.test.ts
│   │   │   │   └── clip-collision.ts
│   │   │   ├── fixtures/
│   │   │   │   └── us-ug/  … (8 plików, 4 podkatalogi)
│   │   │   ├── import/
│   │   │   │   ├── ug/  … (13 plików)
│   │   │   │   ├── ultrastar/  … (9 plików)
│   │   │   │   ├── library-import.test.ts
│   │   │   │   ├── library-import.ts
│   │   │   │   ├── setlist.test.ts
│   │   │   │   └── setlist.ts
│   │   │   ├── index/
│   │   │   │   ├── content-api.ts
│   │   │   │   ├── import-api.ts
│   │   │   │   ├── mixer-api.ts
│   │   │   │   ├── project-api.ts
│   │   │   │   ├── schema-api.ts
│   │   │   │   ├── shell-api.ts
│   │   │   │   ├── tempo-api.ts
│   │   │   │   ├── time-api.ts
│   │   │   │   └── transport-api.ts
│   │   │   ├── mixer/
│   │   │   │   ├── mixer-math.test.ts
│   │   │   │   ├── mixer-math.ts
│   │   │   │   ├── mixer-routing.test.ts
│   │   │   │   └── mixer-routing.ts
│   │   │   ├── music/
│   │   │   │   ├── chord-display.test.ts
│   │   │   │   ├── chord-display.ts
│   │   │   │   ├── harmonic-accent.test.ts
│   │   │   │   ├── harmonic-accent.ts
│   │   │   │   ├── score-bar-map.test.ts
│   │   │   │   ├── score-bar-map.ts
│   │   │   │   ├── transpose.test.ts
│   │   │   │   └── transpose.ts
│   │   │   ├── project/
│   │   │   │   ├── schema/  … (4 pliki)
│   │   │   │   ├── host-discovery.test.ts
│   │   │   │   ├── host-discovery.ts
│   │   │   │   ├── merge-preserve.test.ts
│   │   │   │   ├── merge-preserve.ts
│   │   │   │   ├── project-bounds.test.ts
│   │   │   │   ├── project-bounds.ts
│   │   │   │   ├── project-resolve.test.ts
│   │   │   │   ├── project-resolve.ts
│   │   │   │   ├── project-seed.test.ts
│   │   │   │   ├── project-seed.ts
│   │   │   │   ├── protocol-version-android.test.ts
│   │   │   │   ├── schema.test.ts
│   │   │   │   └── schema.ts
│   │   │   ├── smart-tempo/
│   │   │   │   ├── backing-clip.ts
│   │   │   │   ├── beat-grid.ts
│   │   │   │   ├── beat1-align.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── drift-gate.ts
│   │   │   │   ├── epoch-shims.test.ts
│   │   │   │   ├── epoch-shims.ts
│   │   │   │   ├── forma-layout.ts
│   │   │   │   ├── run-audio-smart-tempo.ts
│   │   │   │   ├── smart-tempo-beat-grid.test.ts
│   │   │   │   ├── smart-tempo.test.ts
│   │   │   │   ├── smart-tempo.ts
│   │   │   │   ├── tempo-map.ts
│   │   │   │   ├── tempo-nodes.ts
│   │   │   │   └── types.ts
│   │   │   ├── tempo-map-solver/
│   │   │   │   ├── anacrusis.ts
│   │   │   │   ├── anchors.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── multipass.ts
│   │   │   │   ├── seed.ts
│   │   │   │   ├── tempo-map-solver.test.ts
│   │   │   │   ├── tempo-map-solver.ts
│   │   │   │   └── types.ts
│   │   │   ├── text-anchor-bridge/
│   │   │   │   ├── align.ts
│   │   │   │   ├── bridge-api.ts
│   │   │   │   ├── bridge-chord-ms-plan.ts
│   │   │   │   ├── bridge-layout-forma.ts
│   │   │   │   ├── bridge-orchestrator.ts
│   │   │   │   ├── bridge-phrase-anchors.ts
│   │   │   │   ├── bridge-place-akords.ts
│   │   │   │   ├── bridge-resolve-tempo.ts
│   │   │   │   ├── clip-remap.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── forma-freeze.ts
│   │   │   │   ├── onset-grid.ts
│   │   │   │   ├── pristine-grid.test.ts
│   │   │   │   ├── pristine-grid.ts
│   │   │   │   ├── text-anchor-bridge-pure.test.ts
│   │   │   │   ├── text-anchor-bridge.api.test.ts
│   │   │   │   ├── text-anchor-bridge.golden.test.ts
│   │   │   │   ├── text-anchor-bridge.ts
│   │   │   │   ├── text-anchor-bridge.unit.test.ts
│   │   │   │   ├── tokenize.ts
│   │   │   │   ├── types.ts
│   │   │   │   ├── ug-parse.ts
│   │   │   │   └── ultrastar-words.ts
│   │   │   ├── time-tempo/
│   │   │   │   ├── meter-map-bbt.test.ts
│   │   │   │   ├── meter-map-bbt.ts
│   │   │   │   ├── midi-clock.test.ts
│   │   │   │   ├── midi-clock.ts
│   │   │   │   ├── snap-grid.test.ts
│   │   │   │   ├── snap-grid.ts
│   │   │   │   ├── soft-clock.test.ts
│   │   │   │   ├── soft-clock.ts
│   │   │   │   ├── tempo-map-ms.ts
│   │   │   │   ├── tempo-map.test.ts
│   │   │   │   ├── tempo-map.ts
│   │   │   │   ├── time.test.ts
│   │   │   │   └── time.ts
│   │   │   ├── transport/
│   │   │   │   ├── transport-loop.test.ts
│   │   │   │   ├── transport-loop.ts
│   │   │   │   ├── transport.test.ts
│   │   │   │   └── transport.ts
│   │   │   ├── ui-helpers/
│   │   │   │   ├── wand/  … (3 pliki)
│   │   │   │   ├── bracket-spans.ts
│   │   │   │   ├── countdown-content.test.ts
│   │   │   │   ├── countdown-content.ts
│   │   │   │   ├── forma-subsections.test.ts
│   │   │   │   ├── forma-subsections.ts
│   │   │   │   ├── section-names.test.ts
│   │   │   │   ├── section-names.ts
│   │   │   │   ├── stage-cue-banner.test.ts
│   │   │   │   ├── stage-cue-banner.ts
│   │   │   │   ├── tekst-block-text.test.ts
│   │   │   │   ├── tekst-block-text.ts
│   │   │   │   ├── theme-default.test.ts
│   │   │   │   ├── theme-default.ts
│   │   │   │   ├── track-appearance.test.ts
│   │   │   │   ├── track-appearance.ts
│   │   │   │   ├── wand.test.ts
│   │   │   │   └── wand.ts
│   │   │   ├── index.ts
│   │   │   └── README.md
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
│   │   ├── react-library.json
│   │   └── README.md
│   ├── ui/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── badge/  … (2 pliki)
│   │   │   │   ├── button/  … (3 pliki)
│   │   │   │   ├── context-menu/  … (3 pliki)
│   │   │   │   ├── field/  … (3 pliki)
│   │   │   │   ├── segmented/  … (2 pliki)
│   │   │   │   └── slider/  … (3 pliki)
│   │   │   ├── index.ts
│   │   │   ├── README.md
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
│   ├── hub/
│   │   ├── menus/
│   │   │   ├── menu-clean.ts
│   │   │   ├── menu-data.ts
│   │   │   ├── menu-deps.ts
│   │   │   ├── menu-release.ts
│   │   │   ├── menu-run.ts
│   │   │   └── menu-testing.ts
│   │   ├── dev-hub.ts
│   │   ├── doctor.ts
│   │   ├── gate.ts
│   │   ├── network.ts
│   │   └── utils.ts
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
│   ├── README.md
│   └── tsconfig.json
├── .clineignore
├── .clinerules
├── .cursorignore
├── .cursorindexingignore
├── .dockerignore
├── .editorconfig
├── .env.example
├── .gitattributes
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
