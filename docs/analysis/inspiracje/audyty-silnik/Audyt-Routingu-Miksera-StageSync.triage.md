# Triage: Audyt routingu miksera StageSync

**Źródło:** [Audyt-Routingu-Miksera-StageSync.md](./Audyt-Routingu-Miksera-StageSync.md) (Gemini Deep Search)  
**Status:** `closed`  
**Obszar:** Mixer routing / True Balance / schema vs WebAudio / Solo–Mute  
**Data triage:** 2026-07-24  
**Ostatnia aktualizacja:** 2026-07-25 (PO: True Balance / downmix / track solo = intentional; Out 3–4 = **decyzja wprowadzić**, impl backlog)

## Werdykt przydatności

**Wysoka — uzupełnia audyt WebAudio.** Oddziela **bug** (mono import, meter, Solo×Mute, Peak Hold, fader clicks) od **świadomych decyzji** (True Balance / downmix OK; track solo wins) oraz **kierunku produktu** multi-out ([ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md)). Seek/cold-buffer w [WebAudio triage](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md). Bus→bus nadal backlog. Safari scratch — otwarte w WebAudio (nie limit).

## Rozstrzygnięte

| ID (dump) | Temat | Stan | Notatka |
|-----------|--------|------|---------|
| DEF-BUG-03 | Peak/VU mono sag przy hard pan | `fixed` | Meter **pre-pan** w `TrackBusMono` |
| (schema vs runtime) | `channelMode` undefined → stereo vs mono z importu | `fixed` | `applyDecodedAudioMeta` + stemplowanie `"mono"` |
| DEF-BUG-05 | Seek / cold buffer bez re-trigger po decode | `fixed` | `lastSyncArgs` + re-`startClip` ([WebAudio](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md) WA-SEEK-01) |
| DEF-BUG-04 | Solo ścieżki + Solo szyny → dead state | `fixed` | **Track solo wins** ([ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md)) |
| (race UI) | `applyBusParams` GainNode podczas suppress / Pause | `fixed` | Dezipper ~12 ms; skip reconnect |
| (Peak Hold) | Race `updatePeakHold` vs clear w RAF | `fixed` | Latch w `holdsRef` + testy |
| DEF-BUG-01 | True Balance vs equal-power (+3 dB centrum) | `limit` | PO: **intentional OK** ([ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md)) |
| DEF-BUG-02 | Dual-mono downmix +3 dB | `limit` | PO: **intentional OK** (equal-power skorelowane) |
| (fail-soft) | `resolveTrackOutputDest` → Master przy złym `busId` | `rejected` | Fail-soft zamierzony |
| DEF-ADR-01 | Bus→bus | `limit` | Backlog implementacji 5.2+ ([TODO](../../../TODO.md)) |
| DEF-ADR-02 | Out 3–4 multi-out | `limit` | **Decyzja: wprowadzić** (ADR 0015); brak atrap UI do czasu modelu + WebAudio |
| (UX / topologia) | Hierarchia Solo track vs Solo bus | `fixed` | Domknięte track-wins |

## Otwarte / hipotezy z dumpu

*(brak obowiązkowych — downmix korelacyjny dynamiczny zbędny po decyzji PO)*

## Następny krok eng

1. Multi-out / bus→bus: implementacja gdy model gotowy — bez stubów ([TODO 5.2+](../../../TODO.md)).
2. Safari: [WebAudio triage](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md) WA-MEM-02.
