# Triage: Audyt routingu miksera StageSync

**Źródło:** [Audyt-Routingu-Miksera-StageSync.md](./Audyt-Routingu-Miksera-StageSync.md) (Gemini Deep Search)  
**Status:** `open`
**Obszar:** Mixer routing / True Balance / schema vs WebAudio  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Wysoka — uzupełnia audyt WebAudio.** Dobrze oddziela **bug** (np. `channelMode` default vs mono import, skok poziomu mono↔stereo) od **świadomego limitu** (bus→tylko Master, brak atrap Out 3–4 — [ADR 0011](../../../adr/0011-ui-parity-behavior.md), [TODO](../../../TODO.md)).

## Priorytet weryfikacji

| Temat | Impact | Notatka | Stan |
|--------|--------|---------|------|
| `channelMode` undefined → stereo vs mono z importu | Wysoki (pan/poziom) | `resolveChannelMode` vs `channelModeFromChannelCount` | `hypothesis` |
| True Balance vs equal-power przy zmianie mono↔stereo | Wysoki (słyszalny skok) | Porównaj `balanceGains` / StereoPanner | `hypothesis` |
| `resolveTrackOutputDest` → Master przy złym busId | Średni (fail-soft) | Zgodne z fail-safe; sprawdź UX | `hypothesis` |
| Bus→bus / Out 3–4 | — | **Limit produktu 5.2+**, nie bug | `limit` |

## Następny krok eng

Testy w `mixer-routing` / `mixer-math` + spójność z `audioPlayback` graph; nie otwierać UI Out 3–4 bez silnika.
