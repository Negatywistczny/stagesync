# Triage: Gemini — plan wdrożenia monorepo v5

**Źródło:** [Gemini-Plan-Wdrozenia-Monorepo-V5.md](./Gemini-Plan-Wdrozenia-Monorepo-V5.md)  
**Status:** `archive`
**Obszar:** Bootstrap Turborepo / workflow  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Historyczny checklist bootstrapu** (`create-turbo`, `.cursorrules`, scaffold apps/packages). Fazy 1–3 zasadniczo zrealizowane. Faza 4 („tylko `feat/…`”) **nie** jest aktualnym defaultem: trunk-based = praca na `main`, gałąź/PR tylko na prośbę ([todo-hygiene](../../../../.cursor/rules/todo-hygiene.mdc)).

## Co zachować vs overlap

| W dumpie | Stan w repo |
|----------|-------------|
| Granica 0 w regułach AI | `.cursor/rules/*` (ewolucja `.cursorrules`) |
| Scaffold monorepo | Istnieje |
| Trunk-based wyłącznie przez feat branches | **Outdated** — domyślnie `main` |

## Następny krok

Archiwum historyczne — nie restartować bootstrapu; nie wracać do „feature branch always”.
