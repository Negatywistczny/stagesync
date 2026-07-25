# StageSync Performer

**Produkt:** cienki klient sceniczny (role Grid / Karaoke / Score / Drums) na Androidzie.  
**Mapowanie:** `mobile-client` / MOB-01…04 w [#674](https://github.com/Negatywistyczny/stagesync/issues/674) → **Performer**.  
**Po połączeniu:** WebView ładuje host `{origin}/client`.

## Stack

- Kotlin + Android WebView (bez Capacitor/Cordova-as-magic) — [ADR 0016](../../docs/adr/0016-android-performer-console.md)
- Launcher: live QR (CameraX + ML Kit) + mDNS + ręczny URL + recent (wzorzec [ADR 0014](../../docs/adr/0014-desktop-launcher.md))
- Dual wake-lock: PWA Wake Lock API + natywne `FLAG_KEEP_SCREEN_ON`

## Build

Wymaga **JDK 17+** i **Android SDK** (`ANDROID_HOME` / `ANDROID_SDK_ROOT`).

```sh
./scripts/build-apk.sh
# albo:
cd android && ./gradlew assembleDebug
```

Artefakt debug: `android/app/build/outputs/apk/debug/app-debug.apk`  
Nazwa release CI: `StageSync-Performer-vX.Y.Z.apk`

Skopiuj APK do katalogu downloads hosta, np.:

```sh
cp android/app/build/outputs/apk/debug/app-debug.apk \
  "$STAGESYNC_DATA_DIR/downloads/stagesync-performer.apk"
```

## Zakazy

- Google Play; sekrety w APK
- Lokalny sidecar / audio / MIDI clock w procesie Performer
- Edycja Timeline / Mixer
- Stub UI „pobierz APK” bez pliku na hoście

## Docs

[docs/MOBILE.md](../../docs/MOBILE.md)
