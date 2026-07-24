# Triage: Audyt silnika odtwarzania WebAudio (`audioPlayback`)

**Źródło:** [Audyt-Silnika-Odtwarzania-Audio-WebAudio.md](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.md) (Gemini Deep Search)  
**Status:** `open`
**Obszar:** Audio / WebAudio / transport playback  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Wysoka wartość jako backlog hipotez.** Konkretne scenariusze (disconnect szyn, mono→L, phantom play, fade ramp, cache/`inflight`) są porównywalne z audytem edytora. Ton „security / critical” zawyżony — nie claim green bez repro.

## Priorytet weryfikacji (kolejność)

| Temat (z dumpu) | Impact (jeśli true) | Effort weryfikacji | Stan |
|-----------------|---------------------|--------------------|------|
| Asymetria `disconnect` / wyciek podgrafu szyny | Wysoki (pamięć / Safari) | Grep `disconnectBusNodes` + stress scrub | `hypothesis` |
| Phantom playback po `resumeAndSync` | Krytyczny (show) | Race Play/Pause + async decode | `hypothesis` |
| Mono → tylko L / routing stereo | Wysoki (słyszalny) | Fixture mono + meter L/R | `hypothesis` |
| Fade ramp / envelope na starcie-stopie | Średni–wysoki | Test fade + loop | `hypothesis` |
| `clearAudioBufferCache` vs orphan `inflight` | Średni | Switch project mid-load | `hypothesis` |

## Kontekst konstytucji

- SSOT czasu / playhead: [ADR 0002](../../../adr/0002-timebase-ssot.md).
- Po potwierdzeniu: TODO Must/Should + ewentualnie `reports/report-…` — **nie** CHANGELOG bez fixa.

## Następny krok eng

Jak edytor: zielony/czerwony test na disconnect + phantom + mono→L zanim cokolwiek trafi do TODO.
