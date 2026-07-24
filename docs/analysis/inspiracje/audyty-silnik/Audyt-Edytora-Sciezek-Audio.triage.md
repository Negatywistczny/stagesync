# Triage: Audyt edytora ścieżek audio (`audioLaneEdit`)

**Źródło:** [Audyt-Edytora-Sciezek-Audio.md](./Audyt-Edytora-Sciezek-Audio.md) (Gemini Deep Search)  
**Status:** `closed`
**Obszar:** Timeline DAW / edycja klipów audio  
**Data triage:** 2026-07-24 (smoke + fix)

## Werdykt przydatności

**Wysoka — actionable.** Symbole i scenariusze pokrywały się z realnymi lukami (`mapFormaBack` vs `-r`, `ticksToMs` bez `tempoMap`, multi-move early-return). Ton „security / critical” zawyżony, ale 01–05 potwierdzone testami; 06 odrzucone.

## Rozstrzygnięte

| ID | Temat | Stan | Dowód / fix |
|----|--------|------|-------------|
| BUG-01 | Float ticks↔ms → Join fails | `fixed` | Join tolerancja 1.5 ms + split map-aware; test split+join |
| BUG-02 | Split bez `tempoMap` → zły `trimInMs` | `fixed` | `ticksToMsAlongTempoMap` w `splitAudioClipAt` |
| BUG-03 | `commitResize` + split sąsiada → brak seed | `fixed` | `resolveSplitParentId` w `mapFormaBack` (+ `-r-N`) |
| BUG-04 | `gainDb` / NaN z pointera | `fixed` | Guard w `gainDbFromPointerDelta` + `setAudioClipGainDb` |
| BUG-05 | Multi-move bez primary w `moveIds` | `fixed` | Merge primary przed early-return `length <= 1` |
| BUG-06 | Orphan visibility / automation po remove | `rejected` | Visibility: `ensureAudioTrackVisibility` w shell; brak automation w schema |

## Kontekst konstytucji

- Ticks + PPQ: [ADR 0002](../../../adr/0002-timebase-ssot.md); edycja: [ADR 0008](../../../adr/0008-timeline-clip-editing.md).

## Następny krok

Brak — dokument zamknięty. Dump zostaje jako provenance.
