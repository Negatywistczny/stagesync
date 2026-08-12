# Triage: Recenzja decyzji Live FOH Audio / routing (CRIT-OUT)

**Źródło:** [Recenzja-Decyzji-Live-FOH-Audio.md](./Recenzja-Decyzji-Live-FOH-Audio.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** Multi-out runtime gate · bus→bus DAG · zakaz atrap · logical HW patch table  
**Data triage:** 2026-07-26  
**Companion:** [Specyfikacja-StageSync-dla-miksera-DAW.triage.md](./Specyfikacja-StageSync-dla-miksera-DAW.triage.md) · [Ocena-Decyzji-Produktowych-StageSync-v1.triage.md](./Ocena-Decyzji-Produktowych-StageSync-v1.triage.md) · [ADR 0015../../../../architecture/adr/0015-daw-reference-and-product-decisions.md)

## Werdykt przydatności

**Wysoka dla WebAudio realism.** REVISE multi-out activation (gate `maxChannelCount`) — **już on-tree** jako `hwOutputUiAllowed`. KEEP bus→bus + DAG fail-fast/fail-soft — **on-tree**. KEEP zakaz atrap — ADR 0011. KEEP logical HW patch table — Zod `audioHardwareOutputs` on-tree; UI ChannelMerger residual. Lepiej niż CRIT-MX v1 do routingu; pan-law nie tu (patrz v1 / ADR).

## Macierz

| ID          | Temat                                                                   | Werdykt | Stan                    | Notatka                                  |
| ----------- | ----------------------------------------------------------------------- | ------- | ----------------------- | ---------------------------------------- |
| CRIT-OUT-01 | Multi-out + runtime criteria                                            | REVISE  | `partial`               | Gate on-tree; HW UI/ChannelMerger = TODO |
| CRIT-OUT-02 | Bus→bus + anti-cycle                                                    | KEEP    | `on-tree`               | Zod + fail-soft → Master                 |
| CRIT-OUT-03 | Brak atrap Out                                                          | KEEP    | `confirmed`             | ADR 0011                                 |
| CRIT-OUT-04 | Logical HW patch table                                                  | KEEP    | `on-tree` / residual UI | Model vs runtime multi-out               |
| PO Q        | Hot-unplug fail-safe; offline show prep; patch in project vs host prefs | —       | `hypothesis`            |                                          |

## Następny krok

1. HW Out UI dopiero przy realnym `maxChannelCount≥4`.
2. Q&A: zachowanie przy unplug / maxChannelCount=2 na 8ch interface.
3. Cross-check Audyt Routingu Miksera (DEF-ADR) — nie duplikować bug backlogu.
