# Triage: Audyt MIDI StageSync v5 (ryzyka i testy)

**Źródło:** [Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md](./Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md) (Gemini Deep Search)  
**Status:** `closed`  
**Obszar:** MIDI host / PC IN·OUT / clock·SPP  
**Data triage:** 2026-07-24 (smoke + fix)  
**Ostatnia aktualizacja:** 2026-07-25 (RSK-04/05/07 `fixed` — kanały PC + debounce 50 ms)

## Werdykt przydatności

**Wysoka wartość sceniczna.** Wszystkie priorytetowe RSK rozstrzygnięte. Kanały PC + debounce 50 ms latest-wins wg [ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md).

## Rozstrzygnięte w tej fali

| ID | Temat | Stan | Dowód / fix |
|----|--------|------|-------------|
| RSK-MIDI-06 | `backend.send` w clock bez catch → crash USB | `fixed` | `safeSend` + stop clock OUT; test throw |
| RSK-MIDI-03 | Clock z `setInterval` vs SSOT | `fixed` | Clock z delty ticków transportu (`ticksToMidiClockIndex`) |
| RSK-MIDI-01 | `inFlight` drop PC IN | `fixed` | Latest-wins `pending` + `pump` |
| RSK-MIDI-02 | `inFlight` drop PC OUT | `fixed` | Latest-wins w `wireMidiProgramChangeOut` |
| RSK-MIDI-08 | SPP seek poza koniec projektu | `fixed` | `clampSeekTicks` + cache end w `app.ts` |
| RSK-MIDI-09 | mock vs native error parity | `fixed` | `safeSend` + mock `throwOnSend` |
| RSK-MIDI-10 | Podwójne `onChange` po `setConfig` | `rejected` | Jedna subskrypcja przy create; test |
| RSK-MIDI-07 | Debounce flood PC+SPP IN | `fixed` | Debounce **50 ms + latest-wins**; bez Hz-limitera; flood-test w `host.test.ts` |
| RSK-MIDI-04 / 05 | Omni IN + hardkod OUT ch 0 | `fixed` | `inputChannel` / `outputChannel` w schema + host + Admin Host UI |

## Otwarte / hipotezy z dumpu

*(brak)*

## Kontekst konstytucji

- MIDI ≠ drugi zegar klienta — SSOT serwer ([ADR 0002](../../../adr/0002-timebase-ssot.md)).
- Decyzje PC / flood: [ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md).

## Następny krok eng

Dokument `closed`. Smoke FOH kanałów na HW opcjonalny.
