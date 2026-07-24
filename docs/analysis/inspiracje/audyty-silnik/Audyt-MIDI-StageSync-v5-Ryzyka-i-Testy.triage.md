# Triage: Audyt MIDI StageSync v5 (ryzyka i testy)

**Źródło:** [Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md](./Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md) (Gemini Deep Search)  
**Status:** `closed`  
**Obszar:** MIDI host / PC IN·OUT / clock·SPP  
**Data triage:** 2026-07-24 (smoke + fix)  
**Ostatnia aktualizacja:** 2026-07-25 (RSK-07: coalesce PC + flood-test; kanały 04/05 = `limit` → TODO 5.2+)

## Werdykt przydatności

**Wysoka wartość sceniczna.** RSK-06/03/01–02/08/09/07 potwierdzone i naprawione lub świadomie ograniczone. RSK-10 odrzucony. Kanały PC (04/05) = świadomy limit → TODO 5.2+. **RSK-07:** host skleja PC do jednego `onProgramChange` na turę (latest-wins); SPP tylko cache do Start/Continue; flood-test 1000× PC+SPP — bez osobnego Hz-limitera (wystarcza).

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
| RSK-MIDI-07 | Rate-limit / debounce flood PC+SPP IN | `limit` | Świadomie **bez** osobnego Hz-limitera: PC coalesce (`queueMicrotask` latest-wins) + SPP tylko cache; flood-test `RSK-07` w `host.test.ts` (1000 msg → 1 handler, ostatni SPP na Continue) |
| RSK-MIDI-04 / 05 | Omni IN + hardkod OUT ch 0 | `limit` | → [TODO 5.2+](../../../TODO.md) (kanał PC) |

## Otwarte / hipotezy z dumpu

*(brak — priorytetowe ID rozstrzygnięte; 04/05 świadomie w TODO 5.2+)*

## Kontekst konstytucji

- MIDI ≠ drugi zegar klienta — SSOT serwer ([ADR 0002](../../../adr/0002-timebase-ssot.md)).

## Następny krok eng

1. Kanały PC (04/05): pozycja w [TODO.md](../../../TODO.md) § 5.2+ — bez atrap UI.
2. Dokument `closed`.
