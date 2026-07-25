# StageSync Console

**Produkt:** thin-shell operatorski na Androidzie (Admin + Timeline przez istniejący chrome web).  
**Mapowanie:** `mobile-full` w [#674](https://github.com/Negatywistyczny/stagesync/issues/674) → **Console** (MVP = thin; lokalny host = Faza 4).  
**Po połączeniu:** WebView ładuje host `{origin}/admin`.

## Stack

- Ten sam stos co Performer: Kotlin + WebView — [ADR 0016](../../docs/adr/0016-android-performer-console.md)
- Launcher jak desktop ([ADR 0014](../../docs/adr/0014-desktop-launcher.md)) z live QR (CameraX + ML Kit); ścieżka docelowa `/admin`
- **Uruchom lokalny host:** OUT w MVP (disabled + notka) — decyzja eng Fazy 4

## Build

```sh
./scripts/build-apk.sh
# albo (po pnpm --filter @stagesync/web build):
cd android && ./gradlew assembleDebug
```

Gradle kopiuje **Admin+Timeline** `apps/web/dist-console` → `assets/www` (ABI: arm64-v8a + armeabi-v7a).

Artefakt debug: `android/app/build/outputs/apk/debug/app-debug.apk`  
Nazwa release CI: `StageSync-Console-vX.Y.Z.apk`

```sh
cp android/app/build/outputs/apk/debug/app-debug.apk \
  "$STAGESYNC_DATA_DIR/downloads/stagesync-console.apk"
```

## Zakazy

- Google Play; sekrety w APK; Capacitor-as-magic
- Auto-update w tle
- Claim „pełny parytet desktopu” bez lokalnego hosta (Faza 4)

## Docs

[docs/MOBILE.md](../../docs/MOBILE.md)
