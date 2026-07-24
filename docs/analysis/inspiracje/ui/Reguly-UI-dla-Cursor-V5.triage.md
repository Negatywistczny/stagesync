# Triage: Reguły UI dla Cursor V5 (gęstość / touch / APCA)

**Źródło:** [Reguly-UI-dla-Cursor-V5.md](./Reguly-UI-dla-Cursor-V5.md)  
**Status:** `open`
**Obszar:** Design system / gęstość / a11y kontrast  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Średnia — overlap z istniejącymi regułami.** Siatka 4pt/8pt, touch targets, APCA dark pokrywa się z [ui-density.mdc](../../../../.cursor/rules/ui-density.mdc) i `packages/ui`. Nie wklejać całego eseju; **extract deltas** względem tokenów `--ss-*`.

## Co zachować vs overlap

| W dumpie | Stan w repo |
|----------|-------------|
| 4pt/8pt density | ui-density + spacing tokens |
| 7 stanów Button / zakaz HEX | konstytucja + packages/ui |
| APCA / kontrast dark | Porównać z docs UI — tylko brakujące progi |

## Następny krok

Diff dump ↔ ui-density / `packages/ui` → maksymalnie kilka punktów Should; reszta archiwum.
