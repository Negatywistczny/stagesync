# StageSync Console

**Produkt:** pełnoprawny odpowiednik desktopu na Androidzie (Admin + Timeline + Client + docelowo lokalny host).  
**Mapowanie:** `mobile-full` w [#674](https://github.com/Negatywistczny/stagesync/issues/674) → **Console**. Thin-shell-only MVP = **superseded** jako intencja ([ADR 0015](../../docs/adr/0015-daw-reference-and-product-decisions.md), [ADR 0016](../../docs/adr/0016-android-performer-console.md)).  
**Po połączeniu:** WebView ładuje host `{origin}/admin` z **pełnym SPA** (link „Klient” działa).

## Stack

- Kotlin + WebView — [ADR 0016](../../docs/adr/0016-android-performer-console.md)
- Launcher jak desktop ([ADR 0014](../../docs/adr/0014-desktop-launcher.md)): QR + mDNS + recent + **„Uruchom lokalny host”**
- Lokalny host = **produkt IN**; eng fazowany (Faza 4). Bez silnika w APK → uczciwy status (nie atrapa).

## Build

```sh
./scripts/build-apk.sh
# albo (po pnpm --filter @stagesync/web build):
cd android && ./gradlew assembleDebug
```

Gradle kopiuje **pełne SPA** `apps/web/dist-console` → `assets/www` (ABI: arm64-v8a + armeabi-v7a).

Opcjonalnie (Faza 4, powiększa APK):

```sh
node scripts/prepare-local-host.mjs           # libnode.so → jniLibs (gitignored)
node scripts/prepare-local-host.mjs --with-server
```

Artefakt debug: `android/app/build/outputs/apk/debug/app-debug.apk`  
Nazwa release CI: `StageSync-Console-vX.Y.Z.apk`

`./scripts/build-apk.sh` kopiuje wynik do `data/downloads/stagesync-console.apk`. Host (desktop / monorepo) serwuje go automatycznie pod `/downloads/` — bez ręcznego kopiowania do Documents.

## Zakazy

- Google Play; sekrety w APK; Capacitor-as-magic
- Auto-update w tle
- Atrapa „host uruchomiony” bez `/api/health` na 127.0.0.1
- Performer ≠ Console (Performer zostaje Client-only)

## Docs

[docs/MOBILE.md](../../docs/MOBILE.md)
