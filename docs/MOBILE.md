# StageSync — Mobile (Performer + Console)

Operator sketch for Android sideload and PWA (**v5.2** Pocket Stage). Product names: **Performer** / **Console** ([#674](https://github.com/Negatywistczny/stagesync/issues/674), [ADR 0016](./adr/0016-android-performer-console.md)).

## Performer vs Console

| | **StageSync Performer** | **StageSync Console** |
|---|-------------------------|------------------------|
| Rola | Pasywny klient sceniczny (Grid / Karaoke / Score / Drums) | Pełnoprawny odpowiednik desktopu na Androidzie |
| Po połączeniu | WebView → `/client` | WebView → `/admin` (pełne SPA: Admin + Timeline + Client) |
| Lokalny host | **Zakaz** (zawsze thin) | Przycisk **Uruchom lokalny host** — przy braku silnika w APK: uczciwy komunikat; typowo host LAN |
| Audio / MIDI w procesie | **Zakaz** | SSOT na hoście (LAN albo lokalny, gdy silnik w APK działa) |
| Katalog | `apps/performer` | `apps/console` |

Performer pozostaje read-only Client-only ([ADR 0016](./adr/0016-android-performer-console.md)).

## Instalacja (sideload, bez Google Play)

1. Zbuduj APK lokalnie albo pobierz z GitHub Releases / hosta.
2. Na Androidzie włącz „Instalacja z nieznanych źródeł” dla przeglądarki / menedżera plików.
3. Zainstaluj `StageSync-Performer-vX.Y.Z.apk` lub `StageSync-Console-vX.Y.Z.apk`.

Lokalny build (wymaga Android SDK + JDK 17; **najpierw** build web — Gradle kopiuje role-specific dist → `assets/www`):

```sh
# Performer (buduje @stagesync/web, potem APK z dist-performer = Client-only)
./apps/performer/scripts/build-apk.sh
# artefakt: apps/performer/android/app/build/outputs/apk/debug/app-debug.apk

# Console (dist-console = pełne SPA jak desktop)
./apps/console/scripts/build-apk.sh
```

`SKIP_WEB_BUILD=1` pomija Vite, gdy `apps/web/dist-performer` / `dist-console` są już aktualne. CI musi mieć Node build przed `assemble*`.

JVM unit tests (bez urządzenia; wymaga `ANDROID_HOME` / Homebrew `android-commandlinetools`):

```sh
pnpm --filter @stagesync/performer test
pnpm --filter @stagesync/console test
```

Bez SDK skrypt wychodzi 0 (skip) — CI Node bez Androida nie pada.

### Rozmiar APK (ABI + R8)

- **ABI:** tylko `arm64-v8a` + `armeabi-v7a` (bez x86/x86_64) — sideload tablety ARM.
- **Release:** R8 minify + shrinkResources włączone; **debug** bez minify (lokalny sideload).
- `ndk.abiFilters` obowiązuje też debug, więc `data/downloads/*.apk` od razu bez ABI emulatorych.

## QR: dołącz vs pobierz APK

W Admin → Host → **Sieć & Szybkie Połączenie**:

| QR / link | Cel |
|-----------|-----|
| **Dołącz do hosta** | URL LAN (np. `http://192.168.x.x:4000`) — live skan w launcherze Performer/Console (kamera + wklejenie) / przeglądarka |
| **Pobierz Performer** | `{origin}/downloads/stagesync-performer.apk` |
| **Pobierz Console** | `{origin}/downloads/stagesync-console.apk` |

W launcherze Android (**Skanuj kod QR**): żywy podgląd CameraX + ML Kit odczytuje kod „Dołącz”; przy braku kamery / uprawnień — wklejenie adresu.

Gdy plik APK **nie jest częścią instalacji** (brak w bundlu desktop / `data/downloads`), UI pokazuje **pusty stan** (komunikat). Endpoint zwraca **404** z jasnym tekstem. Operator **nie** musi ręcznie kopiować APK do katalogu Documents.

Host szuka APK automatycznie (pierwszy istniejący, niepusty plik wygrywa):

1. `STAGESYNC_DOWNLOADS_DIR` (nadpisanie)
2. `$STAGESYNC_DATA_DIR/downloads/`
3. bundel produktu obok seeda — w repo `data/downloads/`, w desktopie `sidecar/downloads/` (albo `STAGESYNC_APK_BUNDLE_DIR`)

Desktop (Tauri): lokalny host trzyma projekty w `~/Documents/StageSync`, a APK serwuje z bundla / monorepo `data/downloads` — bez ręcznego `cp` do Documents. Skrypty `apps/*/scripts/build-apk.sh` zapisują debug APK od razu do `data/downloads/stagesync-*.apk`.

W repo (sideload MVP) leżą debug APK: `data/downloads/stagesync-performer.apk` oraz `stagesync-console.apk` (build `assembleDebug` / `scripts/build-apk.sh`). Release signed — gdy CI / keystore.

## Aktualizacja APK w aplikacji (jawna)

Po połączeniu z hostem powłoka porównuje własny `versionName` z `version` z `GET /api/health`. Gdy host jest **nowszy** (SemVer) **oraz** `HEAD`/`GET` `{origin}/downloads/stagesync-performer.apk` (Performer) albo `…-console.apk` (Console) zwraca 200, pojawia się dialog:

- **Pobierz i zainstaluj** — pobranie APK z hosta i systemowy instalator (FileProvider; na Android 8+ może wymagać „Instaluj nieznane aplikacje”).
- **Później** — zamknięcie dialogu; sesja WebView trwa bez zmian.

**Bez** auto-update w tle ([ADR 0015](./adr/0015-daw-reference-and-product-decisions.md), [ADR 0016](./adr/0016-android-performer-console.md)).

## Offline-First UI hybrid (#692)

Model lokalny + synchronizacja UI **bez** cichej instalacji APK:

1. **Cold start:** APK zawiera `assets/www` z **role-specific** Vite dist (`dist-performer` = Client-only; `dist-console` = **pełne SPA**). WebView ładuje `{origin}/client` lub `/admin`, a statyczne pliki serwuje `WebViewAssetLoader` z lokalnego drzewa (cache `filesDir/ui-cache` ma pierwszeństwo przed bundled www). `/api`, `/ws`, `/downloads` zawsze idą na host.
2. **Protokół:** `GET /api/health` → `protocolVersion`. Mismatch z powłoką → **Remote Mode** (UI z hosta), **bez** kasowania lokalnego bufora.
3. **Hash UI (rola):** health niesie `uiHash` (pełne SPA hosta) oraz opcjonalnie `uiHashPerformer` / `uiHashConsole`. Powłoka porównuje **tylko** swój hash roli — nigdy pełnego `uiHash` (żeby „Zastosuj” nie wlało pełnego SPA do Performera). `uiHashConsole` odpowiada bundlowi Console (pełne SPA).
4. **Zastosuj:** pobranie `GET /downloads/ui-bundle-performer.zip` albo `…-console.zip`, rozpakowanie do `ui-cache`, przeładowanie z lokalnego drzewa. Manifest: `GET /api/ui-manifest?role=performer|console` (bez `role` = pełne SPA hosta). Legacy `GET /downloads/ui-bundle.zip` = pełny dist (PWA / host).
5. **PWA SW:** klucz cache oparty o `uiHash` pełnego buildu; nadal **nie** cache’uje `/api`, `/ws`, `/downloads`.

## Operator: PIN, motyw, Safety Net, Sampler

- **PIN:** gdy host ma `STAGESYNC_OPERATOR_PIN`, Console (Admin/Timeline) prosi o odblokowanie przed edycją; Performer może odblokować edycję notatek w ustawieniach Client.
- **Motyw:** lokalna preferencja urządzenia albo `STAGESYNC_THEME_DEFAULT` z hosta (gdy urządzenie nie ma zapisanego motywu).
- **Safety Net:** rola Master/Spare na hoście — dotyczy MIDI OUT hosta, nie APK; Console na Spare pokazuje **Przejmij** jak desktop Admin.
- **Cues Sampler:** próbki na klipach Cue działają w Timeline (Console / desktop); Performer tylko wyświetla banery Cue.

### Smoke (ręczne) — UI apply

1. Zainstaluj APK z bundled www (hash A roli).
2. Uruchom host z nowszym web dist (hash B roli) i `STAGESYNC_STATIC_DIR` wskazującym na pełny `dist` (z `ui-bundle-*.zip` po `aggregate-role-ui`).
3. Połącz → dialog „Zastosuj nowy interfejs” → **Zastosuj** → UI z cache; **Później** zostaje na lokalnym A.
4. Symulacja mismatch protokołu (inny `PROTOCOL_VERSION` w powłoce) → toast Remote Mode, bufor lokalny nietknięty.

### Smoke (ręczne)

1. Zainstaluj starszą powłokę (niższy `versionName`) albo tymczasowo obniż `versionName` w buildzie.
2. Uruchom host z nowszym `version` i APK w bundlu (`data/downloads/` / sidecar).
3. Połącz launcherem → WebView → dialog z wersjami → **Pobierz i zainstaluj** → instalator systemowy.
4. **Później** nie uruchamia pobierania.

## PWA

`apps/web` wystawia manifest + Service Worker (warstwa A). Na telefonie: Chrome → „Dodaj do ekranu głównego”. Wake Lock API w przeglądarce + `FLAG_KEEP_SCREEN_ON` w APK (dual wake-lock).

## H-01 (perf Client) — sonda

Opt-in sonda w Client (PWA / Performer WebView):

1. Otwórz z `?ss_perf=h01` **albo** w konsoli: `localStorage.setItem('stagesync_perf_h01','1')` i przeładuj.
2. Wybierz rolę Grid lub Karaoke, uruchom Play na hoście.
3. Po ≥2 s w konsoli / remote debugging: `window.__stagesyncH01.refresh()` — odczytaj `rafHz`, `commitHz`, `renderHz`.

Wyłączenie: usuń query / `localStorage.removeItem('stagesync_perf_h01')` i przeładuj.

## Smoke HW (Performer / Console)

Kryteria **Performer**:

| ID | Kryterium |
|----|-----------|
| P-HW1 | Playhead stabilny przy latency sieci do ~150 ms |
| P-HW2 | Ekran bez uśpienia ≥ 4 h w widoku roli |
| P-HW3 | Re-connect poniżej ~1,5 s po odzyskaniu Wi‑Fi |
| P-HW4 | Zmiana stroju/transpozycji widoczna poniżej ~200 ms (Grid/Score) |

Kryteria **Console** (nie mylić z pasywnym Performerem):

| ID | Kryterium |
|----|-----------|
| C-HW1 | Launcher → health → `/admin` na tablecie LAN |
| C-HW2 | Admin / Timeline / Client czytelne i używalne na tablecie (pełne SPA) |
| C-HW3 | „Uruchom lokalny host” widoczny; sukces albo uczciwy status przy braku silnika |

## Lokalny host na Console

W launcherze Console przycisk **Uruchom lokalny host** jest widoczny. Typowa praca: połączenie z hostem LAN. Gdy silnik nie jest spakowany w APK, UI pokazuje uczciwy komunikat (fail-open), nie fałszywy sukces.

## Zakazy

- Google Play; Capacitor/Cordova-as-magic; auto-update w tle.
- Sekrety / tokeny wbudowane w APK.
- Audio / MIDI clock / synteza w procesie **Performer**.
- Edycja Timeline / Mixer z **Performer**.
- Performer jako Admin / lokalny host.
- Przycisk „Pobierz APK”, gdy pliku nie ma na hoście (pusty stan / 404 zamiast tego).
- Ciche pobieranie / instalacja APK bez potwierdzenia operatora.
- Cichy sync UI mid-set (bez dialogu „Zastosuj nowy interfejs”).
- Komunikat sukcesu lokalnego hosta bez realnego `/api/health` na pętli zwrotnej.

## Powiązane

- [DESKTOP.md](./DESKTOP.md) · [ADR 0014](./adr/0014-desktop-launcher.md) · [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md) · [ADR 0016](./adr/0016-android-performer-console.md)
