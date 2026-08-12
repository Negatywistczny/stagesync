> [📦 StageSync](../../../README.md) / [docs](../../README.md) / [standards](../README.md)

# 🔬 analysis/ — Analizy, Raporty i Inspiracje

Trzy typy artefaktów:

| Typ                      | Katalog                                   | Git | Wzorzec nazwy        |
| ------------------------ | ----------------------------------------- | --- | -------------------- |
| Raport kanoniczny        | [`reports/current/`](./reports/README.md) | tak | `report-<temat>.md`  |
| Inspiracja (zewn. audyt) | [`inspiracje/`](./inspiracje/README.md)   | tak | dump + `*.triage.md` |
| Notatka robocza          | [`working/`](./working/README.md)         | nie | `working-<temat>.md` |

Historia wydań / zamkniętych cutów → [CHANGELOG.md](../../../CHANGELOG.md). Bez lokalnego archiwum milestones / hygiene.

## reports/

Finalne dokumenty, do których można linkować z `TODO`, `ROADMAP` i PR. Nowe raporty → **`reports/current/`**.

### Indeks (aktywne)

| Temat                    | Raport                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| **Syllables / residual** | [report-scope-5.4](./reports/current/report-scope-5.4.md)                                 |
| **G1–G10 ops residual**  | [report-beta-gate](./reports/current/report-beta-gate.md)                                 |
| **Dual Engine align**    | [report-adr-dual-engine-vst-align](./reports/current/report-adr-dual-engine-vst-align.md) |

Powiązane: [ui-shell-inventory.md](../../architecture/ui/ui-shell-inventory.md), [ROADMAP.md](../../ROADMAP.md), [TODO.md](../../TODO.md), [ADR 0011](../../architecture/adr/0011-ui-parity-behavior.md).

## inspiracje/

Eksperymentalne audyty zewnętrzne. **Nie są kanonem** — wymagają triage i repro w kodzie. Trzymaj tylko hipotezy wpływające na otwartą / przyszłą pracę.

Inspiracje: [inspiracje/README.md](./inspiracje/README.md).

## working/

Lokalny scratch agenta. Ignorowane przez git.
Po syntezie wnioski przenieś do `reports/current/report-<temat>.md` (albo najpierw `inspiracje/` + triage, jeśli źródło zewnętrzne).

## Zasady dla agentów

1. Potwierdzone wnioski produktowe / bramki → `reports/current/report-<temat>.md` (po zamknięciu tematu usuń; historia → CHANGELOG / git)
2. Surowy audyt zewnętrzny → `inspiracje/` + `*.triage.md` (status dokumentu `open` aż do repro; szczegóły: [inspiracje/README.md](./inspiracje/README.md))
3. Scratch sesji → `working/working-<temat>.md`
4. Inspiracje **nie** idą do CHANGELOG; do TODO dopiero po weryfikacji dysku
