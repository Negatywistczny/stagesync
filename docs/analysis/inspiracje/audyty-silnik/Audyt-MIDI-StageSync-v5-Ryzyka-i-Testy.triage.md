# Triage: Audyt MIDI StageSync v5 (ryzyka i testy)

**Źródło:** [Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md](./Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.md) (Gemini Deep Search)  
**Status:** `open`
**Obszar:** MIDI host / PC IN·OUT / clock·SPP  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Wysoka wartość sceniczna.** Tabela RSK-MIDI-01…10 + rekomendacja clock z ticków SSOT (nie `setInterval`) jest zgodna z [ADR 0002](../../../adr/0002-timebase-ssot.md). Ton „100% pewności” zawyżony — weryfikuj kodem/testem; nie claim Done bez repro.

## Priorytet weryfikacji (kolejność)

| ID | Temat | Impact (jeśli true) | Effort | Stan |
|----|--------|---------------------|--------|------|
| RSK-MIDI-06 | `backend.send` w pętli clock bez catch → crash procesu po USB unplug | Krytyczny (show) | Test mock throw + safeSend | `hypothesis` |
| RSK-MIDI-03 | Clock z `setInterval` vs tick SSOT (jitter/dryf) | Wysoki | Porównaj z `onChange` / tick delta | `hypothesis` |
| RSK-MIDI-01 / 02 | `inFlight` drop PC IN/OUT przy szybkiej serii | Wysoki | Debounce/kolejka latest | `hypothesis` |
| RSK-MIDI-04 / 05 | Omni IN + hardkod kanał OUT 0 | Wysoki (wrong song / no preset) | Config channel + filtr | `hypothesis` |
| RSK-MIDI-10 | Podwójne `transport.onChange` po `setConfig` | Wysoki | Unsubscribe / idempotent wire | `hypothesis` |
| RSK-MIDI-07 | Brak debounce/rate-limit PC/SPP flood | Średni–wysoki | Rate limit test | `hypothesis` |
| RSK-MIDI-08 | SPP → seek poza długość projektu | Średni | Clamp do endTicks | `hypothesis` |
| RSK-MIDI-09 | mock vs native error parity | Średni (DX/testy) | Align mock throws | `hypothesis` |

## Kontekst konstytucji

- MIDI **nie** jest drugim zegarem muzycznym klienta — SSOT = serwer ([ADR 0002](../../../adr/0002-timebase-ssot.md)).
- Po potwierdzeniu: TODO Must/Should + testy brzegowe z raportu — **nie** CHANGELOG bez fixa.

## Następny krok eng

1. Grep `setInterval` / `inFlight` / `sendProgramChange` w `apps/server/src/midi/`.
2. Najpierw RSK-06 + RSK-03 (crash + SSOT clock).
