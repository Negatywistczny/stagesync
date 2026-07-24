# Triage: Audyt architektury synchronizacji widoków Client

**Źródło:** [Audyt-Architektury-StageSync-v5.md](./Audyt-Architektury-StageSync-v5.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** TransportProvider / rAF / Grid·Karaoke·Score / syncLead / OSMD  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (H-05 fix; H-03 debounce; H-01 nadal profiler)

## Werdykt przydatności

H-02/H-04 już wcześniej rozstrzygnięte. H-05 naprawione (trailing `/`). H-03: debounce 120 ms na zoom/transpose OSMD. H-01: strukturalnie potwierdzone — **bez** throttle bez pomiaru profilera.

## Rozstrzygnięte

| ID | Temat | Stan | Notatka |
|----|--------|------|---------|
| H-02 | REST `getTransport` @ `ws.onopen` | `fixed` | |
| H-03 | OSMD pełny `render()` na zoom/transpose | `fixed` | Debounce 120 ms w `ScorePane` |
| H-04 | `syncLeadMs` | `rejected` | Korekta w `ClientShell` |
| H-05 | Mid-edit `"C#m7/"` → `sup` z `/` | `fixed` | `splitRealBass` zrzuca samotny `/` |

## Otwarte

| ID | Temat | Impact | Stan | Notatka |
|----|--------|--------|------|---------|
| H-01 | `setDisplayTicks` co rAF → pełne drzewo | Wysoki | `hypothesis` | Potwierdzone w kodzie; **profiler Grid/Karaoke @ 120 Hz** przed split context / throttle |

## Następny krok eng

1. Profiler H-01 — dopiero potem optymalizacja.
2. Smoke H-04 Live Desk ±300 ms (opcjonalnie).
