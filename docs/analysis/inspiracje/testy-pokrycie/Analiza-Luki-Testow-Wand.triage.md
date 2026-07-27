# Triage: Luki testów Różdżki (`wand`)

**Źródło:** [Analiza-Luki-Testow-Wand.md](./Analiza-Luki-Testow-Wand.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `packages/shared` — `placeContentFromForma`, warstwy A–F / L, tryb `both`  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Wysoka.** `wand.test.ts` obszerny, ale >50 uncovered lines wg dumpu — głównie Layer C (gap/subsection), Layer F (weight ratio), scope `sectionIds`, tryb `both`, countdown protection. Pure functions — niski koszt wdrożenia.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-WND-01 | Macierz scenariusz × mode (tekst/akordy/both) × `approximate` | P1 | `hypothesis` | Tabela z dumpu → `it.each` |
| TST-WND-02 | Pusta Forma, scope `sectionIds`, multi Verse/Chorus | P1 | `hypothesis` | `createProjectV5Seed` + minimal lines |
| TST-WND-03 | `TEXT_WEIGHT_RATIO_THRESHOLD` — krótka ostatnia linia | P2 | `hypothesis` | Layer F edge |
| TST-WND-04 | Countdown clips — brak przesunięcia (`vl-cd-*`, ticks ≤ 0) | P0 | `hypothesis` | Regresja parity v4 |
| TST-WND-05 | Fail-soft: wszystkie ścieżki `ok: false` bez throw | P1 | `hypothesis` | `expect(result.ok).toBe(false)` |
| TST-WND-06 | `sealAkordyLengths` po ug-import | P2 | `hypothesis` | Wspólny test z [Analiza-Importu-ChordProUG.triage.md](./Analiza-Importu-ChordProUG.triage.md) |

## Kontekst

- Forma nie mutowana; czas przez `resolveMeterAt` — [ADR 0002](../../../adr/0002-timebase-ssot.md).
- Property-based (opcjonalnie w dumpie) — odłożyć po TST-WND-01.

## Następny krok eng

`coverage packages/shared wand` → TST-WND-04 + TST-WND-01 jako pierwsza fala.
