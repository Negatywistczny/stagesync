# Triage: Niezawodność decyzji Live Production (CRIT-RES-01)

**Źródło:** [Ocena-Decyzji-Produktowych-StageSync.md](./Ocena-Decyzji-Produktowych-StageSync.md) (Gemini / AI Exporter; dłuższy dump `(1)` → kanon)  
**Status:** `partial`  
**Obszar:** Safety Net · MIDI Spare · Backup Przywróć · auto-update · Offline-First · shared data dir  
**Data triage:** 2026-07-26  
**Companion:** [Safety-Net-dla-StageSync-v5.2.triage.md](./Safety-Net-dla-StageSync-v5.2.triage.md) · [Ocena-Safety-Net-StageSync-437.triage.md](./Ocena-Safety-Net-StageSync-437.triage.md) · [ADR 0015](../../../adr/0015-daw-reference-and-product-decisions.md)

## Provenance / duplikaty

| Plik | Rola |
|------|------|
| Ten dump (168 linii) | **Kanon** — reliability / live production (D1–D7) |
| [Ocena-Decyzji-Produktowych-StageSync-v1.md](./Ocena-Decyzji-Produktowych-StageSync-v1.md) | **Inny** eksport Gemini (CRIT-MX mikser FOH) — nie draft tego samego tekstu; osobny triage |

## Werdykt przydatności

**Wysoka dla Safety Net + ops.** KEEP na manual promote, MIDI mute Spare, auto-update NIE, git-apply OUT, Offline-First — zgodne z ADR 0015 / Safety Net triage. REVISE Backup GUI — **nadpisane** shipem `5.2.1` (Przywróć on-tree). REVERT shared NFS — nadal otwarte vs hipoteza shared data w Safety Net.

## Macierz vs dysk / ADR

| ID | Decyzja | Werdykt dumpu | Stan | Notatka |
|----|---------|---------------|------|---------|
| D1 | Safety Net manual promote; auto-election Later | KEEP | `on-tree` / `limit` | Role + promote API; auto-election = TODO residual |
| D2 | MIDI OUT/Clock off na Spare | KEEP | `on-tree` | `isMidiOutAllowed()` |
| D3 | Backup Przywróć GUI = backlog | REVISE | `rejected` (claim) / `on-tree` | Admin **Przywróć…** `.bak`/ZIP w `5.2.1` — luka dumpu zamknięta |
| D4 | Auto-update permanent NIE | KEEP | `confirmed` | ADR 0015 |
| D5 | git-apply / Aktualizuj teraz OUT | KEEP | `confirmed` | ADR 0015 |
| D6 | Offline-First + dialog Zastosuj | KEEP | `on-tree` | #692 MVP; delta = residual |
| D7 | Shared data dir NFS/SMB | REVERT | `hypothesis` | Dump: local SSD + async WS; Safety Net triage = shared dir hipoteza — **re-open PO** |

## Confirmed vs hypothesis

- **On tree:** D1/D2/D6 MVP; D3 Przywróć (po dumpu).
- **ADR KEEP:** D4/D5.
- **Open:** model storage Spare (D7 / CRIT-SN-05); hard PAUSE po promote (pytanie PO w Safety Net).

## Następny krok

1. Nie wracać D3 do backlogu — już w produkcie.
2. Q&A PO: local-first vs shared dir; PAUSE po Przejmij.
3. Bez claim HA / G-gates green.
