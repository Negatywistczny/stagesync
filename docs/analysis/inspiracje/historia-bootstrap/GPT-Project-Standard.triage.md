# Triage: GPT — Project Standard / drzewo folderów

**Źródło:** [GPT-Project-Standard.md](./GPT-Project-Standard.md)  
**Status:** `archive`
**Obszar:** Standardy repo / layout  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Częściowy overlap, niska wartość zmian.** Generyczny „Project Standard” i drzewo katalogów — część idei (ADR, docs, CI) już w StageSync; **nie** przebudowywać monorepo pod ten szablon.

## Co zachować vs overlap

| W dumpie | Stan w repo |
|----------|-------------|
| Jednolity PS między projektami | StageSync ma własne reguły |
| Proponowane drzewo folderów | Konflikty z `apps/` / `packages/` / root-layout |

## Następny krok

Archiwum referencyjne — **nie** restrukturyzować pod dump.
