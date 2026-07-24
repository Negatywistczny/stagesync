# Triage: Audyt routingu miksera StageSync

**Źródło:** [Audyt-Routingu-Miksera-StageSync.md](./Audyt-Routingu-Miksera-StageSync.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Mixer routing / True Balance / schema vs WebAudio / Solo–Mute  
**Data triage:** 2026-07-24  
**Ostatnia aktualizacja:** 2026-07-25 (pierwsza fala: meter + `channelMode`; **nie** pełne domknięcie dumpu)

## Werdykt przydatności

**Wysoka — uzupełnia audyt WebAudio.** Oddziela **bug** (mono import bez `channelMode`, meter za panem) od **świadomego limitu** (bus→tylko Master, brak atrap Out 3–4 — [ADR 0011](../../../adr/0011-ui-parity-behavior.md), [TODO](../../../TODO.md) 5.2+). Dump ma też **interesujące residuale** (Solo×Mute dead state, seek/decode race, Peak Hold) — nie zamykać dokumentu po jednej fali.

## Rozstrzygnięte w tej fali

| ID (dump) | Temat | Stan | Notatka |
|-----------|--------|------|---------|
| DEF-BUG-03 | Peak/VU mono sag przy hard pan | `fixed` | Meter **pre-pan** w `TrackBusMono` (`gain → analyser` ‖ `gain → pan → route`) |
| (schema vs runtime) | `channelMode` undefined → stereo vs mono z importu | `fixed` | `applyDecodedAudioMeta` + `channelCount` ze zdekodowanego bufora stempluje `"mono"` gdy brak trybu; TimelineShell wiring |
| DEF-BUG-01 | True Balance vs equal-power przy mono↔stereo (+3 dB w centrum) | `limit` | Świadome: centrum True Balance = unity; komentarz w `balanceGains` — bez zmiany bez decyzji PO |
| DEF-BUG-02 | Dual-mono downmix +3 dB (`STEREO_DOWNMIX_LINEAR`) | `limit` | Equal-power downmix; skorelowane L=R → +3 dB — komentarz w `mixer-math`; rekomendacja 0,5 (−6 dB) / korelacja = decyzja PO |
| (fail-soft) | `resolveTrackOutputDest` → Master przy złym `busId` | `rejected` | Fail-soft zamierzony; schema `superRefine` na krawędzi |
| DEF-ADR-01 / 02 | Bus→bus / Out 3–4 | `limit` | Limit produktu 5.2+ ([TODO](../../../TODO.md)), nie bug |

## Otwarte / hipotezy z dumpu (nie zweryfikowane w tej fali)

| ID (dump) | Temat | Impact | Stan | Dlaczego ciekawe |
|-----------|--------|--------|------|------------------|
| DEF-BUG-04 | Solo ścieżki + Solo szyny → dead state (cisza) | Wysoki (FOH) | `hypothesis` | `isClipAudible` przepuszcza track solo; `applyBusParams` wycisza szynę docelową spoza `soloBusIds` — UI „solo”, głośniki ciche |
| DEF-BUG-05 | Seek / `SEEK_JUMP` bez re-trigger po async `loadAudioBuffer` | Wysoki (transient) | `hypothesis` | Sync path pomija niecache’owany clip; po decode brak callbacku → cisza do następnego ticka transportu |
| (race UI) | `applyBusParams` GainNode podczas `suppressAudioPlayback` / Pause | Średni (clicks) | `hypothesis` | Dump: trzaski przy szybkiej zmianie faderów tuż po lokalnym stop |
| (Peak Hold) | Race `updatePeakHold` vs clear w RAF | Niski–średni (UI) | `hypothesis` | Krótkie clipy >0 dBFS mogą umknąć między zerowaniem a odczytem analizatora |
| (UX / topologia) | Hierarchia Solo track vs Solo bus (reguła „szyna żyje, gdy ma solo track”) | — | `hypothesis` | Rekomendacja dumpu: nie wyciszać szyny, jeśli `soloTrackIds` routują do niej — wymaga decyzji produktu + test |
| (UX) | Dynamiczny downmix / korelacja fazowa zamiast stałego equal-power | — | `hypothesis` | Alternatywa do limitu DEF-BUG-02; nie implementować bez PO |

## Następny krok eng

1. **Repro Solo dead state** (DEF-BUG-04): Solo Bus A → Solo Track na Bus B → cisza mimo UI solo; potem decyzja: auto-unmute szyny docelowej vs zmiana priorytetu Solo.
2. **Seek + cold buffer** (DEF-BUG-05): jump na niecache’owany WAV podczas Play — czy dźwięk wraca dopiero na tick WS; ewentualny callback po `loadAudioBuffer`.
3. Opcjonalnie smoke: Peak Hold clear vs krótki overshoot; clicks przy faderze tuż po Pause (tylko jeśli FOH zgłosi).
4. **Nie** claim Done / `closed` dopóki Solo×Mute i seek/decode nie mają zielonego/czerwonego testu albo świadomego `rejected`/`limit`.
