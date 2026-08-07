# StageSync v5 — Analysis

Trzy typy artefaktów:

| Typ | Katalog | Git | Wzorzec nazwy |
|-----|---------|-----|---------------|
| Raport kanoniczny | [`reports/`](./reports/README.md) (`current/` · `milestones/` · `hygiene/`) | tak | `report-<temat>.md` |
| Inspiracja (zewn. audyt) | [`inspiracje/`](./inspiracje/README.md) | tak | `Audyt-<Temat>.md` + `Audyt-<Temat>.triage.md` |
| Notatka robocza | [`working/`](./working/README.md) | nie | `working-<temat>.md` |

## reports/

Finalne dokumenty, do których można linkować z `TODO`, `ROADMAP` i PR. Nowe raporty → **`reports/current/`**.

### Indeks (aktywne + archiwum potrzebne do bramek)

| Etap | Scope / freeze | Bramka / QA | Audyt parity |
|------|----------------|-------------|--------------|
| α3–α7 | [report-scope-alpha3](./reports/milestones/report-scope-alpha3.md) · [α4](./reports/milestones/report-scope-alpha4.md) · [α5](./reports/milestones/report-scope-alpha5.md) · [α6](./reports/milestones/report-scope-alpha6.md) · [α7](./reports/milestones/report-scope-alpha7.md) | — (zamknięte; historia w CHANGELOG) | — |
| **α8 (freeze)** | [report-alpha8-code-freeze](./reports/milestones/report-alpha8-code-freeze.md) · [scope](./reports/milestones/report-scope-alpha8.md) | [parity-blocker](./reports/milestones/report-parity-blocker-alpha8.md) · [QA](./reports/milestones/report-qa-signoff-alpha8.md) | [gap](./reports/milestones/report-v4-v5-gap-audit.md) · [parity A](./reports/milestones/report-v4-v5-parity-audit.md) · [ui-diff B](./reports/milestones/report-v4-v5-ui-diff-inventory.md) |
| **α9** | [report-scope-alpha9](./reports/milestones/report-scope-alpha9.md) | [P8 playbook](./reports/milestones/report-po-smoke-p8.md) | — |
| **β1** | [report-scope-beta1](./reports/milestones/report-scope-beta1.md) · [standalone spike](./reports/milestones/report-standalone-spike-beta1.md) | [beta-gate G1–G10](./reports/milestones/report-beta-gate.md) | — |
| **β2** | [report-scope-beta2](./reports/milestones/report-scope-beta2.md) | [beta-gate](./reports/milestones/report-beta-gate.md) (residual operatorski) | — |
| **5.0.0 (Overture)** | [TODO.md](../TODO.md) · [CHANGELOG](../../CHANGELOG.md) | Wydane `v5.0.0`; G1–G10 = operator residual | [report-scope-5.0.0](./reports/milestones/report-scope-5.0.0.md) · [report-beta-gate](./reports/milestones/report-beta-gate.md) |
| **5.4+ (current)** | [report-scope-5.4](./reports/current/report-scope-5.4.md) | — | [report-audit-2026-07-21](./reports/current/report-audit-2026-07-21.md) · [build-artifacts](./reports/current/report-build-artifacts-analysis.md) · [project-summary LLM](./reports/current/report-project-summary-llm.md) |

Zamknięte plany PR / QA sign-off α3–α7 / briefy α3–α4 usunięte po cutcie β2 — źródło historii: [CHANGELOG.md](../../CHANGELOG.md) + `report-scope-*`.

Powiązane: [ui-shell-inventory.md](../ui/ui-shell-inventory.md), [ROADMAP.md](../ROADMAP.md), [TODO.md](../TODO.md), [ADR 0011](../adr/0011-ui-parity-behavior.md).

## inspiracje/

Eksperymentalne audyty zewnętrzne (Deep Search itd.). **Nie są kanonem** — wymagają triage i repro w kodzie.

Inspiracje: [inspiracje/README.md](./inspiracje/README.md) — kategorie `audyty-silnik/`, `referencje-daw/`, `specyfikacje/`, `testy-pokrycie/`, `www/`.

## working/

Lokalny scratch agenta. Ignorowane przez git.
Po syntezie wnioski przenieś do `reports/current/report-<temat>.md` (albo najpierw `inspiracje/` + triage, jeśli źródło zewnętrzne).

## Zasady dla agentów

1. Potwierdzone wnioski produktowe / bramki → `reports/current/report-<temat>.md` (po cutcie etapu → `milestones/`)
2. Surowy audyt zewnętrzny → `inspiracje/` + `*.triage.md` (status dokumentu `open` aż do repro; szczegóły: [inspiracje/README.md](./inspiracje/README.md))
3. Scratch sesji → `working/working-<temat>.md`
4. Inspiracje **nie** idą do CHANGELOG; do TODO dopiero po weryfikacji dysku
