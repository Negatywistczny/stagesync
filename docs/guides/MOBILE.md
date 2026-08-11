# StageSync — Mobile (Performer + Console)

**Dla kogo:** instalacja i użytkowanie APK Android oraz PWA na telefonie / tablecie.  
Nazwy produktu: **Performer** / **Console** ([#674](https://github.com/Negatywistczny/stagesync/issues/674), [ADR 0016](../adr/0016-android-performer-console.md)).

**Aktualizacje:** dialog APK (Launcher / Admin / host) — nie Watchtower i nie updater Tauri. Desktop → [DESKTOP.md](./DESKTOP.md); host Docker → [INSTALL.md](./INSTALL.md).

## Performer vs Console

|                         | **StageSync Performer**                                   | **StageSync Console**                                                                       |
| ----------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Rola                    | Pasywny klient sceniczny (Grid / Karaoke / Score / Drums) | Pełnoprawny odpowiednik desktopu na Androidzie                                              |
| Po połączeniu           | WebView → `/client`                                       | WebView → `/admin` (pełne SPA: Admin + Timeline + Client)                                   |
| Lokalny host            | Brak (zawsze thin)                                        | **Uruchom lokalny host** startuje Node na urządzeniu (`127.0.0.1:4000`); LAN nadal dostępne |
| Audio / MIDI w procesie | Brak                                                      | SSOT na hoście (LAN albo lokalny, gdy silnik w APK działa)                                  |
| Katalog                 | `apps/performer`                                          | `apps/console`                                                                              |

Performer pozostaje read-only Client-only ([ADR 0016](../adr/0016-android-performer-console.md)).

## Nawigacja operatora (OperatorNav)

| Powierzchnia                         | Pasek L1 (Admin / Timeline / Klient)                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| **Console** (APK + przeglądarka LAN) | **Tak** — ≤640px OperatorNav; szerzej chipy; na `/client` zawsze   |
| **Performer**                        | **Nie** — tylko widok muzyka (`/client`)                           |
| **PWA / Safari `/client`** (muzyk)   | **Nie** (bez sesji operatora)                                      |
| **Web LAN** (po Admin/Timeline)      | **Tak** na `/client` — telefon: OperatorNav; tablet/desktop: chipy |
| **Desktop Tauri**                    | Pełny L1 + menu OS/HTML — [DESKTOP.md](./DESKTOP.md)               |

Skróty (gdy jest klawiatura): `Ctrl/⌘+1…3` (aplikacje), `Alt+1…4` (zakładki Admina).

## Instalacja

1. Zbuduj APK lokalnie albo pobierz z GitHub Releases / hosta.
2. Na Androidzie włącz „Instalacja z nieznanych źródeł” dla przeglądarki / menedżera plików.
3. Zainstaluj `StageSync-Performer-vX.Y.Z.apk` lub `StageSync-Console-vX.Y.Z.apk`.

Lokalny build (Android SDK + JDK 17; **najpierw** build web — Gradle kopiuje role-specific dist → `assets/www`):

```sh
# Performer → data/downloads/stagesync-performer.apk
./apps/performer/scripts/build-apk.sh

# Console (pełne SPA + lokalny host) → data/downloads/stagesync-console.apk
./apps/console/scripts/build-apk.sh
```

Wymagania Console z lokalnym hostem: Android SDK, **NDK 26.1+**, **CMake 3.22.1**, JDK 17+, sieć (pierwszy raz pobiera nodejs-mobile).  
`SKIP_LOCAL_HOST=1` — APK bez silnika (LAN-only).  
`SKIP_HOST_SERVER=1` — tylko `libnode`/JNI, bez `assets/host`.  
`SKIP_WEB_BUILD=1` — pomija Vite, gdy `dist-performer` / `dist-console` są aktualne.

**Rozmiar APK:** tylko ABI `arm64-v8a` + `armeabi-v7a`; release z R8 minify + shrinkResources; debug bez minify.

## QR: dołącz vs pobierz APK

W Admin → Host → **Połączenie & Sieć**:

| QR / link             | Cel                                                                                                               |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Dołącz do hosta**   | URL LAN (np. `http://192.168.x.x:4000`) — skan w launcherze Performer/Console (kamera + wklejenie) / przeglądarka |
| **Pobierz Performer** | `{origin}/downloads/stagesync-performer.apk`                                                                      |
| **Pobierz Console**   | `{origin}/downloads/stagesync-console.apk`                                                                        |

W launcherze Android (**Skanuj kod QR**): CameraX + ML Kit; przy braku kamery — wklejenie adresu.

**Wyszukane serwery w sieci:** tytuł kafelka = **nazwa hosta w sieci** (mDNS TXT); druga linia = `IP:port` · wersja · opcjonalnie projekt. Nazwę ustawiasz w Admin → Ustawienia serwera (**Nazwa hosta w sieci**).

Gdy APK nie ma na hoście — pusty stan w UI i **404** (bez martwego przycisku „Pobierz”). Operator **nie** musi ręcznie kopiować APK do Documents.

Host szuka APK (pierwszy niepusty plik wygrywa):

1. `STAGESYNC_DOWNLOADS_DIR`
2. `$STAGESYNC_DATA_DIR/downloads/`
3. bundel produktu — w repo `data/downloads/`, w desktopie `sidecar/downloads/` (albo `STAGESYNC_APK_BUNDLE_DIR`)

Skrypty `build-apk.sh` zapisują debug APK do `data/downloads/stagesync-*.apk`. Release signed — gdy CI / keystore.

APK z hosta i Releases podpisane stałym kluczem sideload ([`packages/android-keystore/sideload.keystore`](../../packages/android-keystore/sideload.keystore)); przy aktualizacji z innym kluczem odinstaluj poprzednią aplikację raz.

## Aktualizacja APK

1. **Launcher (internet):** przy starcie / `onResume` powłoka czyta `android-latest.json` z GitHub Releases. Nowszy `version` → dialog **Aktualizuj** / **Przypomnij później**. Bez auto-update w tle ([ADR 0015](../adr/0015-daw-reference-and-product-decisions.md)).
2. **Admin → Sprawdź aktualizacje (Console):** ten sam manifest → **Pobierz APK** (URL z Releases), nie Watchtower.
3. **Po połączeniu z hostem:** porównanie `versionName` z `GET /api/health`. Gdy host nowszy **i** APK leży pod `/downloads/stagesync-*.apk` — dialog z hosta; inaczej fallback do Releases.

**Allowlista URL:** host sesji `{origin}/downloads/…` albo HTTPS GitHub Releases StageSync (`github.com/Negatywistczny/stagesync/…` oraz CDN GitHub). Inne URL z manifestu są odrzucane. Przed instalacją: zgodność **package name** i **certyfikatu podpisu** z zainstalowaną aplikacją.

## Lokalny host na Console

W launcherze Console **Uruchom lokalny host** uruchamia wbudowany serwer StageSync na urządzeniu, czeka na `GET http://127.0.0.1:4000/api/health`, potem otwiera Admin — ten sam tor co desktop ([DESKTOP.md](./DESKTOP.md), [ADR 0014](../adr/0014-desktop-launcher.md)).

- Dane projektów: `filesDir/stagesync-data`.
- Silnik Node w **osobnym procesie** (`:host`); awaria nie zabija launchera.
- Trwałe powiadomienie foreground: **Otwórz aplikację** / **Zatrzymaj Host**; przy działającym hoście przycisk to **Połącz z localhostem**.
- Błędy startu: log + **Wyczyść** / **Pobierz logi** (eksport `stagesync-host-….txt`). Logcat: `SsLocalHost`.
- Native MIDI niedostępne (`STAGESYNC_MIDI_BACKEND=none`); host reklamuje `_stagesync._tcp` przez Android NSD.
- Nasłuch: `0.0.0.0:4000` (Admin na `127.0.0.1:4000`).

Gdy silnik nie jest w APK (`SKIP_LOCAL_HOST=1` lub uszkodzony build) — uczciwy komunikat fail-open. **Performer** nigdy nie bundluje lokalnego hosta.

**Android 15+ / strona 16 KB:** domyślny `prepare-local-host` używa przebudowy digidem z wyrównaniem 16 KB. Nadpisanie: `NODEJS_MOBILE_ZIP_URL=…`; eksperyment 4 KB: `ALLOW_INCOMPATIBLE_LIBNODE=1`.

Używaj APK z aktualnego [Release](https://github.com/Negatywistczny/stagesync/releases) albo świeżego `build-apk.sh` (wersja zgodna z root [`package.json`](../../package.json)).

## PWA

`apps/web` wystawia manifest (`display: standalone`) + Service Worker. Na telefonie: Chrome → „Dodaj do ekranu głównego”; Safari (iOS) → Udostępnij → „Do ekranu początkowego”.

**iOS:** brak natywnego APK / App Store — jedyna ścieżka to **Safari / PWA `/client`** ([#809](https://github.com/Negatywistczny/stagesync/issues/809)). Natywne Performer/Console = **tylko Android**.

Wake Lock w przeglądarce (+ fallback) oraz `FLAG_KEEP_SCREEN_ON` w APK. Po uśpieniu Safari Client wznawia WebSocket po powrocie do karty.

## Operator (PIN, motyw, Safety Net, Sampler)

Kontrakty hosta: [INSTALL.md](./INSTALL.md) · [ADR 0017](../adr/0017-live-show-control-contracts.md).

- **PIN:** Console (Admin/Timeline) jak desktop; Performer — odblokowanie edycji notatek w ustawieniach Client.
- **Motyw:** lokalna preferencja albo `STAGESYNC_THEME_DEFAULT` z hosta.
- **Safety Net / Panic:** rola Master/Spare i MIDI OUT na hoście; globalny Panic tylko na **Console/Admin** (hold ~1 s). Performer bez globalnego Panic.
- **Zastosuj UI:** przy `PLAYING` — Performer: twardy block; Console: ostrzeżenie + potwierdzenie.
- **Cues Sampler:** Timeline na Console / desktop; Performer tylko banery Cue.

## Offline-First UI (skrót)

1. Cold start: APK ma `assets/www` (role-specific dist); WebView ładuje `/client` lub `/admin`; `/api`, `/ws`, `/downloads` zawsze na host.
2. Mismatch `protocolVersion` → **Remote Mode** (UI z hosta), bez kasowania lokalnego bufora.
3. Hash roli: `uiHashPerformer` / `uiHashConsole` — powłoka porównuje tylko swój hash.
4. **Zastosuj:** pobranie `ui-bundle-*.zip` → `ui-cache` → reload. Bez cichej instalacji APK.

Szczegóły protokołu: [ADR 0016](../adr/0016-android-performer-console.md).

## Powiadomienia systemowe

- Lokalne alerty sceniczne (np. utrata hosta): Ustawienia klienta / Admin → Ogólne → Powiadomienia. Kanały Android osobne od FG lokalnego hosta Console.
- Token: `POST /api/push/tokens`. WebPush: opcjonalne VAPID w [`.env.example`](../../.env.example). FCM: opcjonalny `google-services.json` (nie w gicie).

## Zakazy

- Auto-update w tle; sekrety w APK.
- Natywny Performer / Console na iOS — iOS = PWA `/client`.
- Audio / MIDI clock / edycja Timeline / Mixer / Admin / lokalny host w **Performer**.
- Przycisk „Pobierz APK” bez pliku na hoście; cicha instalacja APK; cichy sync UI mid-set.
- Sukces lokalnego hosta bez realnego `/api/health` na pętli zwrotnej.

---

## Aneks — Dev / QA

### Dev Layout Matrix (tylko DEV)

Przy `pnpm dev`: `http://localhost:3000/_dev/layouts` — siatka iframe (telefon / tablet / desktop) z symulacją powierzchni. Niedostępne w buildzie produkcyjnym.

### Testy JVM

```sh
pnpm --filter @stagesync/performer test
pnpm --filter @stagesync/console test
```

Bez SDK skrypt wychodzi 0 (skip).

### Smoke — aktualizacja APK

1. Starsza powłoka (niższy `versionName`) + host z nowszym `version` i APK w bundlu.
2. Połącz → dialog → **Aktualizuj** → instalator systemowy.
3. **Przypomnij później** nie uruchamia pobierania.

### Smoke — UI apply

1. APK z bundled www (hash A roli) + host z nowszym dist (hash B) i `STAGESYNC_STATIC_DIR`.
2. Połącz → **Zastosuj** → UI z cache; **Później** zostaje na A.
3. Mismatch protokołu → Remote Mode, bufor lokalny nietknięty.

### Smoke HW

| ID    | Kryterium                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------- |
| P-HW1 | Playhead stabilny przy latency sieci do ~150 ms                                                                |
| P-HW2 | Ekran bez uśpienia ≥ 4 h w widoku roli                                                                         |
| P-HW3 | Re-connect poniżej ~1,5 s po odzyskaniu Wi‑Fi                                                                  |
| P-HW4 | Zmiana stroju/transpozycji widoczna poniżej ~200 ms (Grid/Score)                                               |
| C-HW1 | Launcher → health → `/admin` na tablecie LAN                                                                   |
| C-HW2 | Admin / Timeline / Client używalne na tablecie (pełne SPA)                                                     |
| C-HW3 | „Uruchom lokalny host” → `/api/health` na `127.0.0.1:4000` → Admin; przy uszkodzonym buildzie — uczciwy status |
| C-HW4 | Telefon (≤768): Timeline = podgląd / transport; Admin czytelny                                                 |

### H-01 (perf Client) — sonda

Opt-in: `?ss_perf=h01` albo `localStorage.setItem('stagesync_perf_h01','1')` → Play → po ≥2 s `window.__stagesyncH01.refresh()` (`rafHz`, `commitHz`, `renderHz`).

### Powiązane

- [DESKTOP.md](./DESKTOP.md) · [INSTALL.md](./INSTALL.md) · [ADR 0014](../adr/0014-desktop-launcher.md) · [ADR 0015](../adr/0015-daw-reference-and-product-decisions.md) · [ADR 0016](../adr/0016-android-performer-console.md)
