# StageSync v5 — Analysis

Dwa typy artefaktow:

| Typ | Katalog | Git | Wzorzec nazwy |
|-----|---------|-----|---------------|
| Raport kanoniczny | `reports/` | tak | `report-<temat>.md` |
| Notatka robocza | `working/` | nie | `working-<temat>.md` |

## reports/

Finalne dokumenty, do ktorych mozna linkowac z `TODO`, `ROADMAP` i PR.

### Indeks (aktywne + archiwum potrzebne do bramek)

| Etap | Scope / freeze | Bramka / QA | Audyt parity |
|------|----------------|-------------|--------------|
| α3–α7 | `report-scope-alphaN` | — (zamknięte; historia w CHANGELOG) | — |
| **α8 (freeze)** | [report-alpha8-code-freeze](./reports/report-alpha8-code-freeze.md) · [scope](./reports/report-scope-alpha8.md) | [parity-blocker](./reports/report-parity-blocker-alpha8.md) · [QA](./reports/report-qa-signoff-alpha8.md) | [gap](./reports/report-v4-v5-gap-audit.md) · [parity A](./reports/report-v4-v5-parity-audit.md) · [ui-diff B](./reports/report-v4-v5-ui-diff-inventory.md) |
| **α9** | [report-scope-alpha9](./reports/report-scope-alpha9.md) | [P8 playbook](./reports/report-po-smoke-p8.md) | — |
| **β1** | [report-scope-beta1](./reports/report-scope-beta1.md) · [standalone spike](./reports/report-standalone-spike-beta1.md) | [beta-gate G1–G10](./reports/report-beta-gate.md) | — |
| **β2** | [report-scope-beta2](./reports/report-scope-beta2.md) | [beta-gate](./reports/report-beta-gate.md) (residual operatorski) | — |
| **5.0.0 (Overture)** | [TODO.md](../TODO.md) · [CHANGELOG](../../CHANGELOG.md) | Wydane `v5.0.0`; G1–G10 = ⬜ operator | [report-scope-5.0.0](./reports/report-scope-5.0.0.md) · [report-beta-gate](./reports/report-beta-gate.md) |
| **Audyt 2026-07-21** | [report-audit-2026-07-21](./reports/report-audit-2026-07-21.md) | — | — |

Zamknięte plany PR / QA sign-off α3–α7 / briefy α3–α4 usunięte po cutcie β2 — źródło historii: [CHANGELOG.md](../../CHANGELOG.md) + `report-scope-*`.

Powiązane: [ui-shell-inventory.md](../ui-shell-inventory.md), [ROADMAP.md](../ROADMAP.md), [TODO.md](../TODO.md), [ADR 0011](../adr/0011-ui-parity-behavior.md).

## working/

Lokalny scratch agenta. Ignorowane przez git.
Po syntezie wnioski przenos do `reports/report-<temat>.md`.

## Zasady dla agentow

1. Nowe wnioski → `reports/report-<temat>.md`
2. Scratch sesji → `working/working-<temat>.md`
