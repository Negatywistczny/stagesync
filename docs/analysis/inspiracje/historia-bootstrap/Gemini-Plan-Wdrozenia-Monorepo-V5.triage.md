# Triage: Gemini — plan wdrożenia monorepo v5

**Źródło:** [Gemini-Plan-Wdrozenia-Monorepo-V5.md](./Gemini-Plan-Wdrozenia-Monorepo-V5.md)  
**Status:** `archive`
**Obszar:** Bootstrap Turborepo / workflow  
**Data triage:** 2026-07-24 (closeout vs SSOT)

## Werdykt przydatności

**Historyczny checklist bootstrapu** (create-turbo, scaffold, Granica 0). Fazy 1–3 zrealizowane. Faza 4 („tylko `feat/…`”) **przestarzała**.

## Rozstrzygnięte

| ID | Temat | Stan | Dowód |
|----|--------|------|--------|
| HB-GP-01 | Scaffold apps/server, web, shared, ui, docs/adr | `fixed` | monorepo live |
| HB-GP-02 | Granica 0 w regułach AI | `fixed` | `.cursor/rules/*` (ewolucja `.cursorrules`) |
| HB-GP-03 | SemVer / alpha start | `fixed` | versioning.mdc |
| HB-GP-04 | Trunk = zawsze gałąź `feat/…` + święte main | `rejected` | todo-hygiene: domyślnie `main` |
| HB-GP-05 | Restart `create-turbo` / rename legacy | `rejected` | bootstrap zakończony |

## Następny krok

Brak — nie wracać do „feature branch always”.
