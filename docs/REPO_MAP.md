# 🗺️ REPO MAP & CONTEXT (Automatycznie wygenerowano)

> ⚠️ **Uwaga dla Agentów AI / LLM:** Ten plik zawiera wygenerowaną mapę struktury wyłącznie nieignorowanych plików w repozytorium StageSync (zgodnie z .gitignore). Nie edytuj go ręcznie.

---

## 📊 Statystyki Repozytorium (Śledzone w Git)
* **Liczba wszystkich plików:** 1227
* **Liczba katalogów:** 185
* **Data aktualizacji:** 2026-08-06T12:21:33.464Z

### Podział według rozszerzeń
| Rozszerzenie | Liczba plików |
| :--- | :--- |
| `.ts` | 458 |
| `.md` | 184 |
| `.tsx` | 154 |
| `.png` | 94 |
| `.kt` | 69 |
| `.css` | 49 |
| `.xml` | 35 |
| `.json` | 34 |
| `brak rozszerzenia` | 21 |
| `.mjs` | 16 |
| `.js` | 14 |
| `.yml` | 11 |
| `.mdc` | 9 |
| `.txt` | 9 |
| `.svg` | 9 |
| `.sh` | 8 |
| `.html` | 7 |
| `.kts` | 6 |
| `.rs` | 5 |
| `.properties` | 4 |
| `.rtf` | 4 |
| `.mp3` | 4 |
| `.example` | 3 |
| `.pro` | 2 |
| `.jar` | 2 |
| `.toml` | 2 |
| `.bmp` | 2 |
| `.apk` | 2 |
| `.yaml` | 2 |
| `.cpp` | 1 |
| `.lock` | 1 |
| `.icns` | 1 |
| `.ico` | 1 |
| `.webmanifest` | 1 |
| `.jpg` | 1 |
| `.jsonc` | 1 |
| `.keystore` | 1 |

---

## 🏛️ Przegląd Architektury (Poziomy 1 i 2)

