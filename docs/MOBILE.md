# StageSync — Mobile (Performer + Console)

Operator sketch for Android sideload and PWA (**v5.3.0** Pocket Stage). Product names: **Performer** / **Console** ([#674](https://github.com/Negatywistczny/stagesync/issues/674), [ADR 0016](./adr/0016-android-performer-console.md)).

## Performer vs Console

| | **StageSync Performer** | **StageSync Console** |
|---|-------------------------|------------------------|
| Rola | Pasywny klient sceniczny (Grid / Karaoke / Score / Drums) | Pełnoprawny odpowiednik desktopu na Androidzie |
| Po połączeniu | WebView → `/client` | WebView → `/admin` (pełne SPA: Admin + Timeline + Client) |
| Lokalny host | **Zakaz** (zawsze thin) | **Produkt IN** — eng fazowany (Faza 4); interim = LAN |
| Audio / MIDI w procesie | **Zakaz** | SSOT na lokalnym hoście (gdy działa) albo host LAN |
| Katalog | `apps/performer` | `apps/console` |

Thin-shell-only jako cel produktu jest **superseded** ([ADR 0015](./adr/0015-daw-reference-and-product-decisions.md), [ADR 0016](./adr/0016-android-performer-console.md)). Performer pozostaje read-only Client-only.

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
- **Faza 4:** opcjonalne `libnode.so` (nodejs-mobile) powiększa APK o ~50 MB+ na ABI — nie bundlowane domyślnie; patrz poniżej.

## QR: dołącz vs pobierz APK

W Admin → Host → **Sieć & Szybkie Połączenie**:

| QR / link | Cel |
|-----------|-----|
| **Dołącz do hosta** | URL LAN (np. `http://192.168.x.x:4000`) — live skan w launcherze Performer/Console (kamera + wklejenie) / przeglądarka |
| **Pobierz Performer** | `{origin}/downloads/stagesync-performer.apk` |
| **Pobierz Console** | `{origin}/downloads/stagesync-console.apk` |

W launcherze Android (**Skanuj kod QR**): żywy podgląd CameraX + ML Kit odczytuje kod „Dołącz”; przy braku kamery / uprawnień zostaje wklejenie adresu (bez atrapy podglądu).

Gdy plik APK **nie leży** w katalogu downloads hosta, UI pokazuje **pusty stan** (komunikat), nie atrapę „Pobierz” ([ADR 0011](./adr/0011-ui-parity-behavior.md)). Endpoint zwraca **404** z jasnym tekstem.

Domyślna lokalizacja plików na hoście: `$STAGESYNC_DATA_DIR/downloads/` (nadpisanie: `STAGESYNC_DOWNLOADS_DIR`).

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

**Follow-up:** różnicowy delta / CacheStorage per-asset; binary zstd.

## Operator: PIN, motyw, Safety Net, Sampler

- **PIN:** gdy host ma `STAGESYNC_OPERATOR_PIN`, Console (Admin/Timeline) prosi o odblokowanie przed edycją; Performer może odblokować edycję notatek w ustawieniach Client.
- **Motyw sceniczny:** Admin → Scena → blokada motywu wymusza jasny / wysoki kontrast na Clientach (lokalne przełączniki wyłączone). Bez blokady: lokalna preferencja albo `STAGESYNC_THEME_DEFAULT` z hosta (gdy urządzenie nie ma zapisanego motywu).
- **Safety Net:** rola Master/Spare na hoście — dotyczy MIDI OUT hosta, nie APK; Console na Spare pokazuje **Przejmij** jak desktop Admin.
- **Cues Sampler:** próbki na klipach Cue działają w Timeline (Console / desktop); Performer tylko wyświetla banery Cue.

### Smoke (ręczne) — UI apply

1. Zainstaluj APK z bundled www (hash A roli).
2. Uruchom host z nowszym web dist (hash B roli) i `STAGESYNC_STATIC_DIR` wskazującym na pełny `dist` (z `ui-bundle-*.zip` po `aggregate-role-ui`).
3. Połącz → dialog „Zastosuj nowy interfejs” → **Zastosuj** → UI z cache; **Później** zostaje na lokalnym A.
4. Symulacja mismatch protokołu (inny `PROTOCOL_VERSION` w powłoce) → toast Remote Mode, bufor lokalny nietknięty.

### Smoke (ręczne)

1. Zainstaluj starszą powłokę (niższy `versionName`) albo tymczasowo obniż `versionName` w buildzie.
2. Uruchom host z nowszym `version` i APK w `data/downloads/`.
3. Połącz launcherem → WebView → dialog z wersjami → **Pobierz i zainstaluj** → instalator systemowy.
4. **Później** nie uruchamia pobierania.

## PWA

`apps/web` wystawia manifest + Service Worker (warstwa A). Na telefonie: Chrome → „Dodaj do ekranu głównego”. Wake Lock API w przeglądarce + `FLAG_KEEP_SCREEN_ON` w APK (dual wake-lock).

## H-01 (perf Client) — observe first

**Nie** robić dużego rewrite `TransportProvider` (split context / throttle) bez profilu na tablecie.

### Stan na drzewie

1. Otwarte: [TODO](./TODO.md) pozycja **Client transport — H-01**.
2. Vitest: `TransportProvider` — każdy rAF z **nowymi** tickami → re-render konsumentów `useTransport`; ten sam integer tick → **bez** re-renderu (equality bail w `commitDisplayTicks`).
3. Opt-in sonda: `apps/web/src/transport/h01PerfProbe.ts` (bez wpływu gdy wyłączona).

### Jak profilować (tablet / Chrome)

1. Otwórz Client (PWA lub Performer WebView) z `?ss_perf=h01` **albo** w konsoli: `localStorage.setItem('stagesync_perf_h01','1')` i przeładuj.
2. Wybierz rolę Grid lub Karaoke, uruchom Play na hoście.
3. Po ≥2 s w konsoli / remote debugging: `window.__stagesyncH01.refresh()` — odczytaj `rafHz`, `commitHz`, `renderHz` (ClientShell).
4. Równolegle: Chrome Performance + React Profiler (highlight updates) @ 90–120 Hz — koszt commitów przy `setDisplayTicks`.
5. **Dopiero potem:** split context / throttle `displayTicks`; OSMD = cursor transform only (zakaz full `osmd.render()` co klatkę).
6. Follow-up po profilu: `prefers-reduced-motion`; opcjonalnie thermal → cap ~30 FPS interpolacji.

Wyłączenie: usuń query / `localStorage.removeItem('stagesync_perf_h01')` i przeładuj.

## Macierz akceptacji HW (bez claim green)

Kryteria **Performer** (dump MOB / plan):

| ID | Kryterium | Dowód |
|----|-----------|-------|
| P-HW1 | Playhead stabilny przy latency sieci do ~150 ms | — |
| P-HW2 | Ekran bez uśpienia ≥ 4 h w widoku roli | — |
| P-HW3 | Re-connect poniżej ~1,5 s po odzyskaniu Wi‑Fi | — |
| P-HW4 | Zmiana stroju/transpozycji widoczna poniżej ~200 ms (Grid/Score) | — |

Kryteria **Console** (osobna macierz — nie mylić z pasywnym Performerem):

| ID | Kryterium | Dowód |
|----|-----------|-------|
| C-HW1 | Launcher → health → `/admin` na tablecie LAN | — |
| C-HW2 | Admin / Timeline / Client czytelne i używalne na tablecie (pełne SPA) | — |
| C-HW3 | „Uruchom lokalny host” widoczny; sukces albo uczciwy status (bez atrapy) | — |

**Bez claim green** bez dowodu z hardware ([todo-hygiene](../.cursor/rules/todo-hygiene.mdc)).

## Faza 4 — lokalny host na Console

**Decyzja produktowa:** lokalny host na Console = **IN** (pełny parytet desktopu). Thin-shell LAN pozostaje ścieżką interim.

| | Teraz (interim + scaffold) | Docelowo |
|---|-------------|------------------|
| Shell | Kotlin WebView + pełne SPA | + lokalny proces hosta (SSOT) |
| „Uruchom lokalny host” | **Widoczny** — start foreground service; bez pełnego silnika → uczciwy komunikat | Bind `127.0.0.1:4000`, health → WebView `/admin` |
| Silnik | Scaffold: `LocalHostService` + skrypt `prepare-local-host` (nodejs-mobile `libnode.so` + paczka serwera) | JNI bridge (`node::Start`) + bundled `apps/server` jak desktop sidecar |
| SSOT czasu / MIDI | Zdalny host LAN (gdy lokalny niedostępny) | Lokalny host na urządzeniu **albo** nadal LAN |

### Eng — następne kroki (nie claim Done)

1. **NDK + JNI:** most C++ do `libnode.so` (nodejs-mobile v18.x) — wzorzec JaneaSystems `native-gradle`; `System.loadLibrary("node")` + `startNodeWithArguments`.
2. **Paczka serwera:** podzbiór desktop sidecar (`launch/scripts/build-desktop-sidecar.mjs`) → `assets/host/server` (dist + pruned `node_modules`); data dir w `filesDir/stagesync-data`.
3. **Skrypt:** `./apps/console/scripts/prepare-local-host.mjs` pobiera `nodejs-mobile-*-android.zip` → `jniLibs/{arm64-v8a,armeabi-v7a}/libnode.so` (gitignored) i opcjonalnie pakuje serwer.
4. **Foreground service** + kanał powiadomień — już scaffold w APK; po starcie Node: probe `http://127.0.0.1:4000/api/health` → `HostWebActivity`.
5. **Bez Termux** — tylko bundled native + assets w APK.

Desktop porównanie: Tauri `externalBin` `stagesync-host` = oficjalny Node dla macOS/Windows; na Androidzie oficjalne Node dist **nie** istnieje → nodejs-mobile (shared lib), nie `ProcessBuilder` na ELF z nodejs.org.

W launcherze Console przycisk jest **widoczny i aktywny**. Brak spakowanego silnika = komunikat fail-open (nie „sukces”) ([ADR 0011](./adr/0011-ui-parity-behavior.md)).

## Zakazy

- Google Play; Capacitor/Cordova-as-magic; auto-update w tle.
- Sekrety / tokeny wbudowane w APK.
- Audio / MIDI clock / synteza w procesie **Performer**.
- Edycja Timeline / Mixer z **Performer**.
- Performer jako Admin / lokalny host.
- Stub UI „pobierz APK” bez pliku na hoście.
- Ciche pobieranie / instalacja APK bez potwierdzenia operatora.
- Cichy sync UI mid-set (bez dialogu „Zastosuj nowy interfejs”).
- Atrapa „lokalny host uruchomiony” bez realnego `/api/health` na pętli zwrotnej.

## Powiązane

- [DESKTOP.md](./DESKTOP.md) · [ADR 0014](./adr/0014-desktop-launcher.md) · [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md) · [ADR 0016](./adr/0016-android-performer-console.md)
