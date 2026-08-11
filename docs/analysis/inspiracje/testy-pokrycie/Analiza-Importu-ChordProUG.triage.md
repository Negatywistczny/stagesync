# Triage: Luki testów importu ChordPro / UG (`ug-import`)

**Źródło:** [Analiza-Importu-ChordProUG.md](./Analiza-Importu-ChordProUG.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `packages/shared` — [`ug-import.ts`](../../../../packages/shared/src/import/ug/ug-import.ts)  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage [`ug-import.ts`](../../../../packages/shared/src/import/ug/ug-import.ts) **93.25%** lines / **84.9%** branches

## Werdykt przydatności

**Średnia.** P1 z fazy 3 domknięte (negatywy regex, `barsPerLine`, merge); pozostałe: macierz `clipsFromOnsets`, corrupt payload schema.

## Priorytety weryfikacji

| ID        | Temat                                         | Priorytet | Stan        | Dowód                                                                                                              |
| --------- | --------------------------------------------- | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| TST-UG-01 | Negatywy `CHORD_TOKEN` / `SECTION_BRACKET`    | P1        | `fixed`     | [`ug-import.test.ts`](../../../../packages/shared/src/import/ug/ug-import.test.ts) — invalid slash/parens          |
| TST-UG-02 | `barsPerLine ≠ 1`, `contentFloorTicks`        | P1        | `fixed`     | [`ug-import.test.ts`](../../../../packages/shared/src/import/ug/ug-import.test.ts) — `barsPerLine: 2`              |
| TST-UG-03 | `clipsFromOnsets` overlapping / empty bar     | P1        | `confirmed` | Częściowe pokrycie chord timing; brak macierzy z dumpu                                                             |
| TST-UG-04 | `reflowUgImportSectionBars` po zmianie metrum | P2        | `fixed`     | [`ug-import.test.ts`](../../../../packages/shared/src/import/ug/ug-import.test.ts) — meter change reflow           |
| TST-UG-05 | `applyUgImportToProject` merge vs replace     | P1        | `fixed`     | [`ug-import.test.ts`](../../../../packages/shared/src/import/ug/ug-import.test.ts) — countdown keep + lane replace |
| TST-UG-06 | `UgImportPayloadSchema` corrupt output        | P1        | `confirmed` | Brak testu parse corrupt                                                                                           |
| TST-UG-07 | `sealAkordyLengths` cross wand                | P2        | `rejected`  | [`ug-import.test.ts`](../../../../packages/shared/src/import/ug/ug-import.test.ts) — test seal lengths             |

## Limit

TST-UG-03/06 (P1) — opcjonalna macierz onsets i corrupt `UgImportPayloadSchema`.