- **apps/** — Aplikacje wykonawcze i powłoki klienckie w monorepo
  - **console/** — Android WebView shell dla interfejsu /admin (ADR 0016)
  - **desktop/** — Tauri thin shell dla serwera lokalnego na desktop (ADR 0010)
  - **performer/** — Android WebView shell dla interfejsu /client (ADR 0016)
  - **server/** — Główny backend Node.js — SSOT Host, Master Clock, REST/WS API
  - **web/** — Aplikacja webowa React/Vite (Admin, Client, Timeline, Mikser)
  - **www/** — Strona domowa, portal informacyjny oraz aktualności StageSync
- **data/** — Lokalne dane uruchomieniowe, projekty, pakiety i logi systemowe
  - **downloads/** — Lokalne pliki wyjściowe i instalatory APK
  - **host/** — Lokalne pliki środowiska uruchomieniowego Hosta
  - **library/** — Główny plik bazy utworów (library.json) oraz szablony projektów
  - **logs/** — Buffer logów systemowych, diagnostyka i ślady wykonania
  - **projects/** — Katalog projektów użytkownika z lokalnymi zasobami assets/
- **docs/** — Dokumentacja techniczna, specyfikacje architektoniczne i audyty
  - **adr/** — Architectural Decision Records (Decyzje architektoniczne)
  - **analysis/** — Audyty kodu, analizy wydajności, referencje DAW i specyfikacje
  - **api/** — Specyfikacje interfejsów programistycznych REST i WebSocket
  - **examples/** — Przykładowe pliki baz danych i pakiety projektowe v5
  - **ui/** — Dokumentacja systemu designu, tokenów i komponentów UI
- **launch/** — Narzędzia odpaleniowe, skrypty budowania oraz zasoby platformowe
  - **android/** — Pliki keystore i zasoby do budowania wydań Android
  - **scripts/** — Skrypty automatyzacji budowania, synchronizacji i generowania mapy
- **packages/** — Współdzielone pakiety wewnętrzne monorepo
  - **eslint-config/** — Wspólne reguły ESLint dla całego repozytorium
  - **shared/** — Logika domenowa SSOT, Zod schematy, przeliczenia czasu i akordów
  - **typescript-config/** — Bazowe pliki tsconfig.json dla pism i aplikacji
  - **ui/** — Biblioteka komponentów UI (przycisk, pole, menu, badge)


---

## ⚙️ Konfiguracja i Środowisko (Katalogi Narzędziowe)

- **.agents/** — Instrukcje i kontekst operacyjny dla autonomicznych agentów AI
- **.cursor/** — Konfiguracja środowiska Cursor (agenci, komendy, reguły MDC, umiejętności)
- **.github/** — Szablony zgłoszeń GitHub, wytyczne społeczności oraz workflows CI/CD
- **.husky/** — Haki Git (m.in. pre-commit sanity gate do walidacji typów i mapy)
- **.vscode/** — Ustawienia przestrzeni roboczej VS Code / Cursor (np. explorer file nesting)


---

## 📂 Pełne Drzewo Katalogów i Plików

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
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── config.yml
│   │   └── feature_request.yml
│   ├── workflows/
│   │   ├── ci.yml
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
│   │   │   │   ├── src/
│   │   │   │   │   ├── main/
│   │   │   │   │   │   ├── cpp/
│   │   │   │   │   │   │   ├── CMakeLists.txt
│   │   │   │   │   │   │   └── native-lib.cpp
│   │   │   │   │   │   ├── java/
│   │   │   │   │   │   │   └── com/
│   │   │   │   │   │   │       └── stagesync/
│   │   │   │   │   │   │           └── console/
│   │   │   │   │   │   │               ├── ApkInstaller.kt
│   │   │   │   │   │   │               ├── ApkUpdateChecker.kt
│   │   │   │   │   │   │               ├── ElfLoadAlign.kt
│   │   │   │   │   │   │               ├── FcmTokenHolder.kt
│   │   │   │   │   │   │               ├── HealthProbe.kt
│   │   │   │   │   │   │               ├── HostAssetExtractor.kt
│   │   │   │   │   │   │               ├── HostDiscovery.kt
│   │   │   │   │   │   │               ├── HostProcessLog.kt
│   │   │   │   │   │   │               ├── HostWebActivity.kt
│   │   │   │   │   │   │               ├── LauncherActivity.kt
│   │   │   │   │   │   │               ├── LocalHostButtonMode.kt
│   │   │   │   │   │   │               ├── LocalHostErrorActions.kt
│   │   │   │   │   │   │               ├── LocalHostNative.kt
│   │   │   │   │   │   │               ├── LocalHostNsdAdvertiser.kt
│   │   │   │   │   │   │               ├── LocalHostNsdTxt.kt
│   │   │   │   │   │   │               ├── LocalHostOffer.kt
│   │   │   │   │   │   │               ├── LocalHostRuntime.kt
│   │   │   │   │   │   │               ├── LocalHostService.kt
│   │   │   │   │   │   │               ├── LocalHostStatus.kt
│   │   │   │   │   │   │               ├── LocalUiStore.kt
│   │   │   │   │   │   │               ├── MdnsBrowser.kt
│   │   │   │   │   │   │               ├── PushNotifications.kt
│   │   │   │   │   │   │               ├── QrJoinUrl.kt
│   │   │   │   │   │   │               ├── QrScanActivity.kt
│   │   │   │   │   │   │               ├── RecentHosts.kt
│   │   │   │   │   │   │               ├── ReleaseApkUpdateChecker.kt
│   │   │   │   │   │   │               ├── SemVer.kt
│   │   │   │   │   │   │               ├── ShellConfig.kt
│   │   │   │   │   │   │               └── UiSyncChecker.kt
│   │   │   │   │   │   ├── res/
│   │   │   │   │   │   │   ├── drawable/
│   │   │   │   │   │   │   │   ├── bg_card.xml
│   │   │   │   │   │   │   │   ├── bg_input.xml
│   │   │   │   │   │   │   │   ├── bg_scan_frame.xml
│   │   │   │   │   │   │   │   ├── bg_status_dot.xml
│   │   │   │   │   │   │   │   ├── bg_tile.xml
│   │   │   │   │   │   │   │   ├── ic_file_text.xml
│   │   │   │   │   │   │   │   ├── ss_brand.png
│   │   │   │   │   │   │   │   └── ss_wordmark.png
│   │   │   │   │   │   │   ├── layout/
│   │   │   │   │   │   │   │   ├── activity_host_web.xml
│   │   │   │   │   │   │   │   ├── activity_launcher.xml
│   │   │   │   │   │   │   │   ├── activity_qr_scan.xml
│   │   │   │   │   │   │   │   └── item_host_card.xml
│   │   │   │   │   │   │   ├── mipmap-anydpi-v26/
│   │   │   │   │   │   │   │   └── ic_launcher.xml
│   │   │   │   │   │   │   ├── mipmap-hdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── mipmap-mdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── mipmap-xhdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── mipmap-xxhdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── mipmap-xxxhdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── values/
│   │   │   │   │   │   │   │   ├── colors.xml
│   │   │   │   │   │   │   │   ├── strings.xml
│   │   │   │   │   │   │   │   └── themes.xml
│   │   │   │   │   │   │   └── xml/
│   │   │   │   │   │   │       ├── file_paths.xml
│   │   │   │   │   │   │       └── network_security_config.xml
│   │   │   │   │   │   └── AndroidManifest.xml
│   │   │   │   │   └── test/
│   │   │   │   │       └── java/
│   │   │   │   │           └── com/
│   │   │   │   │               └── stagesync/
│   │   │   │   │                   └── console/
│   │   │   │   │                       ├── ApkHealthVersionParseTest.kt
│   │   │   │   │                       ├── ElfLoadAlignTest.kt
│   │   │   │   │                       ├── HostDiscoveryTest.kt
│   │   │   │   │                       ├── HostProcessLogTest.kt
│   │   │   │   │                       ├── LocalHostButtonModeTest.kt
│   │   │   │   │                       ├── LocalHostErrorActionsTest.kt
│   │   │   │   │                       ├── LocalHostNsdTxtTest.kt
│   │   │   │   │                       ├── LocalHostOfferTest.kt
│   │   │   │   │                       ├── LocalHostRuntimeTest.kt
│   │   │   │   │                       ├── LocalHostStatusTest.kt
│   │   │   │   │                       ├── LocalUiHashParseTest.kt
│   │   │   │   │                       ├── QrJoinUrlTest.kt
│   │   │   │   │                       ├── RecentHostsNormalizeTest.kt
│   │   │   │   │                       ├── ReleaseApkUpdateCheckerTest.kt
│   │   │   │   │                       ├── SemVerTest.kt
│   │   │   │   │                       └── UiSyncCheckerTest.kt
│   │   │   │   ├── build.gradle.kts
│   │   │   │   ├── google-services.json.example
│   │   │   │   └── proguard-rules.pro
│   │   │   ├── gradle/
│   │   │   │   └── wrapper/
│   │   │   │       ├── gradle-wrapper.jar
│   │   │   │       └── gradle-wrapper.properties
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
│   │   │   ├── styles.css
│   │   │   ├── updateDialog.js
│   │   │   └── updateDialog.test.js
│   │   ├── src-tauri/
│   │   │   ├── assets/
│   │   │   │   └── installer/
│   │   │   │       ├── wiz-banner.bmp
│   │   │   │       └── wiz-dialog.bmp
│   │   │   ├── capabilities/
│   │   │   │   └── default.json
│   │   │   ├── icons/
│   │   │   │   ├── android/
│   │   │   │   │   ├── mipmap-anydpi-v26/
│   │   │   │   │   │   └── ic_launcher.xml
│   │   │   │   │   ├── mipmap-hdpi/
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   ├── mipmap-mdpi/
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   ├── mipmap-xhdpi/
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   ├── mipmap-xxhdpi/
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   ├── mipmap-xxxhdpi/
│   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   └── values/
│   │   │   │   │       └── ic_launcher_background.xml
│   │   │   │   ├── ios/
│   │   │   │   │   ├── AppIcon-20x20@1x.png
│   │   │   │   │   ├── AppIcon-20x20@2x-1.png
│   │   │   │   │   ├── AppIcon-20x20@2x.png
│   │   │   │   │   ├── AppIcon-20x20@3x.png
│   │   │   │   │   ├── AppIcon-29x29@1x.png
│   │   │   │   │   ├── AppIcon-29x29@2x-1.png
│   │   │   │   │   ├── AppIcon-29x29@2x.png
│   │   │   │   │   ├── AppIcon-29x29@3x.png
│   │   │   │   │   ├── AppIcon-40x40@1x.png
│   │   │   │   │   ├── AppIcon-40x40@2x-1.png
│   │   │   │   │   ├── AppIcon-40x40@2x.png
│   │   │   │   │   ├── AppIcon-40x40@3x.png
│   │   │   │   │   ├── AppIcon-512@2x.png
│   │   │   │   │   ├── AppIcon-60x60@2x.png
│   │   │   │   │   ├── AppIcon-60x60@3x.png
│   │   │   │   │   ├── AppIcon-76x76@1x.png
│   │   │   │   │   ├── AppIcon-76x76@2x.png
│   │   │   │   │   └── AppIcon-83.5x83.5@2x.png
│   │   │   │   ├── tray/
│   │   │   │   │   ├── base.png
│   │   │   │   │   ├── dot_error.png
│   │   │   │   │   ├── dot_running.png
│   │   │   │   │   └── dot_starting.png
│   │   │   │   ├── 128x128.png
│   │   │   │   ├── 128x128@2x.png
│   │   │   │   ├── 32x32.png
│   │   │   │   ├── 64x64.png
│   │   │   │   ├── icon.icns
│   │   │   │   ├── icon.ico
│   │   │   │   ├── icon.png
│   │   │   │   ├── Square107x107Logo.png
│   │   │   │   ├── Square142x142Logo.png
│   │   │   │   ├── Square150x150Logo.png
│   │   │   │   ├── Square284x284Logo.png
│   │   │   │   ├── Square30x30Logo.png
│   │   │   │   ├── Square310x310Logo.png
│   │   │   │   ├── Square44x44Logo.png
│   │   │   │   ├── Square71x71Logo.png
│   │   │   │   ├── Square89x89Logo.png
│   │   │   │   └── StoreLogo.png
│   │   │   ├── permissions/
│   │   │   │   └── desktop-bridge.toml
│   │   │   ├── src/
│   │   │   │   ├── launcher.rs
│   │   │   │   ├── lib.rs
│   │   │   │   ├── main.rs
│   │   │   │   └── tray.rs
│   │   │   ├── build.rs
│   │   │   ├── Cargo.lock
│   │   │   ├── Cargo.toml
│   │   │   └── tauri.conf.json
│   │   ├── ui-placeholder/
│   │   │   └── index.html
│   │   ├── package.json
│   │   └── README.md
│   ├── performer/
│   │   ├── android/
│   │   │   ├── app/
│   │   │   │   ├── src/
│   │   │   │   │   ├── main/
│   │   │   │   │   │   ├── java/
│   │   │   │   │   │   │   └── com/
│   │   │   │   │   │   │       └── stagesync/
│   │   │   │   │   │   │           └── performer/
│   │   │   │   │   │   │               ├── ApkInstaller.kt
│   │   │   │   │   │   │               ├── ApkUpdateChecker.kt
│   │   │   │   │   │   │               ├── FcmTokenHolder.kt
│   │   │   │   │   │   │               ├── HealthProbe.kt
│   │   │   │   │   │   │               ├── HostDiscovery.kt
│   │   │   │   │   │   │               ├── HostWebActivity.kt
│   │   │   │   │   │   │               ├── LauncherActivity.kt
│   │   │   │   │   │   │               ├── LocalUiStore.kt
│   │   │   │   │   │   │               ├── MdnsBrowser.kt
│   │   │   │   │   │   │               ├── PushNotifications.kt
│   │   │   │   │   │   │               ├── QrJoinUrl.kt
│   │   │   │   │   │   │               ├── QrScanActivity.kt
│   │   │   │   │   │   │               ├── RecentHosts.kt
│   │   │   │   │   │   │               ├── ReleaseApkUpdateChecker.kt
│   │   │   │   │   │   │               ├── SemVer.kt
│   │   │   │   │   │   │               ├── ShellConfig.kt
│   │   │   │   │   │   │               └── UiSyncChecker.kt
│   │   │   │   │   │   ├── res/
│   │   │   │   │   │   │   ├── drawable/
│   │   │   │   │   │   │   │   ├── bg_card.xml
│   │   │   │   │   │   │   │   ├── bg_input.xml
│   │   │   │   │   │   │   │   ├── bg_scan_frame.xml
│   │   │   │   │   │   │   │   ├── bg_status_dot.xml
│   │   │   │   │   │   │   │   ├── bg_tile.xml
│   │   │   │   │   │   │   │   ├── ss_brand.png
│   │   │   │   │   │   │   │   └── ss_wordmark.png
│   │   │   │   │   │   │   ├── layout/
│   │   │   │   │   │   │   │   ├── activity_host_web.xml
│   │   │   │   │   │   │   │   ├── activity_launcher.xml
│   │   │   │   │   │   │   │   ├── activity_qr_scan.xml
│   │   │   │   │   │   │   │   └── item_host_card.xml
│   │   │   │   │   │   │   ├── mipmap-anydpi-v26/
│   │   │   │   │   │   │   │   └── ic_launcher.xml
│   │   │   │   │   │   │   ├── mipmap-hdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── mipmap-mdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── mipmap-xhdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── mipmap-xxhdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── mipmap-xxxhdpi/
│   │   │   │   │   │   │   │   ├── ic_launcher_foreground.png
│   │   │   │   │   │   │   │   ├── ic_launcher_round.png
│   │   │   │   │   │   │   │   └── ic_launcher.png
│   │   │   │   │   │   │   ├── values/
│   │   │   │   │   │   │   │   ├── colors.xml
│   │   │   │   │   │   │   │   ├── strings.xml
│   │   │   │   │   │   │   │   └── themes.xml
│   │   │   │   │   │   │   └── xml/
│   │   │   │   │   │   │       ├── file_paths.xml
│   │   │   │   │   │   │       └── network_security_config.xml
│   │   │   │   │   │   └── AndroidManifest.xml
│   │   │   │   │   └── test/
│   │   │   │   │       └── java/
│   │   │   │   │           └── com/
│   │   │   │   │               └── stagesync/
│   │   │   │   │                   └── performer/
│   │   │   │   │                       ├── ApkHealthVersionParseTest.kt
│   │   │   │   │                       ├── LocalUiHashParseTest.kt
│   │   │   │   │                       ├── QrJoinUrlTest.kt
│   │   │   │   │                       ├── RecentHostsNormalizeTest.kt
│   │   │   │   │                       ├── ReleaseApkUpdateCheckerTest.kt
│   │   │   │   │                       ├── SemVerTest.kt
│   │   │   │   │                       └── UiSyncCheckerTest.kt
│   │   │   │   ├── build.gradle.kts
│   │   │   │   ├── google-services.json.example
│   │   │   │   └── proguard-rules.pro
│   │   │   ├── gradle/
│   │   │   │   └── wrapper/
│   │   │   │       ├── gradle-wrapper.jar
│   │   │   │       └── gradle-wrapper.properties
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
│   │   │   ├── cli/
│   │   │   │   ├── migrate-legacy.smoke.test.ts
│   │   │   │   └── migrate-legacy.ts
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
│   │   │   │   ├── fixtures/
│   │   │   │   │   └── ug-tab-sample.json
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
│   │   │   │   ├── stagesync-logo-light.svg
│   │   │   │   ├── stagesync-logo.svg
│   │   │   │   └── stagesync-mark.svg
│   │   │   ├── favicon.svg
│   │   │   ├── manifest.webmanifest
│   │   │   ├── pwa-icon-192.png
│   │   │   ├── pwa-icon-512.png
│   │   │   └── sw.js
│   │   ├── scripts/
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
│   │   │   │   ├── audio/
│   │   │   │   │   ├── audioHwCapability.test.ts
│   │   │   │   │   ├── audioHwCapability.ts
│   │   │   │   │   ├── audioHwEdit.test.ts
│   │   │   │   │   ├── audioHwEdit.ts
│   │   │   │   │   ├── audioLaneEdit.test.ts
│   │   │   │   │   ├── audioLaneEdit.ts
│   │   │   │   │   ├── audioLatencyPrefs.test.ts
│   │   │   │   │   ├── audioLatencyPrefs.ts
│   │   │   │   │   ├── audioLeadInResolver.test.ts
│   │   │   │   │   ├── audioLeadInResolver.ts
│   │   │   │   │   ├── audioOutputPrefs.test.ts
│   │   │   │   │   ├── audioOutputPrefs.ts
│   │   │   │   │   ├── audioPlayback.test.ts
│   │   │   │   │   ├── audioPlayback.ts
│   │   │   │   │   ├── audioTempoAnalysis.test.ts
│   │   │   │   │   ├── audioTempoAnalysis.ts
│   │   │   │   │   ├── beatMapperAudition.test.ts
│   │   │   │   │   ├── beatMapperAudition.ts
│   │   │   │   │   ├── beatMapperView.test.ts
│   │   │   │   │   ├── beatMapperView.ts
│   │   │   │   │   ├── metronome.test.ts
│   │   │   │   │   ├── metronome.ts
│   │   │   │   │   ├── metronomePrefs.test.ts
│   │   │   │   │   ├── metronomePrefs.ts
│   │   │   │   │   ├── smartTempoBenchmarkData.json
│   │   │   │   │   ├── smartTempoBenchmarkHistory.json
│   │   │   │   │   ├── tapTempo.test.ts
│   │   │   │   │   ├── tapTempo.ts
│   │   │   │   │   ├── waveformPeaks.test.ts
│   │   │   │   │   └── waveformPeaks.ts
│   │   │   │   ├── client/
│   │   │   │   │   ├── androidLatest.test.ts
│   │   │   │   │   ├── androidLatest.ts
│   │   │   │   │   ├── appearance.test.ts
│   │   │   │   │   ├── appearance.ts
│   │   │   │   │   ├── appVersion.test.ts
│   │   │   │   │   ├── appVersion.ts
│   │   │   │   │   ├── clientDisplayPrefs.test.ts
│   │   │   │   │   ├── clientDisplayPrefs.ts
│   │   │   │   │   ├── clientForma.test.ts
│   │   │   │   │   ├── clientForma.ts
│   │   │   │   │   ├── clientKaraoke.test.ts
│   │   │   │   │   ├── clientKaraoke.ts
│   │   │   │   │   ├── clientVocalTap.test.ts
│   │   │   │   │   ├── clientVocalTap.ts
│   │   │   │   │   ├── clockDisplayPrefs.test.ts
│   │   │   │   │   ├── clockDisplayPrefs.ts
│   │   │   │   │   ├── desktopBridge.test.ts
│   │   │   │   │   ├── desktopBridge.ts
│   │   │   │   │   ├── desktopFileMenu.test.ts
│   │   │   │   │   ├── desktopFileMenu.ts
│   │   │   │   │   ├── desktopMenuEvents.test.ts
│   │   │   │   │   ├── desktopMenuEvents.ts
│   │   │   │   │   ├── deviceNamePrefs.test.ts
│   │   │   │   │   ├── deviceNamePrefs.ts
│   │   │   │   │   ├── docsLinks.test.ts
│   │   │   │   │   ├── docsLinks.ts
│   │   │   │   │   ├── draftHistory.test.ts
│   │   │   │   │   ├── draftHistory.ts
│   │   │   │   │   ├── isEditableKeyboardTarget.test.ts
│   │   │   │   │   ├── isEditableKeyboardTarget.ts
│   │   │   │   │   ├── lastTimelineProject.test.ts
│   │   │   │   │   ├── lastTimelineProject.ts
│   │   │   │   │   ├── memoryPressure.test.ts
│   │   │   │   │   ├── memoryPressure.ts
│   │   │   │   │   ├── mixerZoneVisibility.test.ts
│   │   │   │   │   ├── mixerZoneVisibility.ts
│   │   │   │   │   ├── nativeShell.test.ts
│   │   │   │   │   ├── nativeShell.ts
│   │   │   │   │   ├── preferencesEvents.test.ts
│   │   │   │   │   ├── preferencesEvents.ts
│   │   │   │   │   ├── pushNotifications.test.ts
│   │   │   │   │   ├── pushNotifications.ts
│   │   │   │   │   ├── screenWakeLock.test.ts
│   │   │   │   │   ├── screenWakeLock.ts
│   │   │   │   │   ├── sentry.test.ts
│   │   │   │   │   ├── sentry.ts
│   │   │   │   │   ├── truncateMiddle.dom.test.ts
│   │   │   │   │   ├── truncateMiddle.test.ts
│   │   │   │   │   ├── truncateMiddle.ts
│   │   │   │   │   ├── useAnnounceDevicePresence.test.tsx
│   │   │   │   │   ├── useAnnounceDevicePresence.ts
│   │   │   │   │   ├── useKeepTileAboveIme.test.ts
│   │   │   │   │   ├── useKeepTileAboveIme.ts
│   │   │   │   │   ├── useMqMobileCompact.test.ts
│   │   │   │   │   ├── useMqMobileCompact.ts
│   │   │   │   │   └── useMqTablet.ts
│   │   │   │   ├── shell-operator/
│   │   │   │   │   ├── libraryApi.test.ts
│   │   │   │   │   ├── libraryApi.ts
│   │   │   │   │   ├── operatorNavRoutes.ts
│   │   │   │   │   ├── operatorNavShortcuts.test.ts
│   │   │   │   │   ├── operatorNavShortcuts.ts
│   │   │   │   │   ├── operatorPin.test.ts
│   │   │   │   │   ├── operatorPin.ts
│   │   │   │   │   ├── operatorPinSession.test.ts
│   │   │   │   │   ├── operatorPinSession.ts
│   │   │   │   │   ├── operatorSession.test.ts
│   │   │   │   │   ├── operatorSession.ts
│   │   │   │   │   ├── operatorSurface.test.ts
│   │   │   │   │   ├── operatorSurface.ts
│   │   │   │   │   ├── projectAssetsApi.test.ts
│   │   │   │   │   ├── projectAssetsApi.ts
│   │   │   │   │   ├── setlistApi.test.ts
│   │   │   │   │   ├── setlistApi.ts
│   │   │   │   │   ├── ugImportApi.test.ts
│   │   │   │   │   ├── ugImportApi.ts
│   │   │   │   │   ├── ultrastarImportApi.test.ts
│   │   │   │   │   ├── ultrastarImportApi.ts
│   │   │   │   │   ├── useActiveProject.test.ts
│   │   │   │   │   └── useActiveProject.ts
│   │   │   │   ├── timeline/
│   │   │   │   │   ├── breakpoints.test.ts
│   │   │   │   │   ├── breakpoints.ts
│   │   │   │   │   ├── clientBarCells.test.ts
│   │   │   │   │   ├── clientBarCells.ts
│   │   │   │   │   ├── clientGrid.test.ts
│   │   │   │   │   ├── clientGrid.ts
│   │   │   │   │   ├── clipStartEdit.test.ts
│   │   │   │   │   ├── clipStartEdit.ts
│   │   │   │   │   ├── gridHeroMotion.test.ts
│   │   │   │   │   ├── gridHeroMotion.ts
│   │   │   │   │   ├── mapLaneEdit.test.ts
│   │   │   │   │   ├── mapLaneEdit.ts
│   │   │   │   │   ├── mapSegments.test.ts
│   │   │   │   │   ├── mapSegments.ts
│   │   │   │   │   ├── syncLead.test.ts
│   │   │   │   │   ├── syncLead.ts
│   │   │   │   │   ├── timelineClipboard.test.ts
│   │   │   │   │   ├── timelineClipboard.ts
│   │   │   │   │   ├── timelineContextMenus.test.ts
│   │   │   │   │   ├── timelineContextMenus.ts
│   │   │   │   │   ├── timelineDockWidth.test.ts
│   │   │   │   │   ├── timelineDockWidth.ts
│   │   │   │   │   ├── timelineGesture.test.ts
│   │   │   │   │   ├── timelineGesture.ts
│   │   │   │   │   ├── timelineKeyboardShortcuts.test.ts
│   │   │   │   │   ├── timelineKeyboardShortcuts.ts
│   │   │   │   │   ├── timelineLaneHeights.test.ts
│   │   │   │   │   ├── timelineLaneHeights.ts
│   │   │   │   │   ├── timelineLocator.test.ts
│   │   │   │   │   ├── timelineLocator.ts
│   │   │   │   │   ├── timelineSelection.test.ts
│   │   │   │   │   ├── timelineSelection.ts
│   │   │   │   │   ├── timelineToolbarTools.test.ts
│   │   │   │   │   ├── timelineToolbarTools.ts
│   │   │   │   │   ├── timelineTouchGestures.test.ts
│   │   │   │   │   ├── timelineTouchGestures.ts
│   │   │   │   │   ├── timelineTouchNudge.test.ts
│   │   │   │   │   ├── timelineTouchNudge.ts
│   │   │   │   │   ├── timelineTouchTier.test.ts
│   │   │   │   │   ├── timelineTouchTier.ts
│   │   │   │   │   ├── timelineTracks.test.ts
│   │   │   │   │   ├── timelineTracks.ts
│   │   │   │   │   ├── timelineZoomPrefs.test.ts
│   │   │   │   │   ├── timelineZoomPrefs.ts
│   │   │   │   │   ├── useTimelineTouchGestures.test.ts
│   │   │   │   │   └── useTimelineTouchGestures.ts
│   │   │   │   └── timeline-edit/
│   │   │   │       ├── akordyEdit.test.ts
│   │   │   │       ├── akordyEdit.ts
│   │   │   │       ├── contentLaneEdit.test.ts
│   │   │   │       ├── contentLaneEdit.ts
│   │   │   │       ├── cueEdit.test.ts
│   │   │   │       ├── cueEdit.ts
│   │   │   │       ├── formaCanvas.test.ts
│   │   │   │       ├── formaCanvas.ts
│   │   │   │       ├── formaEdit.test.ts
│   │   │   │       ├── formaEdit.ts
│   │   │   │       ├── formaInspector.test.ts
│   │   │   │       ├── formaInspector.ts
│   │   │   │       ├── formaSubsections.test.ts
│   │   │   │       ├── formaSubsections.ts
│   │   │   │       ├── scoreBarEdit.test.ts
│   │   │   │       ├── scoreBarEdit.ts
│   │   │   │       ├── scoreOsmd.test.ts
│   │   │   │       ├── scoreOsmd.ts
│   │   │   │       ├── scorePlayhead.test.ts
│   │   │   │       ├── scorePlayhead.ts
│   │   │   │       ├── setlistBudget.test.ts
│   │   │   │       ├── setlistBudget.ts
│   │   │   │       ├── tekstBlocks.test.ts
│   │   │   │       ├── tekstBlocks.ts
│   │   │   │       ├── tekstEdit.test.ts
│   │   │   │       └── tekstEdit.ts
│   │   │   ├── shells/
│   │   │   │   ├── admin/
│   │   │   │   │   ├── modals/
│   │   │   │   │   │   ├── BatchPcModal.tsx
│   │   │   │   │   │   ├── Modal.tsx
│   │   │   │   │   │   └── MusicXmlModal.tsx
│   │   │   │   │   ├── views/
│   │   │   │   │   │   ├── LibraryFilesCard.tsx
│   │   │   │   │   │   └── SongsView.tsx
│   │   │   │   │   ├── AdminAccordionCard.test.tsx
│   │   │   │   │   ├── AdminAccordionCard.tsx
│   │   │   │   │   ├── DevView.module.css
│   │   │   │   │   ├── DevView.tsx
│   │   │   │   │   ├── filterLibrarySongs.test.ts
│   │   │   │   │   ├── filterLibrarySongs.ts
│   │   │   │   │   ├── ProjectFilesPanel.test.tsx
│   │   │   │   │   ├── ProjectFilesPanel.tsx
│   │   │   │   │   ├── SetView.module.css
│   │   │   │   │   ├── SetView.test.tsx
│   │   │   │   │   ├── SetView.tsx
│   │   │   │   │   ├── songCatalogBadges.test.ts
│   │   │   │   │   ├── songCatalogBadges.ts
│   │   │   │   │   ├── StageView.module.css
│   │   │   │   │   ├── StageView.test.tsx
│   │   │   │   │   ├── StageView.tsx
│   │   │   │   │   ├── SystemView.module.css
│   │   │   │   │   ├── SystemView.test.tsx
│   │   │   │   │   └── SystemView.tsx
│   │   │   │   ├── client/
│   │   │   │   │   ├── ChordName.test.tsx
│   │   │   │   │   ├── ChordName.tsx
│   │   │   │   │   ├── DrumsPane.test.tsx
│   │   │   │   │   ├── DrumsPane.tsx
│   │   │   │   │   ├── GridPane.test.tsx
│   │   │   │   │   ├── GridPane.tsx
│   │   │   │   │   ├── KaraokePane.test.tsx
│   │   │   │   │   ├── KaraokePane.tsx
│   │   │   │   │   ├── ScorePane.test.tsx
│   │   │   │   │   └── ScorePane.tsx
│   │   │   │   ├── components/
│   │   │   │   │   ├── AppHeader.module.css
│   │   │   │   │   ├── AppHeader.test.tsx
│   │   │   │   │   ├── AppHeader.tsx
│   │   │   │   │   ├── OperatorNav.module.css
│   │   │   │   │   ├── OperatorNav.test.tsx
│   │   │   │   │   ├── OperatorNav.tsx
│   │   │   │   │   ├── SmartTempoAccuracyDashboard.module.css
│   │   │   │   │   ├── SmartTempoAccuracyDashboard.test.tsx
│   │   │   │   │   └── SmartTempoAccuracyDashboard.tsx
│   │   │   │   ├── import/
│   │   │   │   │   ├── AudioDropzone.module.css
│   │   │   │   │   ├── AudioDropzone.tsx
│   │   │   │   │   ├── BeatMapperPane.module.css
│   │   │   │   │   ├── BeatMapperPane.tsx
│   │   │   │   │   ├── ImportProgress.module.css
│   │   │   │   │   └── ImportProgress.tsx
│   │   │   │   ├── pages/
│   │   │   │   │   ├── SmartTempoPage.module.css
│   │   │   │   │   ├── SmartTempoPage.test.tsx
│   │   │   │   │   └── SmartTempoPage.tsx
│   │   │   │   ├── settings/
│   │   │   │   │   └── tabs/
│   │   │   │   │       ├── AudioSettingsTab.tsx
│   │   │   │   │       ├── GeneralSettingsTab.tsx
│   │   │   │   │       ├── MetronomeSettingsTab.tsx
│   │   │   │   │       ├── MidiSettingsTab.tsx
│   │   │   │   │       └── ServerSettingsTab.tsx
│   │   │   │   ├── shared/
│   │   │   │   │   ├── index.tsx
│   │   │   │   │   └── shellChrome.module.css
│   │   │   │   ├── timeline/
│   │   │   │   │   ├── channelStrip/
│   │   │   │   │   │   ├── ChannelStripControls.module.css
│   │   │   │   │   │   ├── ChannelStripControls.test.tsx
│   │   │   │   │   │   ├── ChannelStripControls.tsx
│   │   │   │   │   │   ├── channelStripTypes.ts
│   │   │   │   │   │   ├── ClickStrip.test.tsx
│   │   │   │   │   │   ├── ClickStrip.tsx
│   │   │   │   │   │   ├── DualDbReadout.test.tsx
│   │   │   │   │   │   ├── DualDbReadout.tsx
│   │   │   │   │   │   ├── HwOutStrip.test.tsx
│   │   │   │   │   │   ├── HwOutStrip.tsx
│   │   │   │   │   │   ├── index.ts
│   │   │   │   │   │   ├── MasterStrip.test.tsx
│   │   │   │   │   │   ├── MasterStrip.tsx
│   │   │   │   │   │   ├── meterPaint.test.ts
│   │   │   │   │   │   ├── meterPaint.ts
│   │   │   │   │   │   ├── MiddleTruncateLabel.test.tsx
│   │   │   │   │   │   ├── MiddleTruncateLabel.tsx
│   │   │   │   │   │   ├── mixerStrip.test.ts
│   │   │   │   │   │   ├── MixerSurface.module.css
│   │   │   │   │   │   ├── MixerSurface.test.tsx
│   │   │   │   │   │   ├── MixerSurface.tsx
│   │   │   │   │   │   ├── OutputSelector.test.ts
│   │   │   │   │   │   ├── OutputSelector.tsx
│   │   │   │   │   │   ├── PanKnob.test.tsx
│   │   │   │   │   │   ├── PanKnob.tsx
│   │   │   │   │   │   ├── PeakMeter.module.css
│   │   │   │   │   │   ├── PeakMeter.styles.test.ts
│   │   │   │   │   │   ├── PeakMeter.test.tsx
│   │   │   │   │   │   ├── PeakMeter.tsx
│   │   │   │   │   │   ├── TaperGainSlider.test.tsx
│   │   │   │   │   │   ├── TaperGainSlider.tsx
│   │   │   │   │   │   ├── TrackAppearancePicker.test.tsx
│   │   │   │   │   │   ├── TrackAppearancePicker.tsx
│   │   │   │   │   │   ├── useMixerMeterLevels.ts
│   │   │   │   │   │   ├── VerticalFader.test.tsx
│   │   │   │   │   │   └── VerticalFader.tsx
│   │   │   │   │   ├── FormaClipPreview.test.tsx
│   │   │   │   │   ├── FormaClipPreview.tsx
│   │   │   │   │   ├── MixerDock.tsx
│   │   │   │   │   ├── TimelineHelp.module.css
│   │   │   │   │   ├── TimelineHelp.test.tsx
│   │   │   │   │   ├── TimelineHelp.tsx
│   │   │   │   │   └── TimelineToolbar.tsx
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
│   │   │   │   ├── DesktopMenuBridge.module.css
│   │   │   │   ├── DesktopMenuBridge.tsx
│   │   │   │   ├── DesktopRootRedirect.test.tsx
│   │   │   │   ├── DesktopRootRedirect.tsx
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
│   │   │   │   ├── ShellNotificationFields.module.css
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
│   │   │       └── smart-tempo-train-data/
│   │   │           ├── Billie Jean.rtf
│   │   │           ├── I Will Survive.mp3
│   │   │           ├── I will survive.rtf
│   │   │           ├── Michael Jackson - Billie Jean (Official Video) (1).mp3
│   │   │           ├── Nirvana - Smells Like Teen Spirit (Official Music Video).mp3
│   │   │           ├── Smells Like Teen Spirit.rtf
│   │   │           ├── The Winner Takes It All.mp3
│   │   │           └── The Winner Takes It All.rtf
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
│   │   ├── public/
│   │   │   ├── brand/
│   │   │   │   ├── stagesync-logo-light.svg
│   │   │   │   ├── stagesync-logo.svg
│   │   │   │   └── stagesync-mark.svg
│   │   │   ├── config/
│   │   │   │   └── channels.json
│   │   │   ├── media/
│   │   │   │   ├── preview-admin.png
│   │   │   │   ├── preview-chords.png
│   │   │   │   ├── preview-lyrics.png
│   │   │   │   ├── preview-mixer.png
│   │   │   │   └── preview-timeline.png
│   │   │   ├── og-image.jpg
│   │   │   ├── og-image.png
│   │   │   └── og-image.svg
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
│   │   └── README.md
│   ├── analysis/
│   │   ├── inspiracje/
│   │   │   ├── audyty-silnik/
│   │   │   │   ├── Audyt-Architektury-StageSync-v5.md
│   │   │   │   ├── Audyt-Architektury-StageSync-v5.triage.md
│   │   │   │   ├── Audyt-Edytora-Sciezek-Audio.md
│   │   │   │   ├── Audyt-Edytora-Sciezek-Audio.triage.md
│   │   │   │   ├── Audyt-Lifecycle-StageSync-v5-Desktop.md
│   │   │   │   ├── Audyt-Lifecycle-StageSync-v5-Desktop.triage.md
│   │   │   │   ├── Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md
│   │   │   │   ├── Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md
│   │   │   │   ├── Audyt-Routingu-Miksera-StageSync.md
│   │   │   │   ├── Audyt-Routingu-Miksera-StageSync.triage.md
│   │   │   │   ├── Audyt-Silnika-Odtwarzania-Audio-WebAudio.md
│   │   │   │   ├── Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md
│   │   │   │   ├── Audyt-StageSync-v5-Race-Conditions.md
│   │   │   │   ├── Audyt-StageSync-v5-Race-Conditions.triage.md
│   │   │   │   ├── Audyt-Synchronizacji-Transport-SSOT.md
│   │   │   │   └── Audyt-Synchronizacji-Transport-SSOT.triage.md
│   │   │   ├── referencje-daw/
│   │   │   │   ├── Logika-Edycji-Klipow-Logic-Pro.md
│   │   │   │   ├── Logika-Edycji-Klipow-Logic-Pro.triage.md
│   │   │   │   ├── Referencja-Zachowan-Live-MIDI.md
│   │   │   │   ├── Referencja-Zachowan-Live-MIDI.triage.md
│   │   │   │   ├── Specyfikacja-Referencji-Zachowan-Wyswietlania.md
│   │   │   │   ├── Specyfikacja-Referencji-Zachowan-Wyswietlania.triage.md
│   │   │   │   ├── UXLogika-Show-Tools-Referencja-Zachowan.md
│   │   │   │   └── UXLogika-Show-Tools-Referencja-Zachowan.triage.md
│   │   │   ├── spec-5.2+/
│   │   │   │   ├── Architektura-Ingestii-Danych-Muzycznych-StageSync.md
│   │   │   │   ├── Architektura-Ingestii-Danych-Muzycznych-StageSync.triage.md
│   │   │   │   ├── Dynamic-Tempo-Mapping-Technical-Blueprint.md
│   │   │   │   ├── Dynamic-Tempo-Mapping-Technical-Blueprint.triage.md
│   │   │   │   ├── Implementacja-Smart-Tempo-w-Antigravity.md
│   │   │   │   ├── Implementacja-Smart-Tempo-w-Antigravity.triage.md
│   │   │   │   ├── Krytyka-strategii-Mobile-for-Live.md
│   │   │   │   ├── Krytyka-strategii-Mobile-for-Live.triage.md
│   │   │   │   ├── MotywyAuth-Bezpieczenstwo-UX-Decyzje.md
│   │   │   │   ├── MotywyAuth-Bezpieczenstwo-UX-Decyzje.triage.md
│   │   │   │   ├── Ocena-Decyzji-Produktowych-StageSync-v1.md
│   │   │   │   ├── Ocena-Decyzji-Produktowych-StageSync-v1.triage.md
│   │   │   │   ├── Ocena-Decyzji-Produktowych-StageSync.md
│   │   │   │   ├── Ocena-Decyzji-Produktowych-StageSync.triage.md
│   │   │   │   ├── Ocena-decyzji-Sampler-Cue.md
│   │   │   │   ├── Ocena-decyzji-Sampler-Cue.triage.md
│   │   │   │   ├── Ocena-Safety-Net-StageSync-437.md
│   │   │   │   ├── Ocena-Safety-Net-StageSync-437.triage.md
│   │   │   │   ├── Ocena-Strategii-Produktu-StageSync-v5.md
│   │   │   │   ├── Ocena-Strategii-Produktu-StageSync-v5.triage.md
│   │   │   │   ├── Recenzja-Decyzji-Live-FOH-Audio.md
│   │   │   │   ├── Recenzja-Decyzji-Live-FOH-Audio.triage.md
│   │   │   │   ├── Safety-Net-dla-StageSync-v5.2.md
│   │   │   │   ├── Safety-Net-dla-StageSync-v5.2.triage.md
│   │   │   │   ├── Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md
│   │   │   │   ├── Specyfikacja-Klienta-Mobile-StageSync-v5.2+.triage.md
│   │   │   │   ├── Specyfikacja-Motywow-i-Autentykacji-DAW.md
│   │   │   │   ├── Specyfikacja-Motywow-i-Autentykacji-DAW.triage.md
│   │   │   │   ├── Specyfikacja-StageSync-Cues-Sampler.md
│   │   │   │   ├── Specyfikacja-StageSync-Cues-Sampler.triage.md
│   │   │   │   ├── Specyfikacja-StageSync-dla-miksera-DAW.md
│   │   │   │   ├── Specyfikacja-StageSync-dla-miksera-DAW.triage.md
│   │   │   │   ├── StageSync-v5.2+-MIDI-PC-Referencja.md
│   │   │   │   └── StageSync-v5.2+-MIDI-PC-Referencja.triage.md
│   │   │   ├── testy-pokrycie/
│   │   │   │   ├── Analiza-Importu-ChordProUG.md
│   │   │   │   ├── Analiza-Importu-ChordProUG.triage.md
│   │   │   │   ├── Analiza-Luki-Testow-Wand.md
│   │   │   │   ├── Analiza-Luki-Testow-Wand.triage.md
│   │   │   │   ├── Analiza-Pokrycia-Audio-Lane-Edit.md
│   │   │   │   ├── Analiza-Pokrycia-Audio-Lane-Edit.triage.md
│   │   │   │   ├── Analiza-Testow-API-Assets.md
│   │   │   │   ├── Analiza-Testow-API-Assets.triage.md
│   │   │   │   ├── Analiza-Testow-MIDI-Host.md
│   │   │   │   ├── Analiza-Testow-MIDI-Host.triage.md
│   │   │   │   ├── Analiza-Testow-System-Routes.md
│   │   │   │   ├── Analiza-Testow-System-Routes.triage.md
│   │   │   │   ├── Analiza-Walidacji-Zod-Schema.md
│   │   │   │   ├── Analiza-Walidacji-Zod-Schema.triage.md
│   │   │   │   ├── Testowanie-Vitest-AudioPlayback.md
│   │   │   │   ├── Testowanie-Vitest-AudioPlayback.triage.md
│   │   │   │   ├── Testy-Desktop-File-Menu.md
│   │   │   │   ├── Testy-Desktop-File-Menu.triage.md
│   │   │   │   ├── Testy-UG-Fetch.md
│   │   │   │   ├── Testy-UG-Fetch.triage.md
│   │   │   │   ├── Testy-WebSocket-Server.md
│   │   │   │   └── Testy-WebSocket-Server.triage.md
│   │   │   ├── www/
│   │   │   │   ├── Audyt-i-propozycje-dla-StageSync.md
│   │   │   │   └── Audyt-i-propozycje-dla-StageSync.triage.md
│   │   │   └── README.md
│   │   ├── reports/
│   │   │   ├── README.md
│   │   │   ├── report-alpha8-code-freeze.md
│   │   │   ├── report-audit-2026-07-21.md
│   │   │   ├── report-beta-gate.md
│   │   │   ├── report-evening-hygiene-2026-07-24.md
│   │   │   ├── report-evening-hygiene-2026-07-25.md
│   │   │   ├── report-nightshift-hygiene-2026-07-24.md
│   │   │   ├── report-nightshift-hygiene-2026-07-26.md
│   │   │   ├── report-parity-blocker-alpha8.md
│   │   │   ├── report-po-smoke-p8.md
│   │   │   ├── report-project-summary-llm.md
│   │   │   ├── report-qa-signoff-alpha8.md
│   │   │   ├── report-scope-5.0.0.md
│   │   │   ├── report-scope-5.4.md
│   │   │   ├── report-scope-alpha3.md
│   │   │   ├── report-scope-alpha4.md
│   │   │   ├── report-scope-alpha5.md
│   │   │   ├── report-scope-alpha6.md
│   │   │   ├── report-scope-alpha7.md
│   │   │   ├── report-scope-alpha8.md
│   │   │   ├── report-scope-alpha9.md
│   │   │   ├── report-scope-beta1.md
│   │   │   ├── report-scope-beta2.md
│   │   │   ├── report-standalone-spike-beta1.md
│   │   │   ├── report-v4-v5-gap-audit.md
│   │   │   ├── report-v4-v5-parity-audit.md
│   │   │   └── report-v4-v5-ui-diff-inventory.md
│   │   ├── working/
│   │   │   ├── .gitignore
│   │   │   └── README.md
│   │   ├── product-contracts-5.2-impl-prompt.md
│   │   └── README.md
│   ├── api/
│   │   └── README.md
│   ├── examples/
│   │   ├── legacy/
│   │   │   ├── database.sample.json
│   │   │   └── database.typical.json
│   │   └── v5/
│   │       └── library.pack.sample.stagesync.json
│   ├── ui/
│   │   ├── badge.md
│   │   ├── button.md
│   │   ├── colors.md
│   │   ├── field.md
│   │   ├── README.md
│   │   ├── segmented.md
│   │   ├── spacing.md
│   │   └── typography.md
│   ├── ARCHITECTURE.md
│   ├── DESKTOP.md
│   ├── github-labels.md
│   ├── INSTALL.md
│   ├── MIGRATION.md
│   ├── MOBILE.md
│   ├── README.md
│   ├── REPO_MAP.md
│   ├── ROADMAP.md
│   ├── STANDARDS.md
│   ├── TODO.md
│   └── ui-shell-inventory.md
├── launch/
│   ├── android/
│   │   ├── README.md
│   │   └── sideload.keystore
│   ├── scripts/
│   │   ├── build-desktop-sidecar.mjs
│   │   ├── build-release-notes.mjs
│   │   ├── build-release-notes.test.mjs
│   │   ├── debug-bar-alignment.ts
│   │   ├── debug-winner-beats.ts
│   │   ├── extract-changelog-section.mjs
│   │   ├── extract-changelog-section.test.mjs
│   │   ├── extract-logic-features.ts
│   │   ├── generate-repo-map.mjs
│   │   ├── generate-smart-tempo-benchmark.ts
│   │   ├── inspect-logic-onsets.ts
│   │   ├── integrate-pr.sh
│   │   ├── lint-ss-css.mjs
│   │   ├── merge-train.sh
│   │   ├── optimize-logic-weights.ts
│   │   ├── record-benchmark.ts
│   │   ├── release-title.mjs
│   │   ├── run-merge-train.sh
│   │   ├── run-train-batch.sh
│   │   ├── sync-launcher-ui.mjs
│   │   ├── sync-sidecar-server.mjs
│   │   ├── sync-version.mjs
│   │   ├── test-real-downbeats.ts
│   │   └── tsconfig.json
│   └── README.md
├── packages/
│   ├── eslint-config/
│   │   ├── acl.js
│   │   ├── base.js
│   │   ├── package.json
│   │   ├── react-internal.js
│   │   └── README.md
│   ├── shared/
│   │   ├── src/
│   │   │   ├── fixtures/
│   │   │   │   └── us-ug/
│   │   │   │       ├── demo-simple/
│   │   │   │       │   ├── chords.txt
│   │   │   │       │   └── song.txt
│   │   │   │       ├── verse-chorus/
│   │   │   │       │   ├── chords.txt
│   │   │   │       │   └── song.txt
│   │   │   │       ├── winner-intro-vc/
│   │   │   │       │   ├── chords.txt
│   │   │   │       │   └── song.txt
│   │   │   │       └── with-solo/
│   │   │   │           ├── chords.txt
│   │   │   │           └── song.txt
│   │   │   ├── audio-clip.test.ts
│   │   │   ├── audio-clip.ts
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
│   │   │   ├── legacy-migrate.test.ts
│   │   │   ├── legacy-migrate.ts
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
├── .clineignore
├── .clinerules
├── .cursorignore
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
├── Dockerfile
├── knip.jsonc
├── LICENSE
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── README.md
└── turbo.json
```
