# StageSync v5 — Analysis

Dwa typy artefaktow:

| Typ | Katalog | Git | Wzorzec nazwy |
|-----|---------|-----|---------------|
| Raport kanoniczny | `reports/` | tak | `report-<temat>.md` |
| Notatka robocza | `working/` | nie | `working-<temat>.md` |

## reports/

Finalne dokumenty, do ktorych mozna linkowac z `TODO`, `ROADMAP` i PR.

### Indeks etapów (alpha)

| Etap | Scope | Plan implementacji | Audyt | Exec |
|------|-------|-------------------|-------|------|
| α3 (zamknięty) | [report-scope-alpha3](./reports/report-scope-alpha3.md) | [report-implementation-plan-alpha3](./reports/report-implementation-plan-alpha3.md) | — | [report-exec-summary](./reports/report-exec-summary.md) |
| **α4 (bieżący)** | [report-scope-alpha4](./reports/report-scope-alpha4.md) | [report-implementation-plan-alpha4](./reports/report-implementation-plan-alpha4.md) | [report-audit-alpha4](./reports/report-audit-alpha4.md) | [report-exec-summary-alpha4](./reports/report-exec-summary-alpha4.md) |
| Inventarz UI | [report-inventory-delta-alpha3](./reports/report-inventory-delta-alpha3.md) | — | — | — |

Powiązane: [ui-shell-inventory.md](../ui-shell-inventory.md), [ROADMAP.md](../ROADMAP.md), [TODO.md](../TODO.md), [ADR 0008](../adr/0008-timeline-clip-editing.md) (edycja klipów).

## working/

Lokalny scratch agenta. Ignorowane przez git.
Po syntezie wnioski przenos do `reports/report-<temat>.md`.

## Zasady dla agentow

1. Nowe wnioski → `reports/report-<temat>.md`
2. Scratch sesji → `working/working-<temat>.md`
