# Triage: Strategia testów WebAudio (`audioPlayback`)

**Źródło:** [Testowanie-Vitest-AudioPlayback.md](./Testowanie-Vitest-AudioPlayback.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `apps/web` — `audioPlayback.ts`  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27

## Werdykt przydatności

**Średnia.** Dump nieaktualny względem `audioPlayback.test.ts` (~1000+ linii): sync, cache race, cue, HW — duża część już jest.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Dowód |
|----|--------|-----------|------|--------|
| TST-APB-01 | Pure helpers `busSoloMutesBus`, `graphKey`, `isClipAudible` | P1 | `confirmed` | Częściowe; pełna macierza z dumpu niezweryfikowana |
| TST-APB-02 | `releaseActiveSource` poza `stillNeeded` | P1 | `fixed` | `audioPlayback.test.ts` — playhead past clip |
| TST-APB-03 | `startClip` fade mid-clip / invalid loop | P1 | `confirmed` | Brak testów ramp mid-fade-out |
| TST-APB-04 | `ensureHwOutBus` po 5.3 multi-out | P1 | `fixed` | `audioPlayback.test.ts` — hw_out routing |
| TST-APB-05 | Cue quantization / choke / `playPostStop` | P1 | `fixed` | `audioPlayback.test.ts` — next-beat + choke |
| TST-APB-06 | Race cache + `stopEpoch` | P0 | `rejected` | „late decode after clearAudioBufferCache…” (L568+) |
| TST-APB-07 | Metry bez analysera | P2 | `fixed` | `readTrackMeterDb` floor + after sync |

## Następny krok eng

TST-APB-02/04/05/07 domknięte w fazie 4; TST-APB-03 opcjonalnie.
