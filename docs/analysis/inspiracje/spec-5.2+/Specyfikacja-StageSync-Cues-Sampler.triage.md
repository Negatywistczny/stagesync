# Triage: Cues Sampler — intro 5.2+ (#430)

**Źródło:** [Specyfikacja-StageSync-Cues-Sampler.md](./Specyfikacja-StageSync-Cues-Sampler.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** `CueClip.sample` · WebAudio one-shot/gated · GO pad · format V6  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (MVP sample on tree; formatVersion stays 5)  
**Kąt:** wprowadzenie feature 5.2+ (nie G1–G10)

## Werdykt przydatności

**Wysoka — decyzja modelowa (rozszerzyć `CueClip`, nie osobny `SamplerClip`) + macierz CSMP-REF MVP vs Later.** Zgodna z [#430](https://github.com/Negatywistyczny/stagesync/issues/430) i zakazem stubów Out 3–4. Dump ≠ runtime.

## Epiki / tematy vs `main`

| ID / temat | Stan | Notatka |
|------------|------|---------|
| Cue tekstowy / stage-cue-banner | `on-tree` | Bez zmian |
| CSMP-REF-01…08 MVP (one-shot, gated, tick/beat/immediate, post-stop, panic, Master/Bus) | `on-tree` | `CueSampleConfig` + playback + Inspector GO; panic via suppress; **bez** bump `formatVersion` (opcjonalne pole na v5) |
| CSMP-REF-09…12 Later (polyphony polish, loop, pitch, HW 3–4) | `limit` / **skip** | polyphony choke/retrigger w modelu; loop/pitch/HW OUT |
| Pre-buffer dla cue samples | `on-tree` | `ensureAudioBuffered` skanuje `cue.clips[].sample` |
| Inspector + FOH GO pad | `on-tree` | Inspector Sampler + GO |
| Migracja formatVersion → 6 | **skip** | Hipoteza dumpu — opcjonalne `sample` na v5 wystarcza (wstecznie kompatybilne) |

## Confirmed vs hypothesis

- **On tree:** `CueClip.sample` Zod + WebAudio Master\|Bus + Inspector.
- **Justified skip:** formatVersion 6; HW outs; pełna polyphony/loop/pitch.
- **→ TODO:** pozycja #430 usunięta po ship; residual Later w tym triage.

## Następny krok eng

Safety Net (#437) albo residual Mixer HW multi-out gdy `maxChannelCount` ≥ 4.
