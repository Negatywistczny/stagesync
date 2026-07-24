# Triage: Audyt MIDI StageSync v5 (ryzyka i testy)

**Źródło:** [Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md](./Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** MIDI host / PC IN·OUT / clock·SPP  
**Data triage:** 2026-07-24 (smoke + fix)  
**Ostatnia aktualizacja:** 2026-07-25 (reopen: RSK-07 nie jest pełnym rozstrzygnięciem; kanały 04/05 = `limit`)

## Werdykt przydatności

**Wysoka wartość sceniczna.** RSK-06/03/01–02/08/09 potwierdzone i naprawione. RSK-10 odrzucony. Kanały PC (04/05) = świadomy limit → TODO 5.2+. **RSK-07** (rate-limit PC/SPP flood) ma częściową mitigację (latest-wins PC; SPP tylko cache do Start/Continue) — **bez** osobnego limitera ani flood-testu → dokument **nie** `closed`.

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
| RSK-MIDI-04 / 05 | Omni IN + hardkod OUT ch 0 | `limit` | → [TODO 5.2+](../../../TODO.md) (kanał PC) |

## Otwarte / hipotezy z dumpu

| ID | Temat | Impact | Stan | Dlaczego ciekawe |
|----|--------|--------|------|------------------|
| RSK-MIDI-07 | Rate-limit / debounce flood PC+SPP IN | Wysoki (I/O / event loop) wg dumpu | `hypothesis` | PC: latest-wins ogranicza load; SPP nie seekuje aż Start/Continue — **brak** osobnego limitera i testu „1000 msg / 100 ms”. Albo `fixed`/`limit` po świadomym flood-smoke, albo dopisać debounce. |

## Kontekst konstytucji

- MIDI ≠ drugi zegar klienta — SSOT serwer ([ADR 0002](../../../adr/0002-timebase-ssot.md)).

## Następny krok eng

1. **Flood smoke RSK-07:** 1000× SPP + PC w krótkim oknie — czy event loop / `onProgramChange` zostaje zdrowy; potem `fixed` (mitigacja wystarczy) albo `limit` / debounce.
2. Kanały PC (04/05): pozycja w [TODO.md](../../../TODO.md) § 5.2+ — bez atrap UI.
3. **Nie** claim `closed` dopóki RSK-07 ma zielony/czerwony dowód albo jawny `limit`.
