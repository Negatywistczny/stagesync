# Triage: Struktura projektu aplikacji webowej (monorepo vs polyrepo)

**Źródło:** [Struktura-Projektu-Aplikacji-Webowej.md](./Struktura-Projektu-Aplikacji-Webowej.md)  
**Status:** `archive`
**Obszar:** Strategia repo / lifecycle  
**Data triage:** 2026-07-24 (closeout vs SSOT)

## Werdykt przydatności

**Niska operacyjnie.** Esej monorepo vs polyrepo + generyczny DS/SemVer — StageSync **już jest monorepo** z własnym DS.

## Rozstrzygnięte

| ID | Temat | Stan | Dowód |
|----|--------|------|--------|
| HB-ST-01 | Wybór monorepo | `fixed` | monorepo live |
| HB-ST-02 | Idealne drzewo katalogów z eseju | `rejected` | root-layout / konstytucja |
| HB-ST-03 | SemVer + Conventional Commits | `fixed` | versioning + commitlint (własny kształt) |
| HB-ST-04 | Semantic color / Button states z eseju | `partial` | `docs/ui/*` + 7 stanów — **nie** kopiować palety z dumpu |
| HB-ST-05 | `.gitkeep` + ignore runtime data | `fixed` | ADR 0001 |

## Następny krok

Brak — nie zmieniać layoutu / DS pod ten raport.
