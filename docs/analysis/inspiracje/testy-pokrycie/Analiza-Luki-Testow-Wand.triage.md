# Triage: Luki testów Różdżki (`wand`)

**Źródło:** [Analiza-Luki-Testow-Wand.md](./Analiza-Luki-Testow-Wand.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `packages/shared` — `wand.ts`  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27

## Werdykt przydatności

**Średnia.** Dump przecenia luki — `wand.test.ts` (~950 linii) już pokrywa countdown, scope, both, approximate, layer C.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Dowód |
|----|--------|-----------|------|--------|
| TST-WND-01 | Macierz scenariusz × mode × `approximate` | P1 | `rejected` | Wiele testów `approximate` + `both` mode (L202+, L846+) |
| TST-WND-02 | Pusta Forma, scope `sectionIds` | P1 | `rejected` | „scopes placement to selected Forma section ids” (L273) |
| TST-WND-03 | `TEXT_WEIGHT_RATIO_THRESHOLD` edge | P2 | `fixed` | `wand.test.ts` — Layer F uneven lines |
| TST-WND-04 | Countdown clips nieprzesuwane | P0 | `rejected` | Test vl-cd-2 + skip countdown akordy (L250+, L894) |
| TST-WND-05 | Fail-soft `ok: false` bez throw | P1 | `fixed` | `wand.test.ts` — ok:false matrix |
| TST-WND-06 | `sealAkordyLengths` z ug-import | P2 | `rejected` | Pokryte w `ug-import.test.ts` |

## Następny krok eng

TST-WND-03/05 domknięte w fazie 3.
