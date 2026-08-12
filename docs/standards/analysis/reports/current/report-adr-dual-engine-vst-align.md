# Report: Align ADR Dual Engine + VST Freeze

**Data:** 2026-08-09  
**Status:** Done (docs only — nie claim wdrożenia 6.0)  
**PO:** 1A (sandbox Plugin Host + Freeze) · 2A (nowy ADR 0019)

## Konflikt

| Źródło                      | Twierdzenie                                                              |
| --------------------------- | ------------------------------------------------------------------------ |
| ROADMAP / dump strategiczny | Dual Engine; VST/AU + Freeze przed Live                                  |
| ADR 0018 (przed amendem)    | Zakaz ładowania VST; fokus 6.0 = tylko standalone; brak SSOT Dual Engine |
| ADR 0017 / 0018 §5          | „Prosta edycja” bez precyzyjnego IN/OUT                                  |

## Decyzje

1. **Zero-Crash:** zakaz **in-process** VST/AU/CLAP (Node, Tauri Rust, WebView) zostaje.
2. **Plugin Host:** osobny sandboxowany sidecar **tylko w Studio**; Live = zamrożone WAV + WebAudio + MIDI do standalone.
3. **Dual Engine:** nowy [ADR 0019../../../../architecture/adr/0019-dual-engine-studio-live.md) — SSOT trybów, Freeze gate, Lock Lane, PIN reuse 0017.
4. **Prosta edycja 6.0:** tabela IN/OUT w [ADR 0018../../../../architecture/adr/0018-future-audio-architecture.md) §5.

## Zmienione pliki

| Plik                                                                                                                             | Zmiana                                      |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [`docs/adr/0019-dual-engine-studio-live.md`../../../../architecture/adr/0019-dual-engine-studio-live.md)                         | **Nowy** — Dual Engine                      |
| [`docs/adr/0018-future-audio-architecture.md`../../../../architecture/adr/0018-future-audio-architecture.md)                     | Amend Zero-Crash, filar 4, §5 IN/OUT, §6/§7 |
| [`docs/adr/README.md`../../../../architecture/adr/README.md)                                                                     | Indeks 0019                                 |
| [`docs/adr/0008-timeline-clip-editing.md`../../../../architecture/adr/0008-timeline-clip-editing.md)                             | Cross-link 6.0 / 0018 / 0019                |
| [`docs/adr/0015-daw-reference-and-product-decisions.md`../../../../architecture/adr/0015-daw-reference-and-product-decisions.md) | Cross-link                                  |
| [`docs/adr/0017-live-show-control-contracts.md`../../../../architecture/adr/0017-live-show-control-contracts.md)                 | Dual Engine + PIN reuse                     |
| [`docs/ARCHITECTURE.md`../../../architecture/ARCHITECTURE.md)                                                                    | Wskaźnik 0019                               |
| [`docs/ROADMAP.md`../../../../ROADMAP.md)                                                                                        | Język 6.0 Live Suite + Dual Engine          |
| [`docs/TODO.md`../../../../TODO.md)                                                                                              | Pozycja 6.0.0 + residual numeracji 6.1      |
| `…/analiza-produktowo-wdrozeniowa-stagesync-roadmap.triage.md`                                                                   | RM-08/09 → `adr`                            |

## Poza zakresem

- Kod aplikacji / CHANGELOG
- Pełny rewrite numeracji 6.1+ DMX vs Karaoke / linii 7.x

## Następny krok produktowy

`report-scope-6.0` + akceptacja PO **przed** implementacją filarów / Plugin Host.
