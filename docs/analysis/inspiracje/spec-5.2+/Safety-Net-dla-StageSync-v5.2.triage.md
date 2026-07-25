# Triage: Safety Net (Master / Spare failover) — intro 5.2+ (#437)

**Źródło:** [Safety-Net-dla-StageSync-v5.2.md](./Safety-Net-dla-StageSync-v5.2.md) (Gemini / AI Exporter)  
**Status:** `open`  
**Obszar:** Hot standby · manual promote · lease / split-brain · MIDI mute na Spare  
**Data triage:** 2026-07-25  
**Kąt:** wprowadzenie feature 5.2+ (nie claim HA green / G-gates)

## Werdykt przydatności

**Wysoka jako granica produktu: manual promote MVP, auto-election Later; zakaz dual clock / dual MIDI OUT.** Companion do [Audyt Lifecycle](../audyty-silnik/Audyt-Lifecycle-StageSync-v5-Desktop.triage.md) (port/orphan/mDNS), nie zamiennik. [#437](https://github.com/Negatywistyczny/stagesync/issues/437) w [TODO 5.2+](../../../TODO.md).

## Epiki / tematy vs `main` (5.1.x)

| ID / temat | Stan | Notatka |
|------------|------|---------|
| SN-01…03 Master vs Spare (PASSIVE_MIRROR, MIDI off) | `hypothesis` | Brak roli spare / `isMaster` gate w produkcie — **confirmed gap** |
| SN-04…06 detekcja + workflow promote | `hypothesis` | Brak `POST /api/system/promote` / UI „Przejmij” |
| SN-07…08 sync projektu/setlisty vs lokalny AudioContext | `hypothesis` | Sensowny podział; nie implementować sync WebAudio |
| SN-09…11 split-brain / dual PC·Clock / drugi Master w LAN | `hypothesis` | Mitygacje dumpa = wymagania MVP |
| SN-12 MVP manual + shared data dir + Launcher status | `hypothesis` | Zakres 5.2 |
| SN-13 auto-election / HW switchers / P2P | `limit` | Dump: v5.3+ |
| Integracja HW-LIF-* (orphan port, host token) | `partial` | Część lifecycle już na desktop; Safety Net nie podpięty |

## Confirmed vs hypothesis

- **Confirmed gap:** brak failover / promote / role=spare w apps (grep promote ≠ Safety Net).
- **Nie** claim „Docker = HA”. Nie stubować przycisku Przejmij bez MIDI gate.

## Następny krok eng

MVP: Launcher status Master/Spare + manual promote + twarde wyłączenie MIDI OUT na Spare. Cross-link Lifecycle triage przy implementacji.
