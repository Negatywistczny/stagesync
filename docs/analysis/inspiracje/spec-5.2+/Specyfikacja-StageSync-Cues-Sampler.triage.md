# Triage: Cues Sampler — intro 5.2+ (#430)

**Źródło:** [Specyfikacja-StageSync-Cues-Sampler.md](./Specyfikacja-StageSync-Cues-Sampler.md) (Gemini / AI Exporter)  
**Status:** `open`  
**Obszar:** `CueClip.sample` · WebAudio one-shot/gated · GO pad · format V6  
**Data triage:** 2026-07-25  
**Kąt:** wprowadzenie feature 5.2+ (nie G1–G10)

## Werdykt przydatności

**Wysoka — decyzja modelowa (rozszerzyć `CueClip`, nie osobny `SamplerClip`) + macierz CSMP-REF MVP vs Later.** Zgodna z [#430](https://github.com/Negatywistyczny/stagesync/issues/430) i zakazem stubów Out 3–4. Dump ≠ runtime.

## Epiki / tematy vs `main` (5.1.x)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| Cue tekstowy / stage-cue-banner | `partial` | `CueClipSchema` bez `sample` — banery tak, audio nie |
| CSMP-REF-01…08 MVP (one-shot, gated, tick/beat/immediate, post-stop, panic, Master/Bus) | `hypothesis` | **Confirmed gap** — brak `CueSampleConfig` w schema |
| CSMP-REF-09…12 Later (polyphony, loop, pitch, HW 3–4) | `limit` | Dump: v5.3+ / OUT z Mixer 5.1 |
| Pre-buffer `ensureAudioBuffered` dla cue samples | `hypothesis` | Pipeline audio tracks istnieje; cue sample — nie |
| Inspector + FOH GO pad | `hypothesis` | Brak UI samplera |
| Migracja formatVersion → 6 | `hypothesis` | Wymaga decyzji wersji formatu przy implementacji |

## Confirmed vs hypothesis

- **Confirmed gap:** `CueClipSchema` (grep) — tylko label/roles/priority; brak `sample`.
- Issue [#430](https://github.com/Negatywistyczny/stagesync/issues/430) już w [TODO 5.2+](../../../TODO.md) — bez promocji z dumpu.

## Następny krok eng

Przy starcie: Zod `CueSampleConfig` + playback w `audioPlayback` + Inspector; routing tylko Master\|Bus (jak Mixer 5.1). Nie stubować HW outs.
