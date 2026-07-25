---
name: triage-verify
description: >-
  Verify hypotheses in docs/analysis/inspiracje *.triage.md — repro or reject,
  update row/document status tokens, promote only confirmed rows to TODO/issues.
  Use when the user runs /triage-next or asks to verify an inspiration audit triage.
disable-model-invocation: true
---

# Triage verify

SSOT statusów: [docs/analysis/inspiracje/README.md](../../../docs/analysis/inspiracje/README.md). Nie wymyślaj synonimów tokenów.

## Wybór pliku

1. Argument użytkownika (`*.triage.md`), **albo**
2. Pierwszy z indeksu w README ze statusem dokumentu `open` lub `partial` (preferuj `audyty-silnik/`).

Ustaw status dokumentu na `in-progress` na start fali (jeśli był `open`).

## Weryfikacja wierszy

Dla ID w stanie `hypothesis` (lub bez kolumny Stan):

1. Grep / read kodu w monorepo.
2. Minimalny test Vitest **lub** LIVE repro gdy test nie wystarczy.
3. Ustaw stan wiersza — **tylko** te tokeny:

| Stan | Kiedy |
|------|--------|
| `confirmed` | Repro lub czerwony test w repo |
| `rejected` | Obalone (zielony test / błędna lektura) |
| `limit` | Świadomy limit produktu (ADR / TODO 5.2+) |
| `fixed` | Potwierdzone + naprawione + test (link commit/PR) |

Przepływ: `hypothesis` → (`confirmed` → `fixed`) | `rejected` | `limit`.

## Status dokumentu

Po fali: `partial` (część priorytetowych ID rozstrzygnięta) albo `closed` (wszystkie priorytetowe).  
`superseded` tylko gdy powstanie `docs/analysis/reports/report-*.md` jako następca.

## Promocja do backlogu

- Do [docs/TODO.md](../../../docs/TODO.md) / GitHub issue **wyłącznie** wiersze `confirmed` (nie cały dump).
- **Nie** linkuj inspiracji z CHANGELOG / claimów Done.
- Ocena tylko w `*.triage.md`, nie w środku surowego dumpa.

## Stop

Brak dowodu → zostaw `hypothesis`; nie zgaduj `confirmed`.
