# Triage: Audyt architektury synchronizacji widoków Client

**Źródło:** [Audyt-Architektury-StageSync-v5.md](./Audyt-Architektury-StageSync-v5.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** TransportProvider / rAF / Grid·Karaoke·Score / syncLead / OSMD  
**Data triage:** 2026-07-25

## Werdykt przydatności

**Dobry audyt warstwy Client** (nie second clock). H-02 pokrywa się z już naprawionym wyścigiem HTTP@`onopen` ([Transport SSOT](./Audyt-Synchronizacji-Transport-SSOT.triage.md)). H-04 (`syncLeadMs` nieużywane w rAF) — dump **częściowo nieaktualny**: `ClientShell` dodaje `ticksFromSyncLeadMs(liveDesk.syncLeadMs, …)` do `displayTicks` przed widokami. Otwarte: koszt rAF→React state (H-01), Long Tasks OSMD (H-03), mid-edit akordów (H-05).

## Rozstrzygnięte w tej fali

| ID | Temat | Stan | Notatka |
|----|--------|------|---------|
| H-02 | REST `getTransport` @ `ws.onopen` vs świeży tick | `fixed` | Usunięte z onopen; mount HTTP zostaje (pierwszy paint) |
| H-04 | `syncLeadMs` nie wpływa na pozycję UI | `rejected` | Korekta w `ClientShell.tsx` (nie w samym `getDisplayTicks`) — smoke Live Desk ±300 ms nadal mile widziany |

## Otwarte / hipotezy

| ID | Temat | Impact | Stan | Dlaczego ciekawe |
|----|--------|--------|------|------------------|
| H-01 | `setDisplayTicks` co klatkę rAF → re-render drzewa | Wysoki (CPU / mobile) | `hypothesis` | Profiler React DevTools przy Grid 120–144 Hz; ewentualnie throttle do zmiany taktu/akordu |
| H-03 | OSMD re-render przy zoom/transpose w trakcie Play | Wysoki (jank) | `hypothesis` | Long Tasks w Performance; debounce suwaków |
| H-05 | Mid-edit chord string niespójny ze scenic parts | Niski | `hypothesis` | Unit `formatChordParts("C#m7/")` — dump twierdzi safe |

## Świadome limity dumpu (zgodne z konstytucją)

BBT tylko projekcja; brak lokalnego WebAudio w Grid/Karaoke; zakaz absBeat / unicode w storage / stubów / chrome v4 — **nie** backlog.

## Pokrewne

- [Specyfikacja wyświetlania](../referencje-daw/Specyfikacja-Referencji-Zachowan-Wyswietlania.triage.md) — zachowania CC-*
- [Transport SSOT](./Audyt-Synchronizacji-Transport-SSOT.triage.md) — anchor / WS

## Następny krok eng

1. Profiler H-01 (Grid + Karaoke, długi Play) — dopiero potem optymalizacja.
2. Smoke H-04: Live Desk `syncLeadMs` +300 — przesunięcie Grid/Score.
3. H-03: zoom Score w trakcie Play — pomiar long task; bez przepisywania OSMD „na zapas”.
