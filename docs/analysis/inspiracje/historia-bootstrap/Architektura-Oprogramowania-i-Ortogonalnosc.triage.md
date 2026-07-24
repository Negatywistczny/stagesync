# Triage: Ortogonalność zasad / pace layers

**Źródło:** [Architektura-Oprogramowania-i-Ortogonalnosc.md](./Architektura-Oprogramowania-i-Ortogonalnosc.md)  
**Status:** `archive`
**Obszar:** Architektura / Granica 0 / pace layers  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Przydatny jako język decyzji.** Ortogonalność abstrakcji vs promienia rażenia i „Granica 0 / Immutable Core” dobrze mapuje się na [ADR 0005](../../../adr/0005-domain-axioms.md). Brak actionable bugów — nie implementować dosłownie.

## Co zachować vs overlap

| W dumpie | Stan w repo |
|----------|-------------|
| Aksjomaty domenowe jako Structure/Site | Już: ADR 0005, konstytucja |
| Pace layers / blast radius | Przydatny framing w review ADR |
| Clean Architecture / DDD essay | Generyczny — nie SSOT |

## Następny krok

Archiwum referencyjne — cytować przy dyskusji Granicy 0; **nie** przenosić do TODO.
