# Triage: Luki testów MIDI host (`midi/host`)

**Źródło:** [Analiza-Testow-MIDI-Host.md](./Analiza-Testow-MIDI-Host.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `apps/server` — clock IN/OUT, SPP, PC debounce, panic, `safeSend`  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27

## Werdykt przydatności

**Średnia–wysoka.** `host.test.ts` jest bogaty (safeSend, panic, debounce RSK-07); dump trafnie wskazuje luki clock IN/OUT i burst.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Dowód |
|----|--------|-----------|------|--------|
| TST-MH-01 | Clock OUT: burst, seek → SPP+Continue | P0 | `fixed` | `host.test.ts` — clock OUT caps burst + seek |
| TST-MH-02 | Clock IN → `onBeatToWs` co 24 ticków | P0 | `fixed` | `host.test.ts` — 24-clock boundary |
| TST-MH-03 | PC IN debounce 50 ms | P1 | `rejected` | `host.test.ts` — „RSK-07: PC flood debounces 50ms…” |
| TST-MH-04 | Start/Continue/Stop + `lastSppTicks` | P1 | `confirmed` | Częściowe pokrycie transport edges; brak seek+play matrycy |
| TST-MH-05 | `safeSend` / unplug | P1 | `fixed` | `host.test.ts` — „safeSend keeps process alive…” |
| TST-MH-06 | `panic()` partial failure | P2 | `fixed` | `host.test.ts` — mid-flight throw |
| TST-MH-07 | `applyPorts` + config-persist boot | P2 | `confirmed` | Brak integracji w grep |

## Następny krok eng

TST-MH-04/07 — opcjonalnie; P0 domknięte.
