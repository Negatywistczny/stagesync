> [📦 StageSync](../../README.md) / [apps](../README.md)

# 📱 apps/performer — Klient Sceniczny Android (Performer)

**Produkt:** cienki klient sceniczny (role Grid / Karaoke / Score / Drums) na Androidzie.  
**Mapowanie:** `mobile-client` / MOB-01…04 w [#674](https://github.com/Negatywistczny/stagesync/issues/674) → **Performer**.  
**Po połączeniu:** WebView ładuje host `{origin}/client`.

## 📁 Struktura projektu

- **`android/`** — Projekt Kotlin + Gradle (WebView, CameraX, ML Kit, mDNS, wake-lock).
- **`scripts/`** — Skrypt budowania APK (`build-apk.sh`).

## 🚀 Natywny Launcher (Android)

Natywny interfejs startowy zaimplementowany w Kotlin (`android/`):

- **Wyrywanie hostów (Discovery):** live QR (CameraX + ML Kit) + mDNS (`_stagesync._tcp`) + ręczny URL + lista ostatnich połączeń (recent).
- **Punkt wejścia:** Po weryfikacji `/api/health` przekierowuje do `{origin}/client`.
- **Zasady:** brak lokalnego serwera / sidecara, brak edycji Timeline / Mixer, brak sekretów w APK. Patrz [ADR 0014](../../docs/adr/0014-desktop-launcher.md) i [ADR 0016](../../docs/adr/0016-android-performer-console.md).

## 🔧 Stack technologiczny

- Kotlin + Android WebView (bez Capacitor/Cordova) — [ADR 0016](../../docs/adr/0016-android-performer-console.md)
- Dual wake-lock: PWA Wake Lock API + natywne `FLAG_KEEP_SCREEN_ON`

## ⚙️ Budowanie i testowanie

Wymaga **JDK 17+** i **Android SDK** (`ANDROID_HOME` / `ANDROID_SDK_ROOT`).

```sh
./scripts/build-apk.sh
# albo (po pnpm --filter @stagesync/web build):
cd android && ./gradlew assembleDebug
```

Gradle kopiuje **Client-only** `apps/web/dist-performer` → `assets/www` (ABI: arm64-v8a + armeabi-v7a).

Artefakt debug: `android/app/build/outputs/apk/debug/app-debug.apk`  
Nazwa release CI: `StageSync-Performer-vX.Y.Z.apk`

`./scripts/build-apk.sh` kopiuje wynik do `data/downloads/stagesync-performer.apk`. Host (desktop / monorepo) serwuje go automatycznie pod `/downloads/` — bez ręcznego kopiowania do Documents.

## 🚫 Zakazy

- Google Play; sekrety w APK
- Lokalny sidecar / audio / MIDI clock w procesie Performer
- Edycja Timeline / Mixer
- Stub UI „pobierz APK" bez pliku na hoście

## 📚 Dokumentacja

[docs/guides/MOBILE.md](../../docs/guides/MOBILE.md)
