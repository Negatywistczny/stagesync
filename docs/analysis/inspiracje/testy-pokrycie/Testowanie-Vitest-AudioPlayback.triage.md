# Triage: Strategia testów WebAudio (`audioPlayback`)

**Źródło:** [Testowanie-Vitest-AudioPlayback.md](./Testowanie-Vitest-AudioPlayback.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `apps/web` — scheduler odtwarzania zsynchronizowany z transportem SSOT  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Średnia–wysoka (złożoność vs payoff).** ~1500 linii; istnieją `mockAudioContext` i częściowe testy. Dump wskazuje luki: `syncAudioPlayback` release poza `stillNeeded`, fade mid-clip, `ensureHwOutBus`, cue quantization, race `loadAudioBuffer`+`stopEpoch`. Wymaga dyscypliny mocków — ryzyko flaky przy `setTimeout`/AudioParam.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-APB-01 | Pure helpers: `busSoloMutesBus`, `graphKey`, `isClipAudible` — pełne pokrycie | P1 | `hypothesis` | Wydzielić jeśli zagnieżdżone |
| TST-APB-02 | `syncAudioPlayback` — clip poza playhead → `releaseActiveSource` | P1 | `hypothesis` | Mock context + tick advance |
| TST-APB-03 | `startClip` — loop invalid window, fade-in w środku fade-out | P1 | `hypothesis` | Assert `linearRampToValueAtTime` |
| TST-APB-04 | `ensureDestGraph` / `ensureHwOutBus` — HW fail-soft, channel layout | P1 | `hypothesis` | Po 5.3 multi-out |
| TST-APB-05 | Cue samples: quantization, polyphony choke, `playPostStop` | P1 | `hypothesis` | Fake timers next-beat |
| TST-APB-06 | Race: `clearAudioBufferCache` + in-flight load + `stopEpoch` | P0 | `hypothesis` | Deterministyczna kolejność promise |
| TST-APB-07 | Metry `readTrackMeterDb` bez prawdziwego analysera | P2 | `hypothesis` | Stub analyser |

## Kontekst

- SSOT serwer ([ADR 0002](../../../adr/0002-timebase-ssot.md)); bez własnego zegara klienta.
- Powiązane: [Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md](../audyty-silnik/Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md) (`closed` — bugi; ten dump = coverage).

## Następny krok eng

TST-APB-01 + TST-APB-06; unikać testów z prawdziwym `decodeAudioData` w CI.
