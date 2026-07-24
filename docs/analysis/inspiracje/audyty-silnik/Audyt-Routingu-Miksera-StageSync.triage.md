# Triage: Audyt routingu miksera StageSync

**Źródło:** [Audyt-Routingu-Miksera-StageSync.md](./Audyt-Routingu-Miksera-StageSync.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Mixer routing / True Balance / schema vs WebAudio / Solo–Mute  
**Data triage:** 2026-07-24  
**Ostatnia aktualizacja:** 2026-07-25 (DEF-BUG-05 fixed w fali WebAudio; Solo×Mute / Peak Hold nadal otwarte)

## Werdykt przydatności

**Wysoka — uzupełnia audyt WebAudio.** Oddziela **bug** (mono import bez `channelMode`, meter za panem) od **świadomego limitu** (bus→tylko Master, brak atrap Out 3–4 — [ADR 0011](../../../adr/0011-ui-parity-behavior.md), [TODO](../../../TODO.md) 5.2+). Seek/cold-buffer (DEF-BUG-05) domknięty w [WebAudio triage](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md). Residual: Solo×Mute dead state, Peak Hold, fader×suppress.

## Rozstrzygnięte

| ID (dump) | Temat | Stan | Notatka |
|-----------|--------|------|---------|
| DEF-BUG-03 | Peak/VU mono sag przy hard pan | `fixed` | Meter **pre-pan** w `TrackBusMono` (`gain → analyser` ‖ `gain → pan → route`) |
| (schema vs runtime) | `channelMode` undefined → stereo vs mono z importu | `fixed` | `applyDecodedAudioMeta` + `channelCount` ze zdekodowanego bufora stempluje `"mono"` gdy brak trybu; TimelineShell wiring |
| DEF-BUG-05 | Seek / cold buffer bez re-trigger po decode | `fixed` | `lastSyncArgs` + re-`startClip` po `loadAudioBuffer` ([WebAudio triage](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md) WA-SEEK-01) |
| DEF-BUG-01 | True Balance vs equal-power przy mono↔stereo (+3 dB w centrum) | `limit` | Świadome: centrum True Balance = unity; komentarz w `balanceGains` — bez zmiany bez decyzji PO |
| DEF-BUG-02 | Dual-mono downmix +3 dB (`STEREO_DOWNMIX_LINEAR`) | `limit` | Equal-power downmix; skorelowane L=R → +3 dB — komentarz w `mixer-math`; rekomendacja 0,5 (−6 dB) / korelacja = decyzja PO |
| (fail-soft) | `resolveTrackOutputDest` → Master przy złym `busId` | `rejected` | Fail-soft zamierzony; schema `superRefine` na krawędzi |
| DEF-ADR-01 / 02 | Bus→bus / Out 3–4 | `limit` | Limit produktu 5.2+ ([TODO](../../../TODO.md)), nie bug |

## Otwarte / hipotezy z dumpu

| ID (dump) | Temat | Impact | Stan | Dlaczego ciekawe |
|-----------|--------|--------|------|------------------|
| DEF-BUG-04 | Solo ścieżki + Solo szyny → dead state (cisza) | Wysoki (FOH) | `hypothesis` | `isClipAudible` przepuszcza track solo; `applyBusParams` wycisza szynę docelową spoza `soloBusIds` — UI „solo”, głośniki ciche |
| (race UI) | `applyBusParams` GainNode podczas `suppressAudioPlayback` / Pause | Średni (clicks) | `hypothesis` | Dump: trzaski przy szybkiej zmianie faderów tuż po lokalnym stop |
| (Peak Hold) | Race `updatePeakHold` vs clear w RAF | Niski–średni (UI) | `hypothesis` | Krótkie clipy >0 dBFS mogą umknąć między zerowaniem a odczytem analizatora |
| (UX / topologia) | Hierarchia Solo track vs Solo bus (reguła „szyna żyje, gdy ma solo track”) | — | `hypothesis` | Rekomendacja dumpu: nie wyciszać szyny, jeśli `soloTrackIds` routują do niej — wymaga decyzji produktu + test |
| (UX) | Dynamiczny downmix / korelacja fazowa zamiast stałego equal-power | — | `hypothesis` | Alternatywa do limitu DEF-BUG-02; nie implementować bez PO |

## Następny krok eng

1. **Repro Solo dead state** (DEF-BUG-04): Solo Bus A → Solo Track na Bus B → cisza mimo UI solo; potem decyzja: auto-unmute szyny docelowej vs zmiana priorytetu Solo.
2. Opcjonalnie smoke: Peak Hold clear vs krótki overshoot; clicks przy faderze tuż po Pause (tylko jeśli FOH zgłosi).
3. **Nie** claim Done / `closed` dopóki Solo×Mute nie ma zielonego/czerwonego testu albo świadomego `rejected`/`limit`.
