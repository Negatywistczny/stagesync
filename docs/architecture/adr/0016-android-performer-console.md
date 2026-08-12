# ADR 0016 — Android Performer + Console (Kotlin WebView)

- **Status:** Zaakceptowany
- **Data:** 2026-07-25
- **Etap:** `5.2+` (intro); amend 2026-07-26 — [ADR 0017](./0017-live-show-control-contracts.md)

## Kontekst

[#674](https://github.com/Negatywistczny/stagesync/issues/674) i dump Mobile Client opisują pasywnego klienta scenicznego oraz dystrybucję APK bez Google Play. Potrzebne są **dwa** produkty Android w monorepo, spójne z desktop launcherem ([ADR 0014](./0014-desktop-launcher.md)), bez Capacitor/Cordova-as-magic i bez sekretów w APK.

## Decyzja

1. **Nazwy produktowe:** **StageSync Performer** (pasywny `/client`) i **StageSync Console** (pełnoprawny odpowiednik desktopu na Androidzie). Katalogi: `apps/performer`, `apps/console`.
2. **Powłoka:** Kotlin + Android WebView ładujący `apps/web` — **zakaz** Capacitor/Cordova jako „magii” opakowującej SPA.
3. **Launcher:** te same tory co desktop — QR + mDNS + ręczny URL + recent + **„Uruchom lokalny host”** (Console, CTA **wtórne**); **domyślna ścieżka = LAN** do hosta desktop ([ADR 0017](./0017-live-show-control-contracts.md) §1). health → nawigacja. Performer → `/client`. Console → `/admin` (z pełnym SPA: Admin + Timeline + Client; link „Klient” działa lokalnie).
4. **Dual wake-lock:** PWA (W3C Screen Wake Lock) + natywne `FLAG_KEEP_SCREEN_ON`.
5. **Dystrybucja:** sideload + GitHub Releases + `GET /downloads/stagesync-performer.apk` i `…-console.apk` z hosta; QR w Adminie. Brak pliku = 404 / empty-state ([ADR 0011](./0011-ui-parity-behavior.md)). Auto-update APK w tle = **NIE** ([ADR 0015](./0015-daw-reference-and-product-decisions.md)).
6. **Console = pełny parytet desktopu (cel produktu):** Admin + Timeline + Client + **lokalny host** na urządzeniu ([ADR 0015](./0015-daw-reference-and-product-decisions.md), [ADR 0017](./0017-live-show-control-contracts.md) §1). Lokalny host = **produkt IN jako booth awaryjny/terenowy**; implementacja: nodejs-mobile (`libnode`) + JNI (`stagesync-host-bridge`) + `assets/host` (paczka serwera jak sidecar desktop). Start: foreground service w procesie `:host` → extract → `node::Start` → probe `GET /api/health` na `127.0.0.1:4000` → Admin. Awaria natywna nie zabija UI. Brak / uszkodzony silnik w APK → uczciwy status (nie atrapa sukcesu). Native MIDI na Androidzie = niedostępne (fallback „none”); mDNS LAN: Node `bonjour` wyłączony pod nodejs-mobile — advertise `_stagesync._tcp` przez Android **NSD** (`NsdManager`) gdy host READY. **16 KB pages:** domyślny `prepare-local-host` pakuje przebudowę digidem `v18.20.4` z `PT_LOAD` ≥ 16 KB (upstream zip nadal 4 KB do oficjalnego cutu +16kb-fix).
7. **Performer:** zawsze Client-only (read-only); bez sidecara, bez lokalnego hosta, bez lokalnego audio/MIDI clock, bez edycji Timeline/Mixer; **bez globalnego Panic** ([ADR 0017](./0017-live-show-control-contracts.md) §8b).
8. **Offline-First hybrid UI ([#692](https://github.com/Negatywistczny/stagesync/issues/692)):** APK bundluje **role-specific** Vite dist (`assets/www`: Performer = Client-only, Console = **pełne SPA** jak desktop). Cold start przez `WebViewAssetLoader` (local-first, API/WS nadal z hosta). `GET /api/health` niesie `protocolVersion` + `uiHash` (pełne SPA) oraz opcjonalnie `uiHashPerformer` / `uiHashConsole`. Powłoka porównuje **tylko** hash swojej roli. Twardy mismatch protokołu → **Remote Mode** (UI z hosta) **bez** kasowania lokalnego bufora. Nowszy / inny hash roli na hoście → **jawny** dialog „Zastosuj nowy interfejs” / „Później” (opcja A); **nigdy** cichy sync UI mid-set i **nigdy** cicha instalacja APK. „Zastosuj” pobiera `GET /downloads/ui-bundle-performer.zip` albo `…-console.zip` do `filesDir/ui-cache`. **Apply mid-PLAY ([ADR 0017](./0017-live-show-control-contracts.md) §6):** Performer — twardy block gdy transport hosta `PLAYING` (dozwolone `PAUSED`/`STOPPED`/`IDLE`); Console — przy `PLAYING` ostrzeżenie + potwierdzenie (copy: utrata podglądu **i** Admina gdy lokalny `:host` żywy). Pełny delta/CacheStorage = follow-up; to **nie** jest auto-update natywnego APK.
9. **PIN TTL / Panic ([ADR 0017](./0017-live-show-control-contracts.md) §8):** sesja PIN nie wygasa w `PLAYING`; poza show — lock przy ekranie OS / `onPause` + idle 15 min. Globalny Panic bez PIN tylko Console/Admin z hold ~1 s.

## Konsekwencje

- Dokumentacja operatora: [MOBILE.md](../../guides/MOBILE.md).
- CI release może budować APK (`StageSync-Performer-vX.Y.Z.apk`, `StageSync-Console-vX.Y.Z.apk`) gdy Android SDK dostępne — wymaga wcześniejszego buildu `apps/web` (ui-hash / www assets).
- H-01 (throttle / split `displayTicks`) — najpierw profil HW, potem kod ([ADR 0015](./0015-daw-reference-and-product-decisions.md)).

## Powiązane

- [ADR 0010](./0010-desktop-shell-tauri.md), [0014](./0014-desktop-launcher.md), [0015](./0015-daw-reference-and-product-decisions.md), [0017](./0017-live-show-control-contracts.md)
- Issues [#674](https://github.com/Negatywistczny/stagesync/issues/674), [#692](https://github.com/Negatywistczny/stagesync/issues/692)
