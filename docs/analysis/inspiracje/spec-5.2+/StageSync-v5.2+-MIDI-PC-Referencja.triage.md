# Triage: MIDI PC channeling (IN filter + OUT channel) — intro 5.2+

**Źródło:** [StageSync-v5.2+-MIDI-PC-Referencja.md](./StageSync-v5.2+-MIDI-PC-Referencja.md) (Gemini / AI Exporter)  
**Status:** `open`  
**Obszar:** `MidiHostConfig.inputChannel` / `outputChannel` · Admin Host UI · silent drop + coalescing  
**Data triage:** 2026-07-25  
**Kąt:** wprowadzenie feature zamykającego RSK-MIDI-04/05 (nie drugi audyt bugów)

## Werdykt przydatności

**Wysoka — precyzyjny kontrakt 0-based API vs 1-based UI + plan UT/IT/FOH.** **Kolizja / companion:** hipotezy kanałów już w [Audyt MIDI](../audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md) (`limit`) oraz [Referencja Live MIDI](../referencje-daw/Referencja-Zachowan-Live-MIDI.triage.md) (REF-PC / RSK-04/05). Ten dump = **spec wdrożeniowa 5.2**, nie duplikat backlogu bugów.

## Epiki / tematy vs `main` (5.1.x)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| PC-CH-01 Omni IN + single OUT (status quo) | `partial` | Dziś Omni IN / hardkod ch. 0 OUT — zachowanie 5.1 |
| PC-CH-02 pola `inputChannel` / `outputChannel` w schema | `hypothesis` | `MidiHostConfigSchema` **bez** tych pól — **confirmed gap** |
| PC-CH-03 silent drop + latest-wins coalescing | `partial` | Coalescing/flood częściowo w audycie; filtr kanału — brak |
| PC-CH-04 Admin selects + SystemView | `hypothesis` | Brak UI kanałów |
| PC-CH-05 suite UT-PC / IT-PC / smoke 2 ch | `hypothesis` | Plan testów przy implementacji |
| Multi-channel IN (lista kanałów) | `limit` | Dump: OUT of scope 5.2 |

## Confirmed vs hypothesis

- **Confirmed gap:** schema `MidiHostConfig` (inputId/outputId/clockOutEnabled only) — zgodne z TODO „MIDI — kanał Program Change”.
- Rozstrzyganie RSK-01…03/06… w audycie MIDI; **tu** tylko 04/05 → feature 5.2.
- Po implementacji: oznaczyć RSK-04/05 `fixed` w triage audytu; ten dokument → `partial`/`closed`.

## Następny krok eng

Nie otwierać drugiego TODO — pozycja już w [TODO 5.2+](../../../TODO.md). Implementacja: Zod → `host.ts` filtr → `program-change-out` → Admin UI.
