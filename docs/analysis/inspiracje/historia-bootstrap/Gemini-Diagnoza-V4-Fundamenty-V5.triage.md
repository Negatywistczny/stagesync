# Triage: Gemini — diagnoza v4 → fundamenty v5

**Źródło:** [Gemini-Diagnoza-V4-Fundamenty-V5.md](./Gemini-Diagnoza-V4-Fundamenty-V5.md)  
**Status:** `archive`
**Obszar:** Migracja architektury / SSOT  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Wartość historyczna / provenance.** Diagnoza (storage projektów, takt 1, DS, monorepo, czysty czas, Zod) opisuje decyzje **w większości już wdrożone**. Nie backlog implementacji.

## Co zachować vs overlap

| W dumpie | Stan w repo |
|----------|-------------|
| `library.json` + `projects/<id>/` | ADR 0001 — DONE |
| Takt 1 = start utworu, pre-roll ≤ 0 | ADR 0002 / 0005 — DONE |
| Monorepo + `packages/shared` pure | Konstytucja — DONE |
| Tokeny / 7 stanów Button | `packages/ui` + reguły — DONE |
| Zod fail-fast na krawędziach | Konstytucja — DONE |

## Następny krok

Archiwum provenance — cytować przy onboarding; **nie** implementować dosłownie.
