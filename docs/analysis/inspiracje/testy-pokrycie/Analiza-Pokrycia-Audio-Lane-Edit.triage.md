# Triage: Luki testów edycji audio lane (`audioLaneEdit`)

**Źródło:** [Analiza-Pokrycia-Audio-Lane-Edit.md](./Analiza-Pokrycia-Audio-Lane-Edit.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `apps/web` — pure transforms ścieżek audio (trim/fade/split/join/bus)  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Wysoka (uzupełnienie audytu bugów).** Audyt edytora ([Audyt-Edytora-Sciezek-Audio.triage.md](../audyty-silnik/Audyt-Edytora-Sciezek-Audio.triage.md)) = `closed` (BUG-01–05 `fixed`). Ten dump = **plan pokrycia testami** negatywów: `joinAdjacent` gap/asset mismatch, `MAX_AUDIO_BUSSES`, `wouldCreateBusCycle`, `placeImportedAudioClipAt` clamp, `applyAbutCrossfadeForClip`.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-ALE-01 | `joinAdjacentAudioClips` — różne `assetId`, gap, okno źródłowe >1.5 ms | P1 | `hypothesis` | Negatywy po fix BUG-01 |
| TST-ALE-02 | `splitAudioClipAt` — edge start/end, brak `durationMs` | P1 | `hypothesis` | Po fix BUG-02 |
| TST-ALE-03 | `addAudioBus` / `MAX_AUDIO_BUSSES` (16) → `RangeError` | P1 | `hypothesis` | |
| TST-ALE-04 | `setAudioBusOutput` + `wouldCreateBusCycle` (A→B→C→A) | P0 | `hypothesis` | DAG mixer |
| TST-ALE-05 | `placeImportedAudioClipAt` — clamp countdown, invalid duration | P1 | `hypothesis` | |
| TST-ALE-06 | `applyAbutCrossfadeForClip` — brak sąsiada, clamp fade | P2 | `hypothesis` | Parity content lane |
| TST-ALE-07 | `setAudioTrackOutput` — nieistniejący bus/hw | P1 | `hypothesis` | Po 5.3 HW out |

## Kontekst

- [ADR 0008](../../../adr/0008-timeline-clip-editing.md); tempo map w split/join.
- Gest preview/commit — granica z `timelineGesture.ts`; testować pure commit helpers.

## Następny krok eng

`coverage apps/web audioLaneEdit` → TST-ALE-04 + TST-ALE-01.
