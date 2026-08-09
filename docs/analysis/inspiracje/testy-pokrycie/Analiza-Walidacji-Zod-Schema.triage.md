# Triage: Luki testów walidacji Zod (`schema`)

**Źródło:** [Analiza-Walidacji-Zod-Schema.md](./Analiza-Walidacji-Zod-Schema.md) (Gemini Deep Search)  
**Status:** `closed`  
**Obszar:** `packages/shared` — [`schema.ts`](../../../../packages/shared/src/schema.ts), fail-fast na krawędziach  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage [`schema.ts`](../../../../packages/shared/src/schema.ts) **85.66%** lines / **81.81%** branches

## Werdykt przydatności

**Średnia.** P0/P1 domknięte (fixed lub rejected); TST-ZOD-07 = meta refaktor (`limit`).

## Priorytety weryfikacji

| ID         | Temat                                                                    | Priorytet | Stan       | Dowód                                                                                                                    |
| ---------- | ------------------------------------------------------------------------ | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| TST-ZOD-01 | `busGraphHasCycle` / cykl bus→bus w `ProjectSchema`                      | P0        | `rejected` | [`mixer-routing.test.ts`](../../../../packages/shared/src/mixer-routing.test.ts) — „rejects cycle on project”            |
| TST-ZOD-02 | `refineMeterForPpq` — metrum vs PPQ                                      | P0        | `rejected` | [`schema.test.ts`](../../../../packages/shared/src/schema.test.ts) — „rejects meters that yield non-integer ticksPerBar” |
| TST-ZOD-03 | Project V2–V5 — ujemne `startTicks` (poza countdown), invalid `meterMap` | P0        | `fixed`    | [`schema.test.ts`](../../../../packages/shared/src/schema.test.ts) — FormaClip countdown + meterMap reject               |
| TST-ZOD-04 | `PutProjectBodySchema` / `BatchMidiPcBodySchema` edges                   | P1        | `fixed`    | [`schema.test.ts`](../../../../packages/shared/src/schema.test.ts) — stale bus/hw PUT body                               |
| TST-ZOD-05 | `CueSampleConfigSchema` + cross-field assetId                            | P1        | `rejected` | [`schema.test.ts`](../../../../packages/shared/src/schema.test.ts) — „accepts Cue sample config and rejects stale…”      |
| TST-ZOD-06 | Setlist `preprocess` — koercja legacy                                    | P2        | `rejected` | [`schema.test.ts`](../../../../packages/shared/src/schema.test.ts) — `SetlistSchema coerces projectIds ↔ items`          |
| TST-ZOD-07 | Grupowanie describe per domena                                           | P2        | `limit`    | Meta — refaktor pliku testowego                                                                                          |

## Limit

TST-ZOD-07 opcjonalny refaktor; brak otwartych `confirmed` P0/P1.
