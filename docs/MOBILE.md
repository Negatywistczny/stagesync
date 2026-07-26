# StageSync — Mobile (Performer + Console)

Operator sketch for Android sideload and PWA (**v5.2** Pocket Stage). Product names: **Performer** / **Console** ([#674](https://github.com/Negatywistczny/stagesync/issues/674), [ADR 0016](./adr/0016-android-performer-console.md)).

## Performer vs Console

| | **StageSync Performer** | **StageSync Console** |
|---|-------------------------|------------------------|
| Rola | Pasywny klient sceniczny (Grid / Karaoke / Score / Drums) | Pełnoprawny odpowiednik desktopu na Androidzie |
| Po połączeniu | WebView → `/client` | WebView → `/admin` (pełne SPA: Admin + Timeline + Client) |
| Lokalny host | **Zakaz** (zawsze thin) | **Uruchom lokalny host** startuje Node na urządzeniu (`127.0.0.1:4000`); LAN nadal dostępne |
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
# artefakt: data/downloads/stagesync-performer.apk

# Console (dist-console = pełne SPA + lokalny host: libnode + server assets)
./apps/console/scripts/build-apk.sh
# artefakt: data/downloads/stagesync-console.apk
```

Wymagania Console z lokalnym hostem: Android SDK, **NDK 26.1+**, **CMake 3.22.1**, JDK 17+, sieć (pierwszy raz pobiera nodejs-mobile).  
`SKIP_LOCAL_HOST=1` — APK bez silnika (LAN-only; przycisk fail-open).  
`SKIP_HOST_SERVER=1` — tylko `libnode`/JNI, bez `assets/host`.  
`SKIP_WEB_BUILD=1` pomija Vite, gdy `dist-performer` / `dist-console` są aktualne.

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

W Admin → Host → **Połączenie & Sieć** (lewa kolumna u góry; kafelki Performer / Console obok siebie pod QR i adresami LAN / mDNS):

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

**Console local host — który APK zainstalować:** pakiet `com.stagesync.console.debug`, `versionName` zgodny z monorepo (obecnie 5.2.4), **`versionCode` ≥ 50213** (gdy host już działa — **Połącz z localhostem**; powiadomienie FG z **Otwórz aplikację** / **Zamknij host**; po `health-ok` launcher otwiera Admin mimo osobnego procesu `:host`; host pack bez Unicode property escapes w `path-to-regexp`; błąd startu z **Wyczyść** / ikoną **Pobierz logi** w nagłówku oraz **Pobierz logi diagnostyczne** pod banerem; `libnode` digidem 16 KB; Admin mobile: akordeon Host + stały górny pasek). Sprawdź w Ustawieniach Androida → Aplikacje → StageSync Console → zaawansowane / informacje o aplikacji. Starszy `versionCode` 50204 pada na imporcie Express (`\p{ID_Start}`); 50206 ma ICU-safe pack + log UI, ale może zostać na „Uruchamianie…” mimo gotowego hosta; 50207–50208 mają status READY / akcje w powiadomieniu, ale ponowne otwarcie launchera przy działającym hoście nadal oferowało „Uruchom” i mogło zawisnąć na starcie; 50209–50212 mają Connect/NSD / wcześniejsze buildy UI Admin mobile — użyj ≥50213 z cutu 5.2.4. APK z hosta i z Releases podpisane stałym kluczem sideload (`launch/android/sideload.keystore`); przy aktualizacji z paczki podpisanym innym kluczem (stare Releases CI) odinstaluj poprzednią aplikację raz.

Lokalny host zapisuje stderr/stdout Node do `filesDir/local-host-node.log` oraz fazę startu do `local-host-phase.txt` — po padnięciu `:host` launcher dokleja ostatnie linie do komunikatu błędu (tag logcat: `SsLocalHost`).

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
| C-HW3 | „Uruchom lokalny host” → `/api/health` na `127.0.0.1:4000` → Admin; przy uszkodzonym buildzie — uczciwy status |
| C-HW4 | Telefon (≤768): Timeline = podgląd / transport (bez Inspectora i chrome edycji); Admin czytelny |

## Lokalny host na Console

W launcherze Console **Uruchom lokalny host** uruchamia wbudowany serwer StageSync na urządzeniu (nodejs-mobile + JNI), czeka na `GET http://127.0.0.1:4000/api/health`, potem otwiera Admin — ten sam tor co desktop ([DESKTOP.md](./DESKTOP.md), [ADR 0014](./adr/0014-desktop-launcher.md)).

Domyślny `./apps/console/scripts/build-apk.sh` pakuje `libnode.so` (arm64-v8a + armeabi-v7a), most `stagesync-host-bridge` oraz `assets/host` (server jak sidecar desktop + web + seed). Dane projektów: katalog aplikacji (`filesDir/stagesync-data`). Silnik Node działa w **osobnym procesie** (`:host`) i wątku z 8 MB sterty — awaria natywna nie zabija launchera; status błędu / śmierci procesu trafia po polsku (logcat: tag `SsLocalHost`). Podczas działania utrzymuje się powiadomienie foreground z **Otwórz aplikację** i **Zamknij host** (dotknięcie treści też wraca do Console); po powrocie do launchera przy działającym hoście przycisk to **Połącz z localhostem**. Native MIDI na Androidzie jest niedostępne (serwer startuje z `STAGESYNC_MIDI_BACKEND=none`); lokalny host **reklamuje** `_stagesync._tcp` przez Android NSD (`NsdManager` + multicast lock) — Node `bonjour` pozostaje wyłączony pod nodejs-mobile. Inne urządzenia (Performer / Console / desktop launcher) wykrywają ten host w LAN jak desktopowy. Host nasłuchuje na `0.0.0.0:4000` (Admin na pętli zwrotnej `127.0.0.1:4000`).

**Ograniczenie historyczne (Android 15+ / 16 KB page size):** oficjalny zip `nodejs-mobile/nodejs-mobile` `v18.20.4` ma `PT_LOAD` wyrównane do 4 KB i na urządzeniach z stroną 16 KB kończy proces `:host` przy `dlopen`. **Domyślny** `prepare-local-host` pobiera przebudowę digidem z wyrównaniem 16 KB (`nodejs-mobile#154`). Nadpisanie: `NODEJS_MOBILE_ZIP_URL=…`; wymuszenie 4 KB (tylko eksperyment): `ALLOW_INCOMPATIBLE_LIBNODE=1`. Skrypt **odmawia** paczki z align &lt; 16384 bez tej flagi. Na urządzeniu logcat `SsLocalHost` wypisuje `pageSize` + `libnodePtLoadAlign`; przy mismatch UI pokazuje konkretny komunikat zamiast ogólnego „awaria silnika”.

Gdy silnik nie jest w APK (`SKIP_LOCAL_HOST=1` albo uszkodzony build), UI pokazuje uczciwy komunikat (fail-open), nie fałszywy sukces. **Performer** nigdy nie bundluje lokalnego hosta.

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
