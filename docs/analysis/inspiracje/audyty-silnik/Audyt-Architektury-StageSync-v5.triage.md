# Triage: Audyt architektury synchronizacji widoków Client

**Źródło:** [Audyt-Architektury-StageSync-v5.md](./Audyt-Architektury-StageSync-v5.md) (Gemini Deep Search)  
**Status:** `closed`  
**Obszar:** TransportProvider / rAF / Grid·Karaoke·Score / syncLead / OSMD  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (H-01 `confirmed` — Vitest rAF→re-render; bez fix do profilera)

## Werdykt przydatności

Wszystkie priorytetowe ID rozstrzygnięte. H-02/H-04 wcześniej; H-05 trailing `/`; H-03 debounce OSMD; H-01: `setDisplayTicks` co rAF → re-render konsumentów `useTransport` (test), bez throttle — optymalizacja dopiero po profilerze Grid/Karaoke.

## Rozstrzygnięte

| ID | Temat | Stan | Notatka |
|----|--------|------|---------|
| H-01 | `setDisplayTicks` co rAF → pełne drzewo | `confirmed` | Vitest: 8 rAF → 8 re-renderów `useTransport` (`TransportProvider.test.tsx`); brak guarda równości / throttle w `startRaf`; `ClientShell` → Grid/Karaoke dostają `displayTicks` props bez `memo`. **Nie** mierzone CPU @ 120 Hz — → TODO 5.2+ (profiler → split context / throttle). |
| H-02 | REST `getTransport` @ `ws.onopen` | `fixed` | |
| H-03 | OSMD pełny `render()` na zoom/transpose | `fixed` | Debounce 120 ms w `ScorePane` |
| H-04 | `syncLeadMs` | `rejected` | Korekta w `ClientShell` |
| H-05 | Mid-edit `"C#m7/"` → `sup` z `/` | `fixed` | `splitRealBass` zrzuca samotny `/` |

## Otwarte

*(brak — priorytetowe ID rozstrzygnięte)*

## Następny krok eng

1. H-01 w [TODO.md](../../../TODO.md) § 5.2+: profiler Grid/Karaoke @ 120 Hz, potem dopiero split context / throttle.
2. Smoke H-04 Live Desk ±300 ms (opcjonalnie).
