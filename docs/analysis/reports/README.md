# reports/

Kanoniczne raporty analityczne commitowane do repo.

## Konwencja

- Wzorzec nazwy: `report-<temat>.md` (lowercase `kebab-case`)
- Jeden raport = jeden temat produktu / decyzji
- Linki między raportami w tym samym podkatalogu: `./report-<temat>.md`
- Linki między podkatalogami: `../milestones/report-…`, `../current/report-…`

## Podkatalogi

| Katalog | Po co | Przykłady |
|---------|--------|-----------|
| [`current/`](./current/) | Aktywne raporty (bieżący fokus / audyty) | `report-scope-5.4.md`, `report-audit-2026-07-21.md`, `report-build-artifacts-analysis.md` |
| [`milestones/`](./milestones/) | Historyczne etapy α/β/5.0, freeze, QA, parity, beta-gate | `report-scope-alpha8.md`, `report-beta-gate.md`, `report-po-smoke-p8.md` |
| [`hygiene/`](./hygiene/) | Logi przeglądów evening / nightshift | `report-evening-hygiene-2026-07-24.md` |

**Nowe raporty produktowe / bramki** → domyślnie `current/`. Po cutcie etapu przenieś scope/freeze do `milestones/`.

Indeks aktywnych + archiwum potrzebne do bramek: [../README.md](../README.md).
