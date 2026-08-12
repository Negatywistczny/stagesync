> [📦 StageSync](../../../../README.md) / [docs](../../../README.md) / [standards](../../README.md) / [analysis](../README.md)

# 💡 inspiracje/ — Zewnętrzne Audyty i Hipotezy

Zewnętrzne / eksperymentalne audyty i notatki — **hipotezy**, nie SSOT produktu.
Polityka: trzymaj tylko materiał wpływający na otwartą / przyszłą pracę. Historia wydań → [CHANGELOG.md](../../../../CHANGELOG.md).

| Typ           | Plik                   | Git | Rola                                                 |
| ------------- | ---------------------- | --- | ---------------------------------------------------- |
| Surowy raport | `*.md` (bez `.triage`) | tak | Dump z narzędzia (zachowaj provenance)               |
| Triage PO/eng | `*.triage.md`          | tak | Ocena + **status dokumentu** + priorytet weryfikacji |

## Status dokumentu (kanoniczny — tylko te wartości)

Jedno pole w triage: `**Status:** \`…\`` — **wyłącznie** token z tabeli (bez synonimów).

| Status        | Znaczenie                                           | Kiedy ustawić               | Wolno → TODO / issue?                |
| ------------- | --------------------------------------------------- | --------------------------- | ------------------------------------ |
| `open`        | Triage jest; hipotezy **nie** rozstrzygnięte w repo | Domyślnie dla nowego audytu | **Nie** (najpierw repro)             |
| `in-progress` | Trwa weryfikacja                                    | Eng wziął raport na stół    | Nie, dopóki brak `confirmed`         |
| `partial`     | Część ID rozstrzygnięta; reszta otwarta             | Po pierwszej fali testów    | Tylko wiersze `confirmed`            |
| `closed`      | Priorytetowe ID rozstrzygnięte                      | Backlog domknięty           | Tak — przez wcześniejsze `confirmed` |
| `archive`     | Provenance; **nie** backlog                         | Bootstrap wchłonięty w ADR  | **Nie**                              |
| `superseded`  | Zastąpiony `reports/current/report-*.md`            | Po syntezie kanonicznej     | Nie                                  |

## Kategorie

| Katalog                                         | Po co                                  |
| ----------------------------------------------- | -------------------------------------- |
| [`audyty-silnik/`](./audyty-silnik/README.md)   | Audyty kodu (DEFER / partial)          |
| [`referencje-daw/`](./referencje-daw/README.md) | Spec zachowań DAW / show-tools (DEFER) |
| [`specyfikacje/`](./specyfikacje/README.md)     | Hipotezy feature (aktywne)             |

## Zasady

1. **Nie** linkuj inspiracji z CHANGELOG / claimów „Done”.
2. Do [`TODO.md`../../../../TODO.md) / issue tylko hipotezy ze stanem **`confirmed`**.
3. Workflow: dump → triage → weryfikacja → opcjonalnie `reports/current/report-<temat>.md`.
4. Nazwy plików: ASCII. Ocena w `*.triage.md`, nie w dumpie.

## Indeks (aktywne + DEFER)

Szczegóły w README kategorii. Aktywne spece: Smart Tempo / Ingestia / FOH+mixer / roadmap / Safety-Net / Mobile / companiony strategii. Odłożone: Lifecycle + Race, referencje-daw.
