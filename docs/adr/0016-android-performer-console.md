# ADR 0016 — Android Performer + Console (Kotlin WebView)

- **Status:** Zaakceptowany
- **Data:** 2026-07-25
- **Etap:** `5.2+` (intro)

## Kontekst

[#674](https://github.com/Negatywistczny/stagesync/issues/674) i dump Mobile Client opisują pasywnego klienta scenicznego oraz dystrybucję APK bez Google Play. Potrzebne są **dwa** produkty Android w monorepo, spójne z desktop launcherem ([ADR 0014](./0014-desktop-launcher.md)), bez Capacitor/Cordova-as-magic i bez sekretów w APK.

## Decyzja

1. **Nazwy produktowe:** **StageSync Performer** (pasywny `/client`) i **StageSync Console** (pełnoprawny odpowiednik desktopu na Androidzie). Katalogi: `apps/performer`, `apps/console`.
2. **Powłoka:** Kotlin + Android WebView ładujący `apps/web` — **zakaz** Capacitor/Cordova jako „magii” opakowującej SPA.
3. **Launcher:** te same tory co desktop — QR + mDNS + ręczny URL + recent + **„Uruchom lokalny host”** (Console); health → nawigacja. Performer → `/client`. Console → `/admin` (z pełnym SPA: Admin + Timeline + Client; link „Klient” działa lokalnie).
4. **Dual wake-lock:** PWA (W3C Screen Wake Lock) + natywne `FLAG_KEEP_SCREEN_ON`.
5. **Dystrybucja:** sideload + GitHub Releases + `GET /downloads/stagesync-performer.apk` i `…-console.apk` z hosta; QR w Adminie. Brak pliku = 404 / empty-state ([ADR 0011](./0011-ui-parity-behavior.md)). Auto-update APK w tle = **NIE** ([ADR 0015](./0015-daw-reference-and-product-decisions.md)).
6. **Console = pełny parytet desktopu (cel produktu):** Admin + Timeline + Client + **lokalny host** na urządzeniu ([ADR 0015](./0015-daw-reference-and-product-decisions.md)). Thin-shell-only MVP jest **superseded** jako intencja — może zostać ścieżką interim (LAN) do czasu gotowości silnika hosta, ale claim/cel = pełny parytet. Lokalny host = **produkt IN**; implementacja eng fazowana (Faza 4). W UI: przycisk widoczny; brak pełnego silnika → uczciwy status (nie atrapa sukcesu).
7. **Performer:** zawsze Client-only (read-only); bez sidecara, bez lokalnego audio/MIDI clock, bez edycji Timeline/Mixer.
8. **Offline-First hybrid UI ([#692](https://github.com/Negatywistczny/stagesync/issues/692)):** APK bundluje **role-specific** Vite dist (`assets/www`: Performer = Client-only, Console = **pełne SPA** jak desktop). Cold start przez `WebViewAssetLoader` (local-first, API/WS nadal z hosta). `GET /api/health` niesie `protocolVersion` + `uiHash` (pełne SPA) oraz opcjonalnie `uiHashPerformer` / `uiHashConsole`. Powłoka porównuje **tylko** hash swojej roli. Twardy mismatch protokołu → **Remote Mode** (UI z hosta) **bez** kasowania lokalnego bufora. Nowszy / inny hash roli na hoście → **jawny** dialog „Zastosuj nowy interfejs” / „Później” (opcja A); **nigdy** cichy sync UI mid-set i **nigdy** cicha instalacja APK. „Zastosuj” pobiera `GET /downloads/ui-bundle-performer.zip` albo `…-console.zip` do `filesDir/ui-cache`. Pełny delta/CacheStorage = follow-up; to **nie** jest auto-update natywnego APK.

## Konsekwencje

- Dokumentacja operatora: [MOBILE.md](../MOBILE.md).
- CI release może budować APK (`StageSync-Performer-vX.Y.Z.apk`, `StageSync-Console-vX.Y.Z.apk`) gdy Android SDK dostępne — wymaga wcześniejszego buildu `apps/web` (ui-hash / www assets).
- H-01 (throttle / split `displayTicks`) — najpierw profil HW, potem kod ([ADR 0015](./0015-daw-reference-and-product-decisions.md)).

## Powiązane

- [ADR 0010](./0010-desktop-shell-tauri.md), [0014](./0014-desktop-launcher.md), [0015](./0015-daw-reference-and-product-decisions.md)
- Issues [#674](https://github.com/Negatywistczny/stagesync/issues/674), [#692](https://github.com/Negatywistczny/stagesync/issues/692)
