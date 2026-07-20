# QA sign-off — alpha.7

**Cel:** zamknięcie `5.0.0-alpha.7` — smoke przed tagiem.  
**Scope must:** [report-scope-alpha7.md](./report-scope-alpha7.md).  
**Plan:** [report-implementation-plan-alpha7.md](./report-implementation-plan-alpha7.md).

Legenda: ✅ OK · ⚠️ OK z zastrzeżeniem · 🔜 odłożone · ❌ fail blocker

**Data sign-off:** 2026-07-20

---

## Automatyzacja (ostatni run)

| Warstwa | Wynik | Uwagi |
|---------|-------|-------|
| `pnpm lint` | ✅ | |
| `pnpm check-types` | ✅ | |
| `pnpm test` | ✅ | shared 75 + web 37 + server 28 (+ ui) |
| `pnpm build` | ✅ | |

---

## Must α7

| ID | Kryterium | Status | Notatka |
|----|-----------|--------|---------|
| M1 | Scope + ADR 0008 Accepted | ✅ | report-scope/plan-alpha7 |
| M2 | Shared no-overlap + guards | ✅ | `clip-collision.ts` + Vitest |
| M3 | Pencil drag Forma | ✅ | preview → commit; clamp ≥ 0 |
| M4 | Pointer move/resize | ✅ | body/brzeg; Countdown locked |
| M5 | Delete / eraser | ✅ | luki zostają; nie CD |
| M6 | Smart Tool + exclusivity | ✅ | zones tylko pointer\|smart |
| M7 | Snap Cmd/Ctrl live | ✅ | re-eval na pointermove |

---

## Should α7

| Wycinek | Status |
|---------|--------|
| Schema v4 content lanes | ✅ |
| Lane Tekst MVP + karaoke line | ✅ |
| Akordy / Cue edit | 🔜 cut (schema only) |
| Scissors Forma | 🔜 cut |
| Tap / UG / Różdżka | 🔜 cut (disabled) |

---

## Smoke (ręczny — przed tagiem)

1. Pencil click = 1 takt @ snap  
2. Pencil drag = multi-bar + overwrite  
3. Pointer move/resize + no-overlap  
4. Delete sekcji (nie CD)  
5. Smart zones; Pencil nad krawędzią = insert  
6. Cmd w trakcie drag = snap off; brak pre-roll &lt; 0  
7. Zapisz → reload  

---

## Werdykt

**Must α7:** domknięte w kodzie i CI. Tag `v5.0.0-alpha.7` na prośbę (po ręcznym smoke #1–#7).  
Working tree na `feat/alpha-7-timeline-edit` — bez push/PR/tagu w tym przebiegu.
