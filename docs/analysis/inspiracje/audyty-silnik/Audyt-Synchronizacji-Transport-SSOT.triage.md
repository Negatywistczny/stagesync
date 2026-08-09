# Triage: Audyt synchronizacji transportu / SSOT

**Źródło:** [Audyt-Synchronizacji-Transport-SSOT.md](./Audyt-Synchronizacji-Transport-SSOT.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Transport SSOT / WS / pause-at-end / auto-advance  
**Data triage:** 2026-07-24  
**Ostatnia aktualizacja:** 2026-07-25 (BUG-05: lokalny soft-stop WebAudio przy tickach ≥ end)

## Werdykt przydatności

**Najwyższy priorytet wśród inspiracji silnikowych.** BUG-02 / 01+06 / 05 potwierdzone i naprawione + testy. Część claimów dumpu zawyżona (optimistic REST ≠ zegar klienta; cichy drop wstecznych ticków = poprawny; StrictMode + `cancelled` OK). Status zostaje `partial` (dump ma więcej ID; Safari/WebAudio/mixer poza tym plikiem) — nie `closed` na zapas.

## Rozstrzygnięte w tej fali

| ID               | Temat                                                              | Stan       | Notatka                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BUG-SSV5-02      | `pause-at-end` / `auto-advance` await I/O nadpisuje Seek/Pause FOH | `fixed`    | `stillPastEnd` po każdym `await`; testy w [`song-end-race.test.ts`](../../../../apps/server/src/song-end-race.test.ts)                                                                    |
| BUG-SSV5-01 / 06 | `getTransport` HTTP vs świeży tick WS przy `onopen` / mount        | `fixed`    | Usunięte HTTP z `ws.onopen`; mount HTTP zostaje (pierwszy paint); welcome = tick WS                                                                                                       |
| BUG-SSV5-05      | pause-at-end bez twardego cut audio na `endTicks`                  | `fixed`    | Klient: soft-stop WebAudio gdy `displayTicks ≥ projectEnd` i brak loop (bez drugiego zegara); testy w [`audioPlayback.test.ts`](../../../../apps/web/src/lib/audio/audioPlayback.test.ts) |
| BUG-SSV5-03      | optimistic `applyAnchor` + tick = jitter / łamie ADR 0002          | `rejected` | `runCommand` aplikuje **odpowiedź REST serwera** (nie lokalny zegar muzyczny); SSOT nadal serwer                                                                                          |
| BUG-SSV5-04      | `samplePosition` side-effect przy loop wrap                        | `rejected` | Single-thread; wrap+reanchor idempotentny przy stałym `now` — test 10× `getState`                                                                                                         |
| BUG-SSV5-07      | ciche drop ticków wstecznych bez fail-fast UI                      | `rejected` | Zamierzone (out-of-order); spam błędu na FOH byłby gorszy                                                                                                                                 |
| BUG-SSV5-08      | StrictMode podwójny WS                                             | `rejected` | Cleanup `cancelled` + close; standard React 18                                                                                                                                            |

## Otwarte / hipotezy

_(brak otwartych ID z dumpu Transport — residual poza zakresem tego audytu: Safari/WebAudio, Solo×Mute miksera)_

## Kontekst

- [ADR 0002](../../../adr/0002-timebase-ssot.md) — serwer SSOT; client tylko wygładzanie między tickami.
- Pokrewne: [WebAudio triage](./Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md) (suppress / stop na `playing: false`).

## Następny krok eng

1. Opcjonalny smoke FOH: Play→koniec, auto-advance off — brak słyszalnego overshoot do pauzy WS.
2. Nie claim `closed` tylko dlatego, że tabela priorytetów Transport jest pusta — inne audyty silnika mogą jeszcze nieść residual.
