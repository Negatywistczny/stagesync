# Triage: Ocena Safety Net (#437) — krótszy dump (v1)

**Źródło:** [Ocena-Safety-Net-StageSync-437-v1.md](./Ocena-Safety-Net-StageSync-437-v1.md) (Gemini / AI Exporter; Downloads bez `(1)`)  
**Status:** `superseded`  
**Obszar:** Master/Spare · shared data dir REVISE · docs honesty  
**Data triage:** 2026-07-26  
**Następca:** [Ocena-Safety-Net-StageSync-437.triage.md](./Ocena-Safety-Net-StageSync-437.triage.md) (dłuższy kanon)

## Dlaczego superseded

Ten sam temat #437; dłuższy dump `(1)` jest kanonicznym dumpem w indeksie. **Zachować** ten plik jako provenance — różni się istotnie na Decision 5.

## Różnica materialna vs kanon

| Temat | v1 (ten) | Kanon (dłuższy) |
|-------|----------|-----------------|
| Shared data dir / NFS-SMB | **REVISE** → local SSD + async WS | Soft **KEEP** jako prosta ścieżka MVP |
| KEEP Master/Spare, manual, MIDI mute, no Docker=HA | Zgodne | Zgodne |
| Docs „Manual Hot Standby” | REVISE | REVISE (podobnie) |

Werdykt shared-dir z v1 jest **zbieżny** z CRIT-RES D7 ([Ocena-Decyzji-Produktowych-StageSync.triage.md](./Ocena-Decyzji-Produktowych-StageSync.triage.md)) — przy Q&A PO cytować **oba** dumpy, nie tylko kanon.

## Stan wierszy (nie backlog automatyczny)

| Temat | Stan |
|-------|------|
| KEEP 1–4 (nazwy, manual, MIDI, G-gates) | `confirmed` / `on-tree` (jak companion Safety Net) |
| REVISE shared NFS | `hypothesis` — otwarte vs kanon |
| Pytania PO (PAUSE, mDNS, token, Syncthing) | `hypothesis` |

## Następny krok

Rozstrzygnięcie storage Spare wyłącznie przez PO; eng nie wybiera między v1 a kanonem bez decyzji.
