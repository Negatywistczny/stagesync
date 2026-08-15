# Triage: Ocena Safety Net (#437) — dłuższy dump

**Źródło:** [Ocena-Safety-Net-StageSync-437.md](./Ocena-Safety-Net-StageSync-437.md) (Gemini / AI Exporter; Downloads `(1)` → kanon)  
**Status:** `partial`  
**Obszar:** Master/Spare · manual promote · MIDI mute · docs honesty · shared data · G-gates  
**Data triage:** 2026-07-26  
**Companion:** [Safety-Net-dla-StageSync-v5.2.triage.md](./Safety-Net-dla-StageSync-v5.2.triage.md) · [#437](https://github.com/kacperczeczot/stagesync/issues/437)

## Provenance

Ten dump = **kanon** (KEEP architektury + REVISE docs; Decision 5 = shared dir OK jako prosta ścieżka). Krótszy sibling v1 (Decision 5 = REVISE / odrzuć NFS/SMB) usunięty z repo jako `superseded`.

## Werdykt przydatności

**Wysoka — potwierdza MVP Safety Net jako uczciwy Hot Standby, nie Zero-Glitch HA.** KEEP 1–4 zgodne z companion Safety Net i dyskiem. REVISE docs (Manual Hot Standby / zewnętrzny switch audio) = hipoteza docs operatorskiej. Shared data vs CRIT-RES D7 — **nie rozstrzygać bez PO**.

## Macierz

| ID                   | Temat                                          | Werdykt     | Stan                | Notatka                                                 |
| -------------------- | ---------------------------------------------- | ----------- | ------------------- | ------------------------------------------------------- |
| CRIT-SN-01           | Nazwy Master/Spare                             | KEEP        | `on-tree`           | Env + API                                               |
| CRIT-SN-02           | Manual promote only                            | KEEP        | `on-tree` / `limit` | Auto-election = TODO residual                           |
| CRIT-SN-03           | MIDI mute Spare                                | KEEP        | `on-tree`           | `isMidiOutAllowed`                                      |
| CRIT-SN-04           | Brak Docker=HA / G-gates bez HW                | KEEP        | `confirmed`         | Polityka TODO — bez claim green                         |
| Decyzja 5 (ten dump) | Shared data dir MVP                            | KEEP (soft) | `hypothesis`        | „Wspólny dir / mirror” — vs v1 REVISE i CRIT-RES REVERT |
| CRIT-SN-06 / docs    | Zawęzić claim do Operator-Assisted Hot Standby | REVISE      | `hypothesis`        | DESKTOP/INSTALL — bez marketingu HA                     |
| PO Q                 | PAUSE po Przejmij; mDNS/WS clients; host-token | —           | `hypothesis`        | Sprawdzić runtime promote → transport state             |

## Confirmed vs hypothesis

- **On tree:** Master/Spare, promote, MIDI mute.
- **Limit:** auto-election Later.
- **Open:** storage model Spare; docs wording; PAUSE-after-promote.

## Następny krok

1. Smoke Master+Spare na dwóch hostach — bez claim green.
2. Q&A PO: shared dir vs local-first (rozstrzygnąć konflikt z v1 / CRIT-RES).
3. Docs: uniknąć „seamless HA” — tylko gdy PO zatwierdzi brzmienie.
