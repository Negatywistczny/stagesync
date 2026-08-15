# Triage: Safety Net (Master / Spare failover) — intro 5.2+ (#437)

**Źródło:** [Safety-Net-dla-StageSync-v5.2.md](./Safety-Net-dla-StageSync-v5.2.md) (Gemini / AI Exporter)  
**Status:** `partial`  
**Obszar:** Hot standby · manual promote · lease / split-brain · MIDI mute na Spare  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-08-02 (usunięty superseded dump v1)  
**Kąt:** wprowadzenie feature 5.2+ (nie claim HA green / G-gates)  
**Review decyzji:** [Ocena-Safety-Net-StageSync-437.triage.md](./Ocena-Safety-Net-StageSync-437.triage.md)

## Werdykt przydatności

**Wysoka jako granica produktu: manual promote MVP, auto-election Later; zakaz dual clock / dual MIDI OUT.** Companion do [Audyt Lifecycle](../audyty-silnik/Audyt-Lifecycle-StageSync-v5-Desktop.triage.md). [#437](https://github.com/kacperczeczot/stagesync/issues/437). Nazwa: **Master/Spare**.

## Epiki / tematy vs `main`

| ID / temat                          | Stan               | Notatka                                                                            |
| ----------------------------------- | ------------------ | ---------------------------------------------------------------------------------- |
| SN-01…03 Master vs Spare (MIDI off) | `on-tree`          | `STAGESYNC_SAFETY_ROLE`; Spare → `isMidiOutAllowed() === false` w MIDI host        |
| SN-04…06 promote                    | `on-tree`          | `GET /api/system/safety-net`, `POST /api/system/promote` + Admin Host **Przejmij** |
| SN-07…08 sync projektu              | `hypothesis`       | Shared data dir — poza tym slice                                                   |
| SN-09…11 split-brain                | `hypothesis`       | Residual — nie claim HA                                                            |
| SN-12 MVP manual + status           | `on-tree`          | Env + managed settings + UI                                                        |
| SN-13 auto-election                 | **skip** / `limit` | Dump: Later — **nie** implementować                                                |

## Confirmed vs hypothesis

- **On tree:** role + MIDI mute Spare + manual promote.
- **Justified skip:** auto-election / HW switchers / P2P.
- **→ TODO:** residual auto-election w [TODO 5.2+../../../../TODO.md) (MVP manual promote poza TODO).

## Następny krok eng

Operacyjny smoke Master+Spare na dwóch hostach (shared data) — bez claim green. Auto-election = Later.
