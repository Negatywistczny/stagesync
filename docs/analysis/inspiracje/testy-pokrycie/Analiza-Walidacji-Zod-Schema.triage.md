# Triage: Luki testów walidacji Zod (`schema`)

**Źródło:** [Analiza-Walidacji-Zod-Schema.md](./Analiza-Walidacji-Zod-Schema.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `packages/shared` — `schema.ts`, fail-fast na krawędziach  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Wysoka (korupcja / bezpieczeństwo).** >50 schematów; `schema.test.ts` = głównie happy path. Dump systematyzuje negatywy: Project V1–V5 upgrade, `busGraphHasCycle`, `refineMeterForPpq`, `CueSampleConfigSchema`, API bodies — priorytet P0 przed kosmetyką.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-ZOD-01 | `busGraphHasCycle` / `MixerOutputDestSchema` — cykl bus→bus | P0 | `hypothesis` | Minimalny graf 3 węzły |
| TST-ZOD-02 | `refineMeterForPpq` — niespójne metrum vs PPQ | P0 | `hypothesis` | |
| TST-ZOD-03 | Project V2–V5 — ujemne `startTicks` (poza countdown), invalid `meterMap` | P0 | `hypothesis` | Raw objects, nie tylko seed |
| TST-ZOD-04 | `PutProjectBodySchema` / `BatchMidiPcBodySchema` — required/optional | P1 | `hypothesis` | |
| TST-ZOD-05 | `CueSampleConfigSchema` + cross-field z assetId | P1 | `hypothesis` | Po sampler 5.2 |
| TST-ZOD-06 | Setlist `preprocess` — koercja legacy | P2 | `hypothesis` | |
| TST-ZOD-07 | Grupowanie describe per domena (uniknąć 50× duplikacji) | P2 | `limit` | Meta — refaktor test file |

## Kontekst

- Zod fail-fast — [konstytucja](../../../.cursor/rules/constitution.mdc).
- Pure — brak mocków; duże fixture projectów = utrzymanie.

## Następny krok eng

Fala P0: TST-ZOD-01/02/03 w `schema.test.ts`; tabela schema→invalid payload z dumpu.
