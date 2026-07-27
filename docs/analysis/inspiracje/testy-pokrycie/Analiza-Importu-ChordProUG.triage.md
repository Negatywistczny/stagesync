# Triage: Luki testów importu ChordPro / UG (`ug-import`)

**Źródło:** [Analiza-Importu-ChordProUG.md](./Analiza-Importu-ChordProUG.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `packages/shared` — `ug-import.ts`, integracja z Różdżką  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Średnia–wysoka.** Plan testów pure (bez I/O); uzupełnia istniejący `ug-import.test.ts` o negatywy regex, `barsPerLine > 1`, `reflowUgImportSectionBars`, merge vs replace w `applyUgImportToProject`. Nie wskazuje bugów produkcyjnych — tylko hipotezy pokrycia.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-UG-01 | Negatywy `CHORD_TOKEN` / `SECTION_BRACKET` (slash bass, wielokrotne nawiasy) | P1 | `hypothesis` | Czerwony test + `ug-import.test.ts` |
| TST-UG-02 | `barsPerLine ≠ 1`, `contentFloorTicks`, `idPrefix` | P1 | `hypothesis` | Fixture inline ChordPro-lite |
| TST-UG-03 | `clipsFromOnsets` — overlapping, pusty takt, wiele akordów/takt | P1 | `hypothesis` | Macierz sekcja × chord-only × lyric-only |
| TST-UG-04 | `reflowUgImportSectionBars` po zmianie metrum | P2 | `hypothesis` | Po potwierdzeniu TST-UG-02 |
| TST-UG-05 | `applyUgImportToProject` merge vs replace lanes | P1 | `hypothesis` | Dwa projekty seed + assert lane counts |
| TST-UG-06 | `UgImportPayloadSchema` na corrupt parser output | P1 | `hypothesis` | `expect(() => parse).toThrow()` |
| TST-UG-07 | `sealAkordyLengths` po imporcie (wspólny test z wand) | P2 | `hypothesis` | Cross-link [Analiza-Luki-Testow-Wand.triage.md](./Analiza-Luki-Testow-Wand.triage.md) |

## Kontekst

- Pure shared; fail-soft `UgImportResult` — bez claimów parity w CHANGELOG do czasu `confirmed`.
- Powiązane: [Analiza-Luki-Testow-Wand.triage.md](./Analiza-Luki-Testow-Wand.triage.md), [Testy-UG-Fetch.triage.md](./Testy-UG-Fetch.triage.md).

## Następny krok eng

`coverage packages/shared ug-import` → wdrożyć TST-UG-01/02/05 jako pierwszą falę (brak mocków).
