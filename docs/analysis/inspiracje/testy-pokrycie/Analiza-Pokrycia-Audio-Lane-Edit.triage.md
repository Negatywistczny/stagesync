# Triage: Luki testów edycji audio lane (`audioLaneEdit`)

**Źródło:** [Analiza-Pokrycia-Audio-Lane-Edit.md](./Analiza-Pokrycia-Audio-Lane-Edit.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `apps/web` — [`audioLaneEdit.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.ts)  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage [`audioLaneEdit.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.ts) **97.17%** lines / **80.73%** branches

## Werdykt przydatności

**Średnia–wysoka.** P0 bus cycle + limit busów domknięte; pozostałe: split edges, countdown clamp, crossfade negatywy.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Dowód |
|----|--------|-----------|------|--------|
| TST-ALE-01 | `joinAdjacent` — asset/gap/window mismatch | P1 | `fixed` | [`audioLaneEdit.test.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.test.ts) — assetId/gap rejects |
| TST-ALE-02 | `splitAudioClipAt` edges | P1 | `confirmed` | Split/join happy path; brak start/end/no durationMs |
| TST-ALE-03 | `MAX_AUDIO_BUSSES` → `RangeError` | P1 | `fixed` | [`audioLaneEdit.test.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.test.ts) — limit 16 |
| TST-ALE-04 | `wouldCreateBusCycle` A→B→C→A | P0 | `fixed` | [`audioLaneEdit.test.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.test.ts) — A→B→C→A cycle |
| TST-ALE-05 | `placeImportedAudioClipAt` clamp | P1 | `confirmed` | Brak testu countdown clamp |
| TST-ALE-06 | `applyAbutCrossfadeForClip` | P2 | `confirmed` | Brak negatywów sąsiada/clamp |
| TST-ALE-07 | `setAudioTrackOutput` stale bus/hw | P1 | `fixed` | [`audioLaneEdit.test.ts`](../../../../apps/web/src/lib/audio/audioLaneEdit.test.ts) — stale ids |

## Limit

TST-ALE-02/05 (P1) + TST-ALE-06 (P2) — opcjonalnie; P0 i większość P1 domknięta.
