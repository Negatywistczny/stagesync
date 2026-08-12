# Triage: Mixer HW Out 3–4 + bus→bus — intro 5.2+

**Źródło:** [Specyfikacja-StageSync-dla-miksera-DAW.md](./Specyfikacja-StageSync-dla-miksera-DAW.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** `audioHardwareOutputs` · `MixerOutputTarget` · DAG bus→bus · ChannelMerger multi-out  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-26 (link Recenzja FOH Audio + CRIT-MX v1)  
**Kąt:** wprowadzenie feature 5.2+ (nie re-audyt bugów 5.1 Mixer)  
**Review decyzji:** [Recenzja-Decyzji-Live-FOH-Audio.triage.md](./Recenzja-Decyzji-Live-FOH-Audio.triage.md) · pan-law / True Balance: [Ocena-Decyzji-Produktowych-StageSync-v1.triage.md](./Ocena-Decyzji-Produktowych-StageSync-v1.triage.md)

## Werdykt przydatności

**Wysoka — rekomendacja modelu (logical HW patch table + unified target) + anti-cycle DFS + ograniczenia `maxChannelCount`.** **Out 3–4 = decyzja produktowa wprowadzić** ([ADR 0015../../../../architecture/adr/0015-daw-reference-and-product-decisions.md)); ten dump = design implementacji, nie claim że multi-out działa. Recenzja FOH: KEEP patch table / DAG / zakaz atrap; REVISE = gate runtime (już `hwOutputUiAllowed`).

## Epiki / tematy vs `main` (5.2.0)

| ID / temat                                                  | Stan               | Notatka                                                                                                                                 |
| ----------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| MX-OUT-01…04 HW outs + meters + mute/solo                   | `partial`          | Zod `audioHardwareOutputs` + `hw_out` **on-tree**; WebAudio ChannelMerger + UI **skip** bez `maxChannelCount` ≥ 4 (`hwOutputUiAllowed`) |
| MX-BUS-01 bus→bus                                           | `on-tree`          | `BusOutputDest` = master\|bus; Mixer Out na busie; playback DAG                                                                         |
| MX-BUS-02 anti-cycle Zod + fail-soft                        | `on-tree`          | `busGraphHasCycle` / `wouldCreateBusCycle`; Zod fail-fast; runtime fail-soft → Master                                                   |
| MX-BUS-03 solo cascade / track-wins                         | `partial`          | Track solo wins już wcześniej; pełna kaskada DAG — Later                                                                                |
| WebAudio discrete ChannelMerger + OS speaker config warning | `limit` / **skip** | Brak atrap Out 3–4 w UI; multi-channel destination — deferred                                                                           |
| Zakaz multi-`AudioContext` / stubów Out 3–4                 | `limit`            | Egzekwowane: UI nie listuje HW bez `hwOutputUiAllowed`                                                                                  |

## Confirmed vs hypothesis

- **On tree:** bus→bus + anti-cycle; Zod HW patch table.
- **Justified skip:** HW UI + ChannelMerger theater bez realnych kanałów urządzenia.
- **→ TODO:** tylko residual HW WebAudio multi-out (gated) w [TODO 5.2+../../../../TODO.md).

## Następny krok eng

1. HW Out UI + ChannelMerger dopiero po profilu urządzenia z `destination.maxChannelCount` ≥ 4.
2. Solo cascade DAG — opcjonalny polish.
