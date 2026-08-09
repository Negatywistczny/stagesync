# Triage: Strategia testów WebAudio (`audioPlayback`)

**Źródło:** [Testowanie-Vitest-AudioPlayback.md](./Testowanie-Vitest-AudioPlayback.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `apps/web` — [`audioPlayback.ts`](../../../../apps/web/src/lib/audio/audioPlayback.ts)  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage [`audioPlayback.ts`](../../../../apps/web/src/lib/audio/audioPlayback.ts) **75.35%** lines / **70.45%** branches

## Werdykt przydatności

**Średnia.** Faza 4 domknęła release/HW/cue/metry; pozostałe: pełna macierza helperów + mid-fade ramp.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Dowód |
|----|--------|-----------|------|--------|
| TST-APB-01 | Pure helpers `busSoloMutesBus`, `graphKey`, `isClipAudible` | P1 | `confirmed` | Częściowe; pełna macierza z dumpu niezweryfikowana |
| TST-APB-02 | `releaseActiveSource` poza `stillNeeded` | P1 | `fixed` | [`audioPlayback.test.ts`](../../../../apps/web/src/lib/audio/audioPlayback.test.ts) — playhead past clip |
| TST-APB-03 | `startClip` fade mid-clip / invalid loop | P1 | `confirmed` | Brak testów ramp mid-fade-out |
| TST-APB-04 | `ensureHwOutBus` po 5.3 multi-out | P1 | `fixed` | [`audioPlayback.test.ts`](../../../../apps/web/src/lib/audio/audioPlayback.test.ts) — hw_out routing |
| TST-APB-05 | Cue quantization / choke / `playPostStop` | P1 | `fixed` | [`audioPlayback.test.ts`](../../../../apps/web/src/lib/audio/audioPlayback.test.ts) — next-beat + choke |
| TST-APB-06 | Race cache + `stopEpoch` | P0 | `rejected` | „late decode after clearAudioBufferCache…” (L568+) |
| TST-APB-07 | Metry bez analysera | P2 | `fixed` | `readTrackMeterDb` floor + after sync |

## Limit

Lines **75.35%**; TST-APB-01/03 (P1) — macierza helperów i mid-fade-out ramp.
