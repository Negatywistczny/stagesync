# StageSync — Mobile (Performer + Console)

Operator sketch for Android sideload and PWA. Product names: **Performer** / **Console** ([#674](https://github.com/Negatywistyczny/stagesync/issues/674), [ADR 0016](./adr/0016-android-performer-console.md)).

## Performer vs Console

| | **StageSync Performer** | **StageSync Console** |
|---|-------------------------|------------------------|
| Rola | Pasywny klient sceniczny (Grid / Karaoke / Score / Drums) | Thin-shell Admin (+ Timeline przez chrome) na tablecie FOH |
| Po połączeniu | WebView → `/client` | WebView → `/admin` |
| Lokalny host | **Zakaz** (zawsze thin) | **OUT** w MVP — osobna decyzja eng (Faza 4) |
| Audio / MIDI w procesie | **Zakaz** | Sterowanie przez host LAN (SSOT na serwerze) |
| Katalog | `apps/performer` | `apps/console` |

## Instalacja (sideload, bez Google Play)

1. Zbuduj APK lokalnie albo pobierz z GitHub Releases / hosta.
2. Na Androidzie włącz „Instalacja z nieznanych źródeł” dla przeglądarki / menedżera plików.
3. Zainstaluj `StageSync-Performer-vX.Y.Z.apk` lub `StageSync-Console-vX.Y.Z.apk`.

Lokalny build (wymaga Android SDK + JDK 17):

```sh
# Performer
cd apps/performer/android && ./gradlew assembleDebug
# artefakt: app/build/outputs/apk/debug/app-debug.apk

# Console
cd apps/console/android && ./gradlew assembleDebug
```

Skrypt pomocniczy: `apps/performer/scripts/build-apk.sh` (i analog w Console).

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

### Smoke (ręczne)

1. Zainstaluj starszą powłokę (niższy `versionName`) albo tymczasowo obniż `versionName` w buildzie.
2. Uruchom host z nowszym `version` i APK w `data/downloads/`.
3. Połącz launcherem → WebView → dialog z wersjami → **Pobierz i zainstaluj** → instalator systemowy.
4. **Później** nie uruchamia pobierania.

## PWA

`apps/web` wystawia manifest + Service Worker (warstwa A). Na telefonie: Chrome → „Dodaj do ekranu głównego”. Wake Lock API w przeglądarce + `FLAG_KEEP_SCREEN_ON` w APK (dual wake-lock).

## H-01 (perf Client) — observe first

**Nie** robić dużego rewrite `TransportProvider` bez profilu na tablecie.

1. Otwarte: [TODO](./TODO.md) pozycja **Client transport — H-01**.
2. Profiler: Grid / Karaoke / Score @ 90–120 Hz na urządzeniu (Chrome remote debugging / Android Studio Profiler) — zmierz koszt re-renderów konsumentów `useTransport` przy `setDisplayTicks` co rAF (Vitest już potwierdza re-render).
3. Dopiero potem: split context / throttle `displayTicks`; OSMD = cursor transform only (zakaz full `osmd.render()` co klatkę).
4. Follow-up po profilu: `prefers-reduced-motion`; opcjonalnie thermal → cap ~30 FPS interpolacji.

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
| C-HW2 | Admin / Timeline czytelne i używalne na tablecie | — |
| C-HW3 | Brak lokalnego hosta w MVP — jasny komunikat OUT | — |

**Bez claim green** bez dowodu z hardware ([todo-hygiene](../.cursor/rules/todo-hygiene.mdc)).

## Faza 4 — lokalny host na Console

Thin-shell (Faza 3) łączy się z hostem LAN jak desktop remote. Pełny parytet desktopu (Node sidecar / równoważnik na urządzeniu) = **osobna decyzja eng** — nie blokuje Faz 0–3.

**Podejście (MVP vs docelowo):**

| | MVP (teraz) | Faza 4 (później) |
|---|-------------|------------------|
| Shell | Kotlin WebView → `/admin` | + lokalny proces hosta |
| „Uruchom lokalny host” | **Ukryty / disabled** + notka OUT w launcherze Console | Po decyzji eng (sidecar / równoważnik) |
| SSOT czasu / MIDI | Zdalny host LAN | Lokalny host na urządzeniu **albo** nadal LAN |

W launcherze Console przycisk jest widoczny jako niedostępny z tekstem OUT — bez atrapy startu ([ADR 0011](./adr/0011-ui-parity-behavior.md), [ADR 0016](./adr/0016-android-performer-console.md)).

## Zakazy

- Google Play; Capacitor/Cordova-as-magic; auto-update w tle.
- Sekrety / tokeny wbudowane w APK.
- Audio / MIDI clock / synteza w procesie **Performer**.
- Edycja Timeline / Mixer z **Performer**.
- Stub UI „pobierz APK” bez pliku na hoście.
- Ciche pobieranie / instalacja APK bez potwierdzenia operatora.

## Powiązane

- [DESKTOP.md](./DESKTOP.md) · [ADR 0014](./adr/0014-desktop-launcher.md) · [ADR 0015](./adr/0015-daw-reference-and-product-decisions.md) · [ADR 0016](./adr/0016-android-performer-console.md)
