# StageSync v5 — Analysis

Dwa typy artefaktow:

| Typ | Katalog | Git | Wzorzec nazwy |
|-----|---------|-----|---------------|
| Raport kanoniczny | `reports/` | tak | `report-<temat>.md` |
| Notatka robocza | `working/` | nie | `working-<temat>.md` |

## reports/

Finalne dokumenty, do ktorych mozna linkowac z `TODO`, `ROADMAP` i PR.

### Indeks etapów (alpha)

| Etap | Scope / freeze | Bramka / QA | Audyt parity |
|------|----------------|-------------|--------------|
| α3–α7 | `report-scope-alphaN` | `report-qa-signoff-alphaN` | — |
| **α8 (code freeze)** | [report-alpha8-code-freeze](./reports/report-alpha8-code-freeze.md) · [scope](./reports/report-scope-alpha8.md) | [parity-blocker](./reports/report-parity-blocker-alpha8.md) · [QA](./reports/report-qa-signoff-alpha8.md) | [gap](./reports/report-v4-v5-gap-audit.md) · [parity A](./reports/report-v4-v5-parity-audit.md) · [ui-diff B](./reports/report-v4-v5-ui-diff-inventory.md) |
| **α9 (wydane)** | [report-scope-alpha9](./reports/report-scope-alpha9.md) | P8 green | residual CL-P0 |
| **β1 (aktywny)** | [report-scope-beta1](./reports/report-scope-beta1.md) | host / Compose / Tauri | feature product → β2 |
| **Audyt 2026-07-21** | [report-audit-2026-07-21](./reports/report-audit-2026-07-21.md) | — | — |

Powiązane: [ui-shell-inventory.md](../ui-shell-inventory.md), [ROADMAP.md](../ROADMAP.md), [TODO.md](../TODO.md), [ADR 0011](../adr/0011-ui-parity-behavior.md).

## working/

Lokalny scratch agenta. Ignorowane przez git.
Po syntezie wnioski przenos do `reports/report-<temat>.md`.

## Zasady dla agentow

1. Nowe wnioski → `reports/report-<temat>.md`
2. Scratch sesji → `working/working-<temat>.md`
