# Triage: Performer + Console (PWA + Android shell) — intro 5.2+ (#674)

**Źródło:** [Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md](./Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md) (Gemini / AI Exporter)  
**Status:** `partial` (MVP shell **on-tree**; residual = Faza 4 / HW / H-01 / #692 delta)  
**Obszar:** PWA Client · `apps/performer` · `apps/console` · QR/mDNS · keep-screen-on / kiosk · perf H-01  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (wave 1: gate unit tests + honest MVP claim; bez Faza 4 / HW green)  
**Kąt:** wprowadzenie feature 5.2+ (nie G1–G10)

## Werdykt przydatności

**Wysoka — kanoniczna macierz MOB-01…04 + zakazy (bez Capacitor-as-magic, bez audio/MIDI na tablecie Performer).** Zgodna z [#674](https://github.com/Negatywistyczny/stagesync/issues/674), [ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md), [ADR 0016](../../../adr/0016-android-performer-console.md), [TODO 5.2+](../../../TODO.md). Dump ≠ claim Done; dump opisuje **tylko** pasywnego klienta (= **Performer**). **Console** = pełnoprawny odpowiednik desktopu (Admin + Timeline + Client + lokalny host docelowo) — thin-shell-only MVP **superseded**.

## Epiki / tematy vs `main` (5.1.x → 5.2+)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| MOB-01 pasywne role Client (Grid/Karaoke/Score/Drums) | `on-tree` | Role w `apps/web` Client; Performer bundluje `dist-performer` (Client-only) → `assets/www` |
| MOB-02 transport SSOT + rAF smooth | `partial` | `TransportProvider` + wake lock PWA; mobile throttle = H-01 (profil first) |
| MOB-03 cienki shell bez sidecara | `on-tree` / residual | **Performer:** thin **on-tree**. **Console:** thin LAN interim **on-tree**; lokalny host produkt IN — Faza 4 eng residual |
| MOB-04 dystrybucja APK z hosta / Releases (bez Play) | `on-tree` | `/downloads/stagesync-*.apk` + QR Admin + release.yml; lokalne `data/downloads/*.apk` (debug) — **bez claim HW green** / signed store |
| Discovery QR + mDNS + manual URL | `on-tree` | Launcher Android: CameraX + ML Kit + mDNS + recent + ręczny URL |
| Offline-First UI hybrid (#692 MVP) | `on-tree` | Role hash + `ui-bundle-{performer\|console}.zip` + dialog „Zastosuj” + `UiSyncChecker` unit tests; delta/CacheStorage = follow-up |
| Split context / throttle `displayTicks` (H-01) | `hypothesis` | TODO 5.2+ H-01; kroki profilera w [MOBILE.md](../../../MOBILE.md) — **bez rewrite bez HW** |
| OSMD cursor-only (bez full re-render) | `hypothesis` | TODO Should / Perf — nie claim fixed |
| Console pełne SPA → `/admin` (+ Client) | `on-tree` | `AppConsole` = trasy desktopu; `dist-console` / `ui-bundle-console` = pełne SPA |
| Console lokalny host | `partial` | Przycisk widoczny + `LocalHostService` + `prepare-local-host.mjs` + uczciwy fail-open; JNI/`libnode` **nie** runnable — **bez claim** |

## Confirmed vs hypothesis

- **Confirmed (na dysku / MVP shell):** dwa APK apps, sideload endpoints, QR join/APK, dual wake-lock, role UI bundles, Offline-First gate + dialog „Zastosuj”, decyzja produktowa Console=pełny parytet + host IN, JVM unit tests (SemVer / QR / UiSync / LocalHostRuntime).
- **Residual gap:** Faza 4 JNI + bundled server (scaffold); H-01 po profilu HW; #692 delta; operatorskie smoke P-HW/C-HW **bez claim green**; signed release keystore gdy CI.
- Issue [#674](https://github.com/Negatywistyczny/stagesync/issues/674) / [#692](https://github.com/Negatywistyczny/stagesync/issues/692) już w TODO — **nie** duplikować bulletów z dumpu.

## Następny krok eng

1. ~~Domknąć falę APK+UI-sync już w drzewie (testy gate)~~ — wave 1.
2. H-01: profilować przed split context.
3. Console host: NDK cmake + `libnode` + paczka serwera (MOBILE.md Faza 4) — bez atrapy sukcesu.
4. Smoke HW (P-HW / C-HW) na tablecie — dopiero potem claim green.
