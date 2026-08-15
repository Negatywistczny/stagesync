# Triage: Performer + Console (PWA + Android shell) — intro 5.2+ (#674)

**Źródło:** [Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md](./Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md) (Gemini / AI Exporter)  
**Status:** `partial` (MVP shell **on-tree**; residual = HW smoke / H-01 / #692 delta)  
**Obszar:** PWA Client · `apps/performer` · `apps/console` · QR/mDNS · keep-screen-on / kiosk · perf H-01  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-26 (Console lokalny host on-tree; link Krytyka Mobile-for-Live)  
**Kąt:** wprowadzenie feature 5.2+ (nie G1–G10)  
**Review strategii:** [Krytyka-strategii-Mobile-for-Live.triage.md](./Krytyka-strategii-Mobile-for-Live.triage.md) · [Ocena-Strategii-Produktu-StageSync-v5.triage.md](./Ocena-Strategii-Produktu-StageSync-v5.triage.md)

## Werdykt przydatności

**Wysoka — kanoniczna macierz MOB-01…04 + zakazy (bez Capacitor-as-magic, bez audio/MIDI na tablecie Performer).** Zgodna z [#674](https://github.com/kacperczeczot/stagesync/issues/674), [ADR 0015../../../../architecture/adr/0015-daw-reference-and-product-decisions.md), [ADR 0016../../../../architecture/adr/0016-android-performer-console.md), [TODO 5.2+../../../../TODO.md). Dump ≠ claim Done; dump opisuje **tylko** pasywnego klienta (= **Performer**). **Console** = pełnoprawny odpowiednik desktopu (Admin + Timeline + Client + lokalny host docelowo) — thin-shell-only MVP **superseded**. Krytyka Mobile-for-Live: KEEP Performer/sideload/Offline-First; REVISE host = konflikt z ADR IN — nie revert bez PO.

## Epiki / tematy vs `main` (5.2.0)

| ID / temat                                            | Stan                 | Notatka                                                                                                                                      |
| ----------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| MOB-01 pasywne role Client (Grid/Karaoke/Score/Drums) | `on-tree`            | Role w `apps/web` Client; Performer bundluje `dist-performer` (Client-only) → `assets/www`                                                   |
| MOB-02 transport SSOT + rAF smooth                    | `partial`            | `TransportProvider` + wake lock PWA; mobile throttle = H-01 (profil first)                                                                   |
| MOB-03 cienki shell bez sidecara                      | `on-tree` / residual | **Performer:** thin **on-tree**. **Console:** LAN **on-tree**; lokalny host (nodejs-mobile) **on-tree** — HW smoke residual                  |
| MOB-04 dystrybucja APK z hosta / Releases (bez Play)  | `on-tree`            | `/downloads/stagesync-*.apk` + QR Admin + release.yml; lokalne `data/downloads/*.apk` (debug) — **bez claim HW green** / signed store        |
| Discovery QR + mDNS + manual URL                      | `on-tree`            | Launcher Android: CameraX + ML Kit + mDNS + recent + ręczny URL                                                                              |
| Offline-First UI hybrid (#692 MVP)                    | `on-tree`            | Role hash + `ui-bundle-{performer\|console}.zip` + dialog „Zastosuj” + `UiSyncChecker` unit tests; delta/CacheStorage = follow-up            |
| Split context / throttle `displayTicks` (H-01)        | `partial`            | Equality bail + sonda `?ss_perf=h01` **on-tree**; split/throttle **hypothesis** do profilu HW (../../../guides/MOBILE.md))                   |
| OSMD cursor-only (bez full re-render)                 | `hypothesis`         | TODO Should / Perf — nie claim fixed                                                                                                         |
| Console pełne SPA → `/admin` (+ Client)               | `on-tree`            | `AppConsole` = trasy desktopu; `dist-console` / `ui-bundle-console` = pełne SPA                                                              |
| Console lokalny host                                  | `on-tree`            | `prepare-local-host` + NDK JNI + `LocalHostService` → health `127.0.0.1:4000` → Admin; native MIDI N/A na Androidzie; **bez claim HW green** |

## Confirmed vs hypothesis

- **Confirmed (na dysku / MVP shell):** dwa APK apps, sideload endpoints, QR join/APK, dual wake-lock, role UI bundles, Offline-First gate + dialog „Zastosuj”, decyzja produktowa Console=pełny parytet + host IN, Console lokalny host (JNI/`libnode`/assets/host) w domyślnym [`build-apk.sh`](../../../../../apps/console/scripts/build-apk.sh), JVM unit tests (SemVer / QR / UiSync / LocalHostRuntime).
- **Residual gap:** H-01 **profil HW** (sonda gotowa; bez split/throttle); #692 delta; operatorskie smoke P-HW/C-HW **bez claim green**; native MIDI na Android Console host; signed release keystore gdy CI.
- Issue [#674](https://github.com/kacperczeczot/stagesync/issues/674) / [#692](https://github.com/kacperczeczot/stagesync/issues/692) już w TODO — **nie** duplikować bulletów z dumpu.

## Następny krok eng

1. H-01: profil HW ze `?ss_perf=h01` / `window.__stagesyncH01` — **potem** split context.
2. Smoke HW (P-HW / C-HW, w tym C-HW3 lokalny host) na tablecie — dopiero potem claim green.
3. #692 delta / CacheStorage — residual [TODO../../../../TODO.md).
