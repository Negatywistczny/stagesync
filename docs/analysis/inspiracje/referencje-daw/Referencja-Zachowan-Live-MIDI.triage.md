# Triage: Referencja zachowań Live MIDI (PC)

**Źródło:** [Referencja-Zachowan-Live-MIDI.md](./Referencja-Zachowan-Live-MIDI.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** MIDI Program Change / binding utwór→PC / MainStage·Live·Gig Performer  
**Data triage:** 2026-07-25

## Werdykt przydatności

**Wysoka wartość jako macierz IN/LATER/OUT + scenariusze FOH (PC-01…08).** Hipotezy `RSK-MIDI-*` w dumpie **duplikują** [Audyt MIDI](../audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md) — rozstrzygać tam, nie tu. Ten plik = referencja behawioralna (kiedy PC OUT, debounce, batch, OUT Defer/pass-through), nie drugi backlog bugów.

## Macierz REF (dump) — status triage

| ID | Temat | Stan | Notatka |
|----|--------|------|---------|
| REF-PC-01…09 | PC OUT on load, PC IN, debounce, batch, templates, panic, safeSend, clock z ticków, filtr kanału | `hypothesis` / częściowo `fixed` | Zachowania IN wg dumpu; kanał IN/OUT = `limit` 5.2+ (RSK-04/05) |
| REF-PC-10 | Bank Select (CC 0/32) | `limit` | Dump: LATER — bez atrap UI |
| REF-PC-11 | Multi-device MIDI OUT | `limit` | Dump: LATER |
| REF-PC-12 | Defer Patch Change (Note-Off) | `limit` | Dump: OUT — Stop@Home przy switch |
| REF-PC-13 | Pass-through unused PC do wtyczek | `limit` | Dump: OUT — brak VST w serwerze |
| REF-PC-14 / 15 | MIDI recording / Take Folders | `limit` | ADR 0008 OUT |
| REF-PC-16 | Mixer Out 3–4 | `limit` | → [TODO 5.2+](../../../TODO.md) |

## RSK w dumpie (nie dublować pracy)

Rozstrzygnięcia: [Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md](../audyty-silnik/Audyt-MIDI-StageSync-v5-Ryzyka-i-Testy.triage.md). Tutaj tylko cross-link: 01–03/06/08–10 zamknięte; 04/05 `limit`; 07 flood nadal `hypothesis`.

## FOH edge (PC-01…08)

Katalog ochronny — użyteczny do smoke HW MIDI, **nie** claim green bez repro. PC-04 (Play podczas load) i PC-07 (flood) najbardziej warte osobnego smoke.

## Następny krok eng

1. Nie otwierać TODO z REF-PC LATER/OUT.
2. Smoke PC-01 (double-fire) + PC-03 (USB unplug) na HW — potem ewentualnie `confirmed`/`fixed` w triage MIDI.
3. Traktować dump jako companion do audytu MIDI, nie SSOT.
