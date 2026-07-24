# Triage: Logika edycji klipów (Logic Pro)

**Źródło:** [Logika-Edycji-Klipow-Logic-Pro.md](./Logika-Edycji-Klipow-Logic-Pro.md)  
**Status:** `open`
**Obszar:** Timeline DAW / snap / drag / overlap  
**Data triage:** 2026-07-24

## Werdykt przydatności

**Wysoka wartość produktowa.** Absolute vs relative snap, tryby drag, no-overlap (tryb vs parametr) — dobre źródło luk względem [ADR 0007](../../../adr/0007-snap-grid.md) / [ADR 0008](../../../adr/0008-timeline-clip-editing.md). Nie kopiować chrome Logic; weryfikować **zachowanie**.

## Co zachować vs overlap

| W dumpie | Stan w repo |
|----------|-------------|
| Absolute / relative snap | Porównać z implementacją + ADR 0008 |
| Drag modes + no-overlap | ADR 0007/0008 — sprawdzić luki |
| Modifiers Control/Shift jak w Logic | Tylko jeśli parity v4 / decyzja PO |

## Następny krok

Macierz: zachowanie Logic (dump) × ADR × kod → lista delt do TODO dopiero po weryfikacji (parity FIRST).
