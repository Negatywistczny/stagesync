# Triage: Claude — struktura repo (SPA)

**Źródło:** [Claude-Struktura-Repo.md](./Claude-Struktura-Repo.md)  
**Status:** `archive`
**Obszar:** Layout repo / DX  
**Data triage:** 2026-07-24 (closeout vs SSOT)

## Werdykt przydatności

**Niska — superseded przez monorepo.** Generyczny układ SPA `src/components|pages|hooks` nie opisuje StageSync v5.

## Rozstrzygnięte

| ID | Temat | Stan | Dowód |
|----|--------|------|--------|
| HB-CL-01 | Drzewo pojedynczej SPA | `rejected` | `apps/*` + `packages/*` + root-layout |
| HB-CL-02 | `docs/adr` w repo | `fixed` | `docs/adr/` (nie w kształcie SPA dumpa) |
| HB-CL-03 | Userdata / uploads w gitignore | `fixed` | `data/projects/*` (+ gitkeep) — ADR 0001 |

## Następny krok

Brak — **nie** restrukturyzować pod szablon SPA.
