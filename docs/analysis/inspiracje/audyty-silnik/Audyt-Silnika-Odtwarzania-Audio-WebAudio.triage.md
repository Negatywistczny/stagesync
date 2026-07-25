# Triage: Audyt silnika odtwarzania WebAudio (`audioPlayback`)

**Źródło:** [Audyt-Silnika-Odtwarzania-Audio-WebAudio.md](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Audio / WebAudio / transport playback  
**Data triage:** 2026-07-24  
**Ostatnia aktualizacja:** 2026-07-25 (WA-MEM-02: PO **odrzuca** permanent limit — reopen jako otwarte)

## Werdykt przydatności

**Wysoka wartość jako backlog hipotez.** Część claimów dumpu była już nieaktualna (`disconnectBusNodes`, kotwica fade). Potwierdzone bugi naprawione + testy. **Safari scratch (WA-MEM-02)** — **nie** akceptowany permanent limit ([ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md)); wraca jako otwarte do naprawy. Cross Peak Hold / fader / Solo — [mixer triage](./Audyt-Routingu-Miksera-StageSync.triage.md).

## Rozstrzygnięte w tej fali

| ID | Temat (z dumpu) | Stan | Notatka |
|----|-----------------|------|---------|
| WA-MEM-01 | Asymetria `disconnect` / wyciek podgrafu szyny | `rejected` | `disconnectBusNodes` już rozłącza splitter/merger/pan/analysery — dump opisuje starszy kształt |
| WA-ASYNC-01 | `clearAudioBufferCache` vs orphan `inflight` / late `rememberBuffer` | `fixed` | Generacja global/per-project; late decode nie wraca do cache; test |
| WA-ASYNC-02 | Phantom playback po `resumeAndSync` / Pause w trakcie buffer | `fixed` | Epoch+suppress w `resumeAndSync`; `restart` nie czyści suppress; abort w TimelineShell Play po await |
| WA-MONO-01 | Mono → tylko L na szynie stereo (splitter discrete) | `fixed` | `gain.channelCount=2` + `explicit` + `speakers` przed splitterem |
| WA-GAIN-01 | `gainDb` w `graphKey` → stop/restart przy suwaku klipu | `fixed` | `gainDb` poza kluczem; `fadeGain` ‖ `levelGain` (live) |
| WA-FADE-01 | Fade ramp bez `setValueAtTime` w strefie fade-out | `rejected` | Już `audioFadeGainAtMs` + `setValueAtTime(startFade)` przed rampą; test kotwicy |
| WA-LOOP-01 | `loopStart >= loopEnd` na ultrakrótkim trimie | `fixed` | Loop włączany tylko gdy `loopEnd > loopStart` |
| WA-MODE-01 | Zmiana `channelMode` zostawia clip na starej szynie | `rejected` | `channelMode` w `graphKey` → `stopAll` + re-start na nowej topologii |
| WA-SEEK-01 | Seek / cold buffer bez re-trigger po decode (= mixer DEF-BUG-05) | `fixed` | Po `loadAudioBuffer` re-`startClip` z `lastSyncArgs` jeśli nadal Play |
| (cross) DEF-BUG-04 | Solo track × Solo bus → dead state | `fixed` | [mixer triage](./Audyt-Routingu-Miksera-StageSync.triage.md) — track solo wins |
| (cross) Peak Hold / fader×suppress | Race UI / clicks | `fixed` | [mixer triage](./Audyt-Routingu-Miksera-StageSync.triage.md) — holdsRef + dezipper / skip reconnect |

## Otwarte / hipotezy

| ID | Temat | Impact | Stan | Dlaczego ciekawe |
|----|--------|--------|------|------------------|
| WA-MEM-02 | Scratch / empty buffer po `stop()` (Safari WebKit RAM) | FOH Safari | `hypothesis` | PO: **naprawić** — nie `limit`. Brak repro Vitest; spike WebKit / empty-buffer tylko z pomiarem (ryzyko regresji Chromium). → [TODO Should](../../../TODO.md) |

## Kontekst konstytucji

- SSOT czasu / playhead: [ADR 0002](../../../adr/0002-timebase-ssot.md).
- Routing / True Balance: [mixer triage](./Audyt-Routingu-Miksera-StageSync.triage.md); decyzje PO [ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md).

## Następny krok eng

1. WA-MEM-02: spike WebKit z measurement — nie blind fix; pozycja w TODO Should.
2. Dokument zostaje `partial` do domknięcia Safari.
