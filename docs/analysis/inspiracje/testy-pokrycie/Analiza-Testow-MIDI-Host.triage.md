# Triage: Luki testów MIDI host (`midi/host`)

**Źródło:** [Analiza-Testow-MIDI-Host.md](./Analiza-Testow-MIDI-Host.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `apps/server` — clock IN/OUT, SPP, PC debounce, panic, `safeSend`  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Wysoka (uzupełnienie, nie duplikat audytu).** Audyt MIDI ([Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md](../audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md)) = `closed` (RSK naprawione). Ten dump = **plan pokrycia** pozostałych gałęzi: clock IN beat boundary, `MAX_CLOCK_BURST`, panic partial failure, `applyPorts` + persist.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-MH-01 | Clock OUT: `emitClocksThrough`, burst cap, seek → SPP+Continue | P0 | `hypothesis` | `createMockMidiBackend` + transport mock |
| TST-MH-02 | Clock IN: 24 ticków → `onBeatToWs`, `inputClockCount` | P0 | `hypothesis` | Fake MIDI input messages |
| TST-MH-03 | PC IN debounce 50 ms latest-wins (timery) | P1 | `hypothesis` | `vi.useFakeTimers` + cleanup `afterEach` |
| TST-MH-04 | Start/Continue/Stop + `lastSppTicks` przy seek+play | P1 | `hypothesis` | Mapa uncovered → test w `host.test.ts` |
| TST-MH-05 | `safeSend` / unplug → `lastError`, brak crash | P1 | `confirmed` częściowo | Audyt RSK-MIDI-06 `fixed` — rozszerzyć scenariusze |
| TST-MH-06 | `panic()` 16×CC — partial failure | P2 | `hypothesis` | Mock backend throw co 2. kanał |
| TST-MH-07 | `applyPorts` + boot z `config-persist` | P2 | `hypothesis` | Integration z istniejącym persist test |

## Kontekst

- SSOT transport ([ADR 0002](../../../adr/0002-timebase-ssot.md)); PC/debounce ([ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md)).
- `isMidiOutAllowed` / Safety Net — testować przy TST-MH-01.

## Następny krok eng

Fala 1: TST-MH-01/02 w `host.test.ts`; fake timers dla TST-MH-03.
