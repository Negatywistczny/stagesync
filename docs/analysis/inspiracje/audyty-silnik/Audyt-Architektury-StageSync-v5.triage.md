# Triage: Audyt architektury synchronizacji widoków Client

**Źródło:** [Audyt-Architektury-StageSync-v5.md](./Audyt-Architektury-StageSync-v5.md) (Gemini Deep Search)  
**Status:** `closed`  
**Obszar:** TransportProvider / rAF / Grid·Karaoke·Score / syncLead / OSMD  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (H-01: equality bail + sonda `?ss_perf=h01`; throttle nadal po HW)

## Werdykt przydatności

Wszystkie priorytetowe ID rozstrzygnięte. H-02/H-04 wcześniej; H-05 trailing `/`; H-03 debounce OSMD; H-01: Vitest potwierdza rAF→re-render przy zmianie ticków; na drzewie equality bail + opt-in sonda — **bez** split/throttle do profilu HW.

## Rozstrzygnięte

| ID   | Temat                                   | Stan                  | Notatka                                                                                                                                                                                                                             |
| ---- | --------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H-01 | `setDisplayTicks` co rAF → pełne drzewo | `confirmed` + observe | Vitest: N nowych ticków → N re-renderów; ten sam tick → 0. `commitDisplayTicks` + `h01PerfProbe` (`?ss_perf=h01` → `window.__stagesyncH01`). **Nie** mierzone CPU @ 120 Hz na tablecie — → TODO 5.2+ (profiler → split / throttle). |
| H-02 | REST `getTransport` @ `ws.onopen`       | `fixed`               |                                                                                                                                                                                                                                     |
| H-03 | OSMD pełny `render()` na zoom/transpose | `fixed`               | Debounce 120 ms w `ScorePane`                                                                                                                                                                                                       |
| H-04 | `syncLeadMs`                            | `rejected`            | Korekta w `ClientShell`                                                                                                                                                                                                             |
| H-05 | Mid-edit `"C#m7/"` → `sup` z `/`        | `fixed`               | `splitRealBass` zrzuca samotny `/`                                                                                                                                                                                                  |

## Otwarte

_(brak — priorytetowe ID rozstrzygnięte; residual H-01 = pomiar HW, nie brak potwierdzenia)_

## Następny krok eng

1. H-01 w [TODO.md](../../../TODO.md) § 5.2+: profil Grid/Karaoke @ 90–120 Hz ze sondą ([`MOBILE.md`](../../../guides/MOBILE.md) § H-01), potem dopiero split context / throttle.
2. Smoke H-04 Live Desk ±300 ms (opcjonalnie).
