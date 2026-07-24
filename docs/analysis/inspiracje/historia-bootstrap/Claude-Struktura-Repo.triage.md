# Triage: Claude — struktura repo (SPA)

**Źródło:** [Claude-Struktura-Repo.md](./Claude-Struktura-Repo.md)  
**Status:** `archive`
**Obszar:** Layout repo / DX  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Niska.** Generyczny układ `src/components|pages|hooks` pod pojedynczą SPA — **superseded** przez realne monorepo (`apps/*`, `packages/*`).

## Co zachować vs overlap

| W dumpie | Stan w repo |
|----------|-------------|
| Drzewo SPA + `docs/adr` | Monorepo już ustalone (konstytucja, root-layout) |
| `userdata` w gitignore | Już: `data/projects/*` |

## Następny krok

Archiwum historyczne — **nie** restrukturyzować pod ten szablon.
