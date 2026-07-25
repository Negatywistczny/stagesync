# StageSync Console

**Produkt:** pełnoprawny odpowiednik desktopu na Androidzie (Admin + Timeline + Client + lokalny host).  
**Mapowanie:** `mobile-full` w [#674](https://github.com/Negatywistczny/stagesync/issues/674) → **Console**.  
**Po połączeniu:** WebView ładuje host `{origin}/admin` z **pełnym SPA** (link „Klient” działa).

## Stack

- Kotlin + WebView — [ADR 0016](../../docs/adr/0016-android-performer-console.md)
- Launcher jak desktop ([ADR 0014](../../docs/adr/0014-desktop-launcher.md)): QR + mDNS + recent + **„Uruchom lokalny host”**
- Lokalny host: nodejs-mobile (`libnode`) + JNI + `assets/host` (serwer jak sidecar desktop). Bez silnika w APK → uczciwy status (nie atrapa).

## Build

```sh
./scripts/build-apk.sh
# albo (po pnpm --filter @stagesync/web build + prepare-local-host):
cd android && ./gradlew assembleDebug
```

Gradle kopiuje **pełne SPA** `apps/web/dist-console` → `assets/www` (ABI: arm64-v8a + armeabi-v7a).

Domyślnie `build-apk.sh` uruchamia `prepare-local-host.mjs` (libnode + headers + server/web/seed). Wymaga NDK 26 + CMake 3.22.1.

```sh
node scripts/prepare-local-host.mjs              # pełny pack (domyślny)
node scripts/prepare-local-host.mjs --skip-server  # tylko libnode/headers
SKIP_LOCAL_HOST=1 ./scripts/build-apk.sh         # APK bez silnika (LAN-only)
```

Artefakt debug: `android/app/build/outputs/apk/debug/app-debug.apk`  
Nazwa release CI: `StageSync-Console-vX.Y.Z.apk`

`./scripts/build-apk.sh` kopiuje wynik do `data/downloads/stagesync-console.apk`. Host (desktop / monorepo) serwuje go automatycznie pod `/downloads/` — bez ręcznego kopiowania do Documents.

## Zakazy

- Google Play; sekrety w APK; Capacitor-as-magic
- Auto-update w tle
- Atrapa „host uruchomiony” bez `/api/health` na 127.0.0.1
- Performer ≠ Console (Performer zostaje Client-only, bez lokalnego hosta)

## Docs

[docs/MOBILE.md](../../docs/MOBILE.md)
