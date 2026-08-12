> [📦 StageSync](../../../../README.md) / [docs](../../../README.md) / [standards](../../README.md) / [analysis](../README.md)

# 📊 reports/ — Kanoniczne Raporty Analityczne

Kanoniczne raporty analityczne commitowane do repo. Historia wydań → [CHANGELOG.md](../../../../CHANGELOG.md).

## Konwencja

- Wzorzec nazwy: `report-<temat>.md` (lowercase `kebab-case`)
- Jeden raport = jeden temat produktu / decyzji
- Linki w tym samym katalogu: `./report-<temat>.md`
- Tylko aktywne raporty — bez archiwum milestones / hygiene (git history + CHANGELOG)

## Podkatalog

| Katalog                  | Po co                                            | Przykłady                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`current/`](./current/) | Aktywne raporty (bieżący fokus / bramki otwarte) | [`report-scope-5.4.md`](./current/report-scope-5.4.md), [`report-beta-gate.md`](./current/report-beta-gate.md), [`report-adr-dual-engine-vst-align.md`](./current/report-adr-dual-engine-vst-align.md) |

**Nowe raporty** → zawsze `current/`. Po zamknięciu tematu usuń raport (historia w CHANGELOG / git), nie archiwizuj lokalnie.

Indeks: [../README.md](../README.md).
