# Triage: Audyt synchronizacji transportu / SSOT

**Źródło:** [Audyt-Synchronizacji-Transport-SSOT.md](./Audyt-Synchronizacji-Transport-SSOT.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Transport SSOT / WS / pause-at-end / auto-advance  
**Data triage:** 2026-07-24  
**Ostatnia aktualizacja:** 2026-07-25 (fala 1: song-end I/O stale-check + bez HTTP na `ws.onopen`; residual overshoot audio)

## Werdykt przydatności

**Najwyższy priorytet wśród inspiracji silnikowych.** BUG-02 / 01+06 potwierdzone i naprawione + testy. Część claimów dumpu zawyżona (optimistic REST ≠ zegar klienta; cichy drop wstecznych ticków = poprawny; StrictMode + `cancelled` OK). Dokument **nie** `closed` — residual BUG-05 (overshoot audio do RTT/`getSetlist`).

## Rozstrzygnięte w tej fali

| ID | Temat | Stan | Notatka |
|----|--------|------|---------|
| BUG-SSV5-02 | `pause-at-end` / `auto-advance` await I/O nadpisuje Seek/Pause FOH | `fixed` | `stillPastEnd` po każdym `await`; testy w `song-end-race.test.ts` |
| BUG-SSV5-01 / 06 | `getTransport` HTTP vs świeży tick WS przy `onopen` / mount | `fixed` | Usunięte HTTP z `ws.onopen`; mount HTTP zostaje (pierwszy paint); welcome = tick WS |
| BUG-SSV5-03 | optimistic `applyAnchor` + tick = jitter / łamie ADR 0002 | `rejected` | `runCommand` aplikuje **odpowiedź REST serwera** (nie lokalny zegar muzyczny); SSOT nadal serwer |
| BUG-SSV5-04 | `samplePosition` side-effect przy loop wrap | `rejected` | Single-thread; wrap+reanchor idempotentny przy stałym `now` — test 10× `getState` |
| BUG-SSV5-07 | ciche drop ticków wstecznych bez fail-fast UI | `rejected` | Zamierzone (out-of-order); spam błędu na FOH byłby gorszy |
| BUG-SSV5-08 | StrictMode podwójny WS | `rejected` | Cleanup `cancelled` + close; standard React 18 |

## Otwarte / hipotezy

| ID | Temat | Impact | Stan | Dlaczego ciekawe |
|----|--------|--------|------|------------------|
| BUG-SSV5-05 | pause-at-end bez twardego cut audio na `endTicks` | Średni (ms overshoot) | `hypothesis` | Serwer nadal `await getSetlist` przed `pause`; audio gra do ticka WS. Mitigacja klientowa (clamp do końca) albo sync cache setlist — decyzja eng; nie claim fix bez smoke |

## Kontekst

- [ADR 0002](../../../adr/0002-timebase-ssot.md) — serwer SSOT; client tylko wygładzanie między tickami.
- Pokrewne: [WebAudio triage](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md) (suppress / stop na `playing: false`).

## Następny krok eng

1. **BUG-05:** zmierz overshoot FOH (Play→koniec, auto-advance off) — jeśli słyszalny, clamp audio po stronie klienta przy `displayTicks ≥ end` **albo** przyspiesz pause (cache flagi auto-advance).
2. **Nie** claim `closed` dopóki BUG-05 ma `fixed` / `rejected` / `limit`.
