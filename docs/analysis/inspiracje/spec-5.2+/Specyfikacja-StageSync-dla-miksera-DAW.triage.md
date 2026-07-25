# Triage: Mixer HW Out 3–4 + bus→bus — intro 5.2+

**Źródło:** [Specyfikacja-StageSync-dla-miksera-DAW.md](./Specyfikacja-StageSync-dla-miksera-DAW.md) (Gemini / AI Exporter)  
**Status:** `open`  
**Obszar:** `audioHardwareOutputs` · `MixerOutputTarget` · DAG bus→bus · ChannelMerger multi-out  
**Data triage:** 2026-07-25  
**Kąt:** wprowadzenie feature 5.2+ (nie re-audyt bugów 5.1 Mixer)

## Werdykt przydatności

**Wysoka — rekomendacja modelu (logical HW patch table + unified target) + anti-cycle DFS + ograniczenia `maxChannelCount`.** **Kolizja / companion:** limity DEF-ADR-01/02 w [Audyt Routingu Miksera](../audyty-silnik/Audyt-Routingu-Miksera-StageSync.triage.md) (`limit` → TODO Out 3–4 / bus→bus). Ten dump = **design 5.2**, nie claim że multi-out działa.

## Epiki / tematy vs `main` (5.1.x)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| MX-OUT-01…04 HW outs + meters + mute/solo | `hypothesis` | Brak `audioHardwareOutputs` / `hw_out` — **confirmed gap** |
| MX-BUS-01 bus→bus | `hypothesis` | `BusOutputDestSchema` tylko `master` — **confirmed gap** |
| MX-BUS-02 anti-cycle Zod + fail-soft | `hypothesis` | Wymagane przy bus→bus |
| MX-BUS-03 solo cascade / track-wins | `partial` | Track solo wins już `fixed` w audycie miksera; kaskada DAG — przy feature |
| WebAudio discrete ChannelMerger + OS speaker config warning | `hypothesis` | `setSinkId` istnieje; multi-channel destination — nie |
| Zakaz multi-`AudioContext` / stubów Out 3–4 | `limit` / polityka | Zgodne ADR 0011 — już egzekwowane brakiem atrap |

## Confirmed vs hypothesis

- **Confirmed gap:** `MixerOutputDest` = master\|bus; bus output → tylko master (`mixer-routing.ts`).
- Pozycje już w [TODO 5.2+](../../../TODO.md) (Out 3–4, bus→bus) — bez nowej promocji z dumpu.
- Bugi 5.1 Mixer (peak, dezipper, …) — **nie** reotwierać tu; patrz triage audytu (`closed`/`partial`).

## Następny krok eng

Przy planowaniu linii: najpierw model Zod + DFS; UI OutputSelector dopiero gdy runtime `maxChannelCount` ≥ 4 i graf HW żyje. Nie renderować „Out 3–4 wkrótce”.
