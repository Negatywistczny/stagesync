# Triage: MIDI PC channeling (IN filter + OUT channel)

**Źródło:** [StageSync-v5.2+-MIDI-PC-Referencja.md](./StageSync-v5.2+-MIDI-PC-Referencja.md) (Gemini / AI Exporter)  
**Status:** `closed`  
**Obszar:** `MidiHostConfig.inputChannel` / `outputChannel` · Admin Host UI · silent drop + debounce 50 ms latest-wins  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (re-verify: schema + host + Admin/SystemView + testy — bez regresji)  
**Kąt:** feature zamykający RSK-MIDI-04/05/07 — wdrożone ([ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md))

## Werdykt przydatności

**Wysoka — kontrakt 0-based API vs 1-based UI.** Flood = debounce 50 ms + latest-wins (PO). Multi-channel IN lista = nadal poza zakresem (`limit`).

## Epiki / tematy

| ID / temat | Stan | Notatka |
|------------|------|---------|
| PC-CH-01 Omni / single | `fixed` | Omni = `null` (default legacy); single = `0…15` |
| PC-CH-02 schema | `fixed` | `MidiHostConfigSchema` + defaults migracji |
| PC-CH-03 silent drop + debounce 50 ms | `fixed` | [`host.ts`](../../../../apps/server/src/midi/host.ts) + testy |
| PC-CH-04 Admin + SystemView | `fixed` | ServerSettingsModal + telemetria |
| PC-CH-05 UT/IT | `fixed` | schema / host / midi-api / pc-load |
| Multi-channel IN (lista) | `limit` | OUT of scope |

## Następny krok eng

Brak — companion do [audytu MIDI](../audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md) (`closed`).
