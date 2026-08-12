# Triage: Logika edycji klipów (Logic Pro)

**Źródło:** [Logika-Edycji-Klipow-Logic-Pro.md](./Logika-Edycji-Klipow-Logic-Pro.md)  
**Status:** `archive`
**Obszar:** Timeline DAW / snap / drag / overlap  
**Data triage:** 2026-07-24 (zamknięte vs ADR 0007/0008)

## Werdykt przydatności

**Wysoka wartość historyczna / provenance — nie backlog.** Dump zasilił [ADR 0007../../../../architecture/adr/0007-snap-grid.md) / [ADR 0008../../../../architecture/adr/0008-timeline-clip-editing.md). Nie kopiować chrome Logic. Relative snap / Shuffle = odroczone; Flex / Takes / recording — **nie** permanent OUT ([ADR 0015../../../../architecture/adr/0015-daw-reference-and-product-decisions.md)). Logic = pierwsza referencja przy wątpliwości UX.

## Rozstrzygnięte

| ID    | Temat (dump)                                                   | Stan       | Dowód                                                      |
| ----- | -------------------------------------------------------------- | ---------- | ---------------------------------------------------------- |
| LP-01 | Absolute snap                                                  | `fixed`    | `quantizeTicks` — model absolutny (ADR 0007)               |
| LP-02 | Relative snap (offset modulo G)                                | `limit`    | ADR 0007 OUT — po jawnej decyzji PO                        |
| LP-03 | Modyfikatory Control / Control+Shift (finer / ticks / samples) | `limit`    | ADR 0007: tylko Cmd/Ctrl = `off`                           |
| LP-04 | Drag: No Overlap (Tracks Area)                                 | `fixed`    | ADR 0008 §2 — jedyny tryb                                  |
| LP-05 | Drag: Overlap / X-Fade / Shuffle L/R                           | `limit`    | ADR 0008 — odroczone                                       |
| LP-06 | Parametr Inspector „No Overlap” (Score)                        | `rejected` | N/A — brak Score Editor                                    |
| LP-07 | Smart click zones (fade/trim/marquee ½H)                       | `partial`  | ADR 0008 §6 — strefy; fade narożniki produktowo późniejsze |
| LP-08 | Marquee advanced (transient tab, heal, silence paste)          | `limit`    | poza MVP / v4 must                                         |
| LP-09 | Time-stretch Option-drag / Flex Time                           | `limit`    | ADR 0008 — później wg Logic (nie „nigdy”); ADR 0015        |
| LP-10 | MIDI note-off overlap / Take Folders / recording modes         | `limit`    | ADR 0008 — odroczone; MIDI clock ≠ recording               |

## Co wchłonięto do SSOT (ten pass)

- ADR 0007: jawne „kwantyzacja **absolutna**”.
- ADR 0008: terminologia No Overlap (tryb vs Score) + link do dumpu jako inspiracja.

## Następny krok

Brak implementacji z dumpu. Relative snap / dodatkowe drag modes — tylko po decyzji PO w ADR, nie z tego pliku.
