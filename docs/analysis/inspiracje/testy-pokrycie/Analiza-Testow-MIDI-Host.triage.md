# Triage: Luki testów MIDI host (`midi/host`)

**Źródło:** [Analiza-Testow-MIDI-Host.md](./Analiza-Testow-MIDI-Host.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `apps/server` — clock IN/OUT, SPP, PC debounce, panic, `safeSend`  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage [`host.ts`](../../../../apps/server/src/midi/host.ts) **90.5%** lines / **79.5%** branches (clock IN/OUT + panic partial)

## Werdykt przydatności

**Średnia–wysoka.** P0 clock IN/OUT domknięte; pozostałe: seek+play matryca (P1), `applyPorts` boot (P2).

## Priorytety weryfikacji

| ID        | Temat                                 | Priorytet | Stan        | Dowód                                                                                                |
| --------- | ------------------------------------- | --------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| TST-MH-01 | Clock OUT: burst, seek → SPP+Continue | P0        | `fixed`     | [`host.test.ts`](../../../../apps/server/src/midi/host.test.ts) — clock OUT caps burst + seek        |
| TST-MH-02 | Clock IN → `onBeatToWs` co 24 ticków  | P0        | `fixed`     | [`host.test.ts`](../../../../apps/server/src/midi/host.test.ts) — 24-clock boundary                  |
| TST-MH-03 | PC IN debounce 50 ms                  | P1        | `rejected`  | [`host.test.ts`](../../../../apps/server/src/midi/host.test.ts) — „RSK-07: PC flood debounces 50ms…” |
| TST-MH-04 | Start/Continue/Stop + `lastSppTicks`  | P1        | `confirmed` | Częściowe pokrycie transport edges; brak seek+play matrycy                                           |
| TST-MH-05 | `safeSend` / unplug                   | P1        | `fixed`     | [`host.test.ts`](../../../../apps/server/src/midi/host.test.ts) — „safeSend keeps process alive…”    |
| TST-MH-06 | `panic()` partial failure             | P2        | `fixed`     | [`host.test.ts`](../../../../apps/server/src/midi/host.test.ts) — mid-flight throw                   |
| TST-MH-07 | `applyPorts` + config-persist boot    | P2        | `confirmed` | Brak integracji w grep                                                                               |

## Limit

TST-MH-04 (P1) + TST-MH-07 (P2) — opcjonalnie; P0 i panic partial domknięte.
