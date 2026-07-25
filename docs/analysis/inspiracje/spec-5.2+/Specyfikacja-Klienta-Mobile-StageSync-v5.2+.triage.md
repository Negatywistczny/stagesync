# Triage: Mobile Client (PWA + Android shell) — intro 5.2+ (#674)

**Źródło:** [Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md](./Specyfikacja-Klienta-Mobile-StageSync-v5.2+.md) (Gemini / AI Exporter)  
**Status:** `open`  
**Obszar:** PWA Client · `apps/mobile-client` · QR/mDNS · keep-screen-on / kiosk · perf H-01  
**Data triage:** 2026-07-25  
**Kąt:** wprowadzenie feature 5.2+ (nie G1–G10)

## Werdykt przydatności

**Wysoka — kanoniczna macierz MOB-01…04 + zakazy (bez Capacitor-as-magic, bez audio/MIDI na tablecie).** Zgodna z [#674](https://github.com/Negatywistyczny/stagesync/issues/674) i [TODO 5.2+](../../../TODO.md). Dump ≠ implementacja; `apps/mobile-client/` **nie istnieje** na dysku.

## Epiki / tematy vs `main` (5.1.x)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| MOB-01 pasywne role Client (Grid/Karaoke/Score/Drums) | `partial` | Role w `apps/web` Client istnieją; mobile shell / kiosk — brak |
| MOB-02 transport SSOT + rAF smooth | `partial` | Istniejący Client + `TransportProvider`; mobile-specific throttle — hipoteza |
| MOB-03 cienki shell bez sidecara | `hypothesis` | Brak katalogu `apps/mobile-client` — **confirmed gap** |
| MOB-04 dystrybucja APK z hosta / Releases (bez Play) | `hypothesis` | Brak pipeline / `/downloads/…apk` |
| Discovery QR + mDNS + manual URL | `partial` | Launcher/desktop ma discovery w ekosystemie hosta; natywny QR/mDNS w APK — gap |
| Split context / throttle `displayTicks` (H-01) | `hypothesis` | Już w TODO 5.2+ jako H-01; dump = wymaganie mobilne |
| OSMD cursor-only (bez full re-render) | `hypothesis` | TODO Should / Perf — nie claim fixed |

## Confirmed vs hypothesis

- **Confirmed gap:** brak `apps/mobile-client`, brak APK z hosta.
- **Partial:** PWA/web Client + SSOT już bazą pod MVP; dump doprecyzowuje natywną powłokę i perf.
- Issue [#674](https://github.com/Negatywistyczny/stagesync/issues/674) już w TODO — **nie** duplikować bulletów.

## Następny krok eng

Trzymać MVP: pasywny widok + keep-screen-on + QR/mDNS; bez Timeline/Mixer/MIDI na mobile. H-01 profilować przed split context.
