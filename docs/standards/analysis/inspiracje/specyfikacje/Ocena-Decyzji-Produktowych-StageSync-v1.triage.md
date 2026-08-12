# Triage: Ocena decyzji miksera FOH / WebAudio (CRIT-MX-01) — dump v1

**Źródło:** [Ocena-Decyzji-Produktowych-StageSync-v1.md](./Ocena-Decyzji-Produktowych-StageSync-v1.md) (Gemini / AI Exporter; krótszy plik Downloads bez `(1)`)  
**Status:** `open`  
**Obszar:** Multi-out · bus→bus · True Balance · dual-mono · solo · Click · Mixer Zoom · zakaz stubów  
**Data triage:** 2026-07-26  
**Companion:** [Recenzja-Decyzji-Live-FOH-Audio.triage.md](./Recenzja-Decyzji-Live-FOH-Audio.triage.md) · [Specyfikacja-StageSync-dla-miksera-DAW.triage.md](./Specyfikacja-StageSync-dla-miksera-DAW.triage.md) · [ADR 0015../../../../architecture/adr/0015-daw-reference-and-product-decisions.md)

## Provenance

**Nie** supersedowany draft kanonu reliability — to **osobny** raport (tytuł: decyzje miksera FOH). Zapisany jako `-v1`, bo krótszy sibling Downloads o tej samej bazie nazwy.

## Werdykt przydatności

**Średnia–wysoka jako napięcie vs ADR 0015.** KEEP: track solo wins, Click Cue, Mixer Zoom = skala chrome, zakaz atrap Out — **zgodne** z dyskiem/ADR. REVISE: Multi-out, bus→bus, True Balance, dual-mono +3 dB — **koliduje** z ADR 0015 (True Balance / dual-mono = zamierzone OK; Multi-out = decyzja wprowadzić; bus→bus on-tree). Traktować jako propozycje re-open PO, nie jako SSOT.

## Macierz

| ID                                  | Werdykt dumpu                       | Stan vs repo               | Notatka                                                                                                                  |
| ----------------------------------- | ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| CRIT-MX-01.1 Multi-out HW           | REVISE → 5.3+ + `maxChannelCount≥4` | `partial` / `on-tree` gate | Zod HW + `hwOutputUiAllowed` on-tree; UI ChannelMerger = TODO residual — **zgodne z bramką**, nie z „odwołać decyzję IN” |
| CRIT-MX-01.2 Bus→bus freeze         | REVISE                              | `on-tree` / konflikt       | bus→bus + anti-cycle już w `5.2.0`; dump chce zamrozić — wymaga PO, nie eng revert bez decyzji                           |
| CRIT-MX-01.3 True Balance           | REVISE → equal-power −3 dB          | `limit` (ADR KEEP)         | ADR 0015: zamierzone OK — re-open tylko PO                                                                               |
| CRIT-MX-01.4 Dual-mono +3 dB        | REVISE → auto −3 dB                 | `limit` (ADR KEEP)         | j.w.                                                                                                                     |
| CRIT-MX-01.5 Track solo wins        | KEEP                                | `confirmed`                | ADR + mixer triage                                                                                                       |
| CRIT-MX-01.6 Click Mute/Volume Cue  | KEEP                                | `confirmed`                | ADR 0015                                                                                                                 |
| CRIT-MX-01.7 Mixer Zoom chrome-only | KEEP                                | `confirmed`                | ADR 0015                                                                                                                 |
| CRIT-MX-01.8 Zakaz atrap Out        | KEEP                                | `confirmed`                | ADR 0011                                                                                                                 |

## Następny krok

1. Nie zmieniać pan law / dual-mono bez Q&A PO.
2. Multi-out: kontynuować gate `hwOutputUiAllowed` (już zgodne z rekomendacją runtime).
3. Preferuj [Recenzja-Decyzji-Live-FOH-Audio](./Recenzja-Decyzji-Live-FOH-Audio.triage.md) dla routingu patch table / DAG.
