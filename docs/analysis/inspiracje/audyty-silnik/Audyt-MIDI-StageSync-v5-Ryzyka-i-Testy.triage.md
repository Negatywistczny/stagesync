# Triage: Audyt MIDI StageSync v5 (ryzyka i testy)

**Źródło:** [Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md](./Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md) (Gemini Deep Search)  
**Status:** `closed`
**Obszar:** MIDI host / PC IN·OUT / clock·SPP  
**Data triage:** 2026-07-24 (smoke + fix)

## Werdykt przydatności

**Wysoka wartość sceniczna.** RSK-06/03/01–02/08 potwierdzone i naprawione. Kanały PC (04/05) = świadomy limit bez UI. RSK-10 odrzucony (`setConfig` nie dubluje `onChange`).

## Rozstrzygnięte

| ID | Temat | Stan | Dowód / fix |
|----|--------|------|-------------|
| RSK-MIDI-06 | `backend.send` w clock bez catch → crash USB | `fixed` | `safeSend` + stop clock OUT; test throw |
| RSK-MIDI-03 | Clock z `setInterval` vs SSOT | `fixed` | Clock z delty ticków transportu (`ticksToMidiClockIndex`) |
| RSK-MIDI-01 | `inFlight` drop PC IN | `fixed` | Latest-wins `pending` + `pump` |
| RSK-MIDI-02 | `inFlight` drop PC OUT | `fixed` | Latest-wins w `wireMidiProgramChangeOut` |
| RSK-MIDI-08 | SPP seek poza koniec projektu | `fixed` | `clampSeekTicks` + cache end w `app.ts` |
| RSK-MIDI-09 | mock vs native error parity | `fixed` | `safeSend` + mock `throwOnSend` |
| RSK-MIDI-10 | Podwójne `onChange` po `setConfig` | `rejected` | Jedna subskrypcja przy create; test |
| RSK-MIDI-04 / 05 | Omni IN + hardkod OUT ch 0 | `limit` | → [TODO 5.2+](../../../TODO.md) (kanał PC) |
| RSK-MIDI-07 | Rate-limit PC/SPP flood | `partial` | PC: latest-wins; SPP nie seekuje aż Start — bez osobnego limitera |

## Kontekst konstytucji

- MIDI ≠ drugi zegar klienta — SSOT serwer ([ADR 0002](../../../adr/0002-timebase-ssot.md)).

## Następny krok

Kanały PC: pozycja w [TODO.md](../../../TODO.md) § 5.2+. Dump = provenance.
