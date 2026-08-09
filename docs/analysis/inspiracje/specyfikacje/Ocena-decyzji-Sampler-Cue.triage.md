# Triage: Ocena decyzji Sampler Cue (CRIT-CSMP-01)

**Źródło:** [Ocena-decyzji-Sampler-Cue.md](./Ocena-decyzji-Sampler-Cue.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** `CueClip.sample` · MVP one-shot/gated · routing Master\|Bus · polyphony · post-stop/panic  
**Data triage:** 2026-07-26  
**Companion:** [Specyfikacja-StageSync-Cues-Sampler.triage.md](./Specyfikacja-StageSync-Cues-Sampler.triage.md) · [#430](https://github.com/Negatywistczny/stagesync/issues/430) · [ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md)

## Werdykt przydatności

**Wysoka — potwierdza model Cue+sample.** KEEP 1/2/4/5 zgodne z companion (`closed` MVP). REVISE routing HW Out w `CueSampleOutputSchema` — **confirmed gap vs ADR multi-out IN**: schema dziś tylko `master`\|`bus` (grep [`schema.ts`](../../../../packages/shared/src/schema.ts)). Polyphony w Zod bez pełnego UI — zgodne z ADR 0011 (nie stubować).

## Macierz

| Nr | Temat | Werdykt | Stan | Notatka |
|----|-------|---------|------|---------|
| 1 | Sample w `CueClip` | KEEP | `on-tree` | Brak osobnego SamplerClip |
| 2 | MVP one-shot/gated; poly Later | KEEP / REVISE schema|UI | `on-tree` / `partial` | `polyphony` w Zod + playback; UI bez atrap |
| 3 | Routing tylko Master\|Bus | REVISE → +`hw_out` | `confirmed` (gap) | Unia ≠ `MixerOutputDest`; gate UI przez `hwOutputUiAllowed` gdy PO otworzy |
| 4 | Tick / next-beat / immediate | KEEP | `on-tree` | |
| 5 | playPostStop + panic ramp | KEEP | `on-tree` | Testy playback |

## Confirmed vs hypothesis

- **On tree:** MVP Sampler (#430 shipped).
- **Confirmed residual:** brak `hw_out` w `CueSampleOutputSchema` przy ADR multi-out IN.
- **Open PO:** GO Pad przy Idle (tylko sample vs start transport); alert banner pulse; pre-buffer na Performerze.

## Następny krok

1. Nie otwierać HW sample routing bez HW Out UI / PO.
2. Companion Sampler zostaje `closed` na MVP; ten triage trzyma residual REVISE-3.
3. Pytania PO 1–4 — bez auto-TODO.
