# Triage: Ortogonalność zasad / pace layers

**Źródło:** [Architektura-Oprogramowania-i-Ortogonalnosc.md](./Architektura-Oprogramowania-i-Ortogonalnosc.md)  
**Status:** `archive`
**Obszar:** Architektura / Granica 0 / pace layers  
**Data triage:** 2026-07-24 (closeout vs SSOT)

## Werdykt przydatności

**Język decyzji — wchłonięty.** Ortogonalność / blast radius / Immutable Core → [ADR 0005](../../../adr/0005-domain-axioms.md). Brak actionable bugów.

## Rozstrzygnięte

| ID | Temat | Stan | Dowód |
|----|--------|------|--------|
| HB-OR-01 | Aksjomaty jako Structure/Site (Granica 0) | `fixed` | ADR 0005 + konstytucja |
| HB-OR-02 | Pace layers (Stuff…Site) | `fixed` | ADR 0005 mapa |
| HB-OR-03 | Clean Architecture / DDD essay jako SSOT | `rejected` | framing only; nie checklista kodu |
| HB-OR-04 | Hexagon „na zapas” przed 2. adapterem | `limit` | ADR 0005: ports gdy >1 adapter |

## Następny krok

Brak — cytować ADR 0005, nie ten esej.
