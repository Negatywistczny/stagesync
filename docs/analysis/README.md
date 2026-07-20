# StageSync v5 — Analysis

Dwa typy artefaktow:

| Typ | Katalog | Git | Wzorzec nazwy |
|-----|---------|-----|---------------|
| Raport kanoniczny | `reports/` | tak | `report-<temat>.md` |
| Notatka robocza | `working/` | nie | `working-<temat>.md` |

## reports/

Finalne dokumenty, do ktorych mozna linkowac z `TODO`, `ROADMAP` i PR.

## working/

Lokalny scratch agenta. Ignorowane przez git.
Po syntezie wnioski przenos do `reports/report-<temat>.md`.

## Zasady dla agentow

1. Nowe wnioski → `reports/report-<temat>.md`
2. Scratch sesji → `working/working-<temat>.md`
