# Triage: GPT — Project Standard / drzewo folderów

**Źródło:** [GPT-Project-Standard.md](./GPT-Project-Standard.md)  
**Status:** `archive`
**Obszar:** Standardy repo / layout  
**Data triage:** 2026-07-24 (closeout vs SSOT)

## Werdykt przydatności

**Niska wartość zmian.** Generyczny „Project Standard” — overlap idei (ADR, docs, CI), konflikt drzewa z StageSync.

## Rozstrzygnięte

| ID | Temat | Stan | Dowód |
|----|--------|------|--------|
| HB-PS-01 | Jednolity PS między projektami | `limit` | StageSync ma własne reguły / konstytucję |
| HB-PS-02 | Proponowane drzewo folderów | `rejected` | Konflikty z `apps/` / `packages/` / root-layout |
| HB-PS-03 | ADR + SemVer + CI jako praktyki | `fixed` | już w repo (własny kształt) |

## Następny krok

Brak — **nie** przebudowywać monorepo pod dump.
