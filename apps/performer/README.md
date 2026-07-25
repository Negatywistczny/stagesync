# StageSync Performer

**Produkt:** cienki klient sceniczny (role Grid / Karaoke / Score / Drums) na Androidzie.  
**Mapowanie:** `mobile-client` / MOB-01…04 w [#674](https://github.com/Negatywistczny/stagesync/issues/674) → **Performer**.  
**Po połączeniu:** WebView ładuje host `{origin}/client`.

## Stack

- Kotlin + Android WebView (bez Capacitor/Cordova-as-magic) — [ADR 0016](../../docs/adr/0016-android-performer-console.md)
- Launcher: live QR (CameraX + ML Kit) + mDNS + ręczny URL + recent (wzorzec [ADR 0014](../../docs/adr/0014-desktop-launcher.md))
- Dual wake-lock: PWA Wake Lock API + natywne `FLAG_KEEP_SCREEN_ON`

## Build

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

## Zakazy

- Google Play; sekrety w APK
- Lokalny sidecar / audio / MIDI clock w procesie Performer
- Edycja Timeline / Mixer
- Stub UI „pobierz APK” bez pliku na hoście

## Docs

[docs/MOBILE.md](../../docs/MOBILE.md)
