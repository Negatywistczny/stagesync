# Triage: Gemini — diagnoza v4 → fundamenty v5

**Źródło:** [Gemini-Diagnoza-V4-Fundamenty-V5.md](./Gemini-Diagnoza-V4-Fundamenty-V5.md)  
**Status:** `archive`
**Obszar:** Migracja architektury / SSOT  
**Data triage:** 2026-07-24 (closeout vs SSOT)

## Werdykt przydatności

**Provenance fundamentów v5.** Diagnoza storage / takt 1 / monorepo / czysty czas / Zod / DS opisuje decyzje **już wdrożone**. Nie backlog.

## Rozstrzygnięte

| ID | Temat | Stan | Dowód |
|----|--------|------|--------|
| HB-GD-01 | `library.json` + `projects/<id>/` | `fixed` | ADR 0001 |
| HB-GD-02 | Takt 1 = start; pre-roll ≤ 0; ticks+PPQ | `fixed` | ADR 0002 / 0005 |
| HB-GD-03 | Monorepo + `packages/shared` pure | `fixed` | konstytucja / root-layout |
| HB-GD-04 | Tokeny / 7 stanów Button / bez HEX w shellach | `fixed` | `packages/ui` + ui-density |
| HB-GD-05 | Zod fail-fast na krawędziach | `fixed` | konstytucja |
| HB-GD-06 | Dual-write legacy 4.x shapes | `rejected` | konstytucja poza zakresem |

## Następny krok

Brak — onboarding cytuje ADR, nie ten dump.
