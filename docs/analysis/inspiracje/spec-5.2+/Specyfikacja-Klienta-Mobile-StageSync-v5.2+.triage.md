# Triage: Performer + Console (PWA + Android shell) — intro 5.2+ (#674)

**Źródło:** [Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md](./Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md) (Gemini / AI Exporter)  
**Status:** `open`  
**Obszar:** PWA Client · `apps/performer` · `apps/console` · QR/mDNS · keep-screen-on / kiosk · perf H-01  
**Data triage:** 2026-07-25  
**Kąt:** wprowadzenie feature 5.2+ (nie G1–G10)

## Werdykt przydatności

**Wysoka — kanoniczna macierz MOB-01…04 + zakazy (bez Capacitor-as-magic, bez audio/MIDI na tablecie).** Zgodna z [#674](https://github.com/Negatywistyczny/stagesync/issues/674) i [TODO 5.2+](../../../TODO.md). Dump ≠ implementacja; dump opisuje **tylko** pasywnego klienta (= **Performer**). **Console** = osobny produkt operatorski poza MVP dumpa.

## Epiki / tematy vs `main` (5.1.x → 5.2+)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| MOB-01 pasywne role Client (Grid/Karaoke/Score/Drums) | `partial` | Role w `apps/web` Client istnieją; Performer shell / kiosk — w toku (`apps/performer`) |
| MOB-02 transport SSOT + rAF smooth | `partial` | Istniejący Client + `TransportProvider`; mobile throttle = H-01 (profil first) |
| MOB-03 cienki shell bez sidecara | `partial` | Scaffold `apps/performer` / `apps/console` — [ADR 0016](../../../adr/0016-android-performer-console.md) |
| MOB-04 dystrybucja APK z hosta / Releases (bez Play) | `partial` | `/downloads/stagesync-*.apk` + QR Admin — [MOBILE.md](../../../MOBILE.md) |
| Discovery QR + mDNS + manual URL | `partial` | Desktop launcher ma discovery; natywny QR/mDNS w APK — hooks + README |
| Split context / throttle `displayTicks` (H-01) | `hypothesis` | TODO 5.2+ H-01; kroki profilera w MOBILE.md — **bez rewrite bez HW** |
| OSMD cursor-only (bez full re-render) | `hypothesis` | TODO Should / Perf — nie claim fixed |
| Console thin → `/admin` | `partial` | Poza dumpem MVP; lokalny host = Faza 4 OUT |

## Confirmed vs hypothesis

- **Confirmed gap (wcześniej):** brak `apps/mobile-client` — zastąpione nazwami **Performer** / **Console**.
- **Partial:** PWA/web Client + SSOT bazą pod MVP; dump doprecyzowuje natywną powłokę i perf.
- Issue [#674](https://github.com/Negatywistyczny/stagesync/issues/674) już w TODO — **nie** duplikować bulletów.

## Następny krok eng

MVP Performer: pasywny widok + keep-screen-on + QR/mDNS; bez Timeline/Mixer/MIDI na Performer. H-01 profilować przed split context. Console thin bez sidecara do Fazy 4.
