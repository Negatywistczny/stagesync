# Triage: Audyt edytora ścieżek audio (`audioLaneEdit`)

**Źródło:** [Audyt-Edytora-Sciezek-Audio.md](./Audyt-Edytora-Sciezek-Audio.md) (Gemini Deep Search)  
**Status:** `open`
**Obszar:** Timeline DAW / edycja klipów audio  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Przydatny jako backlog hipotez.** Konkretne symbole (`splitAudioClipAt`, `mapFormaBack`, `tempoCtxAt`) i scenariusze (ticks↔ms, tempoMap) są lepsze niż generyczny AI review. Ton „security / critical crash” zawyżony — nie traktować tabeli BUG-* jako potwierdzonych defektów.

## Priorytet weryfikacji (kolejność)

| ID (raport) | Temat | Impact (jeśli true) | Effort weryfikacji | Stan |
|-------------|--------|---------------------|--------------------|------|
| BUG-01 | Float ticks→ms→ticks → mikroluka 1 tick, Join fails | Wysoki (UX Join/Split) | Test split+join przy BPM niecałkowitym | `hypothesis` |
| BUG-02 | Split bez nieliniowego `tempoMap` → zły `trimInMs` | Wysoki (słyszalny skok) | Test split przez zmianę tempa na klipie | `hypothesis` |
| BUG-03 | `commitResize` + kolizja → brak seed w `mapFormaBack` | Krytyczny (crash UI) | Repro resize w lewo/prawo na sąsiada | `hypothesis` |
| BUG-04 | `gainDb` + NaN z pointera → NaN w projekcie | Średni / data integrity | Test NaN/Infinity w gain gesture | `hypothesis` |
| BUG-05 | Move multi-select bez primary | Średni (UX) | Repro multi-drag | `hypothesis` |
| BUG-06 | Orphan visibility/automation po remove track/bus | Niski–średni | Grep cleanup + fixture | `hypothesis` |

Skrajne BPM/PPQ (MAX_SAFE_INTEGER) — **niski priorytet** względem show-critical 01–03.

## Kontekst konstytucji

- Kanon pozycji: integer **ticks** + PPQ ([ADR 0002](../../../adr/0002-timebase-ssot.md)).
- Edycja klipów: [ADR 0008](../../../adr/0008-timeline-clip-editing.md).
- Po potwierdzeniu: wpis do `TODO.md` (Must/Should) + ewentualnie `reports/report-…` — **nie** CHANGELOG bez fixa.

## Następny krok eng

1. Otwórz issue lub pozycję TODO dopiero po stanie wiersza **`confirmed`** (zielony/czerwony test) na BUG-01…03; potem podnieś status dokumentu do `partial`.
2. Drugi audyt WebAudio (inspiracje lokalne poza repo) — osobny triage, gdy skopiowany.
