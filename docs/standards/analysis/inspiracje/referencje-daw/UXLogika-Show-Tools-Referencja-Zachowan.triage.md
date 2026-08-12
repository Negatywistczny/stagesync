# Triage: UX/logika Show Tools (Follow Actions / setlista FOH)

**Źródło:** [UXLogika-Show-Tools-Referencja-Zachowan.md](./UXLogika-Show-Tools-Referencja-Zachowan.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Setlista / auto-advance / pause-at-end / FSM transportu vs Ableton·QLab·MainStage  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (SET-02 WS; SET-04 null; bez FSM)

## Werdykt przydatności

**Macierz MUST vs OUT** nadal kanoniczna granica produktu. FSM pięciu stanów / `loadToken` / `pendingPlayOnLoad` — **nie** implementowane (docs-only). Live „następny” po edycji setlisty → `setlist_snapshot` (Race SET-02).

## Macierz FA — wybrane

| ID              | Temat                   | Stan         | Notatka             |
| --------------- | ----------------------- | ------------ | ------------------- |
| FA-01           | Auto-advance            | `confirmed`  | IN + `stillPastEnd` |
| FA-02           | Pause-at-end            | `confirmed`  | IN + soft-stop      |
| FA-03           | Loop song               | `limit`      | LATER               |
| FA-06 / 12 / 13 | Chance / nested / video | `limit`      | OUT                 |
| FA-04 / 05 / 14 | Prev/Next / GO          | `hypothesis` | Smoke FOH           |

## Propozycje algorytmiczne

| Propozycja                   | Stan    | Notatka                                          |
| ---------------------------- | ------- | ------------------------------------------------ |
| `pendingPlayOnLoad`          | `limit` | Brak w kodzie; Stop@home po advance = zamierzone |
| `loadToken` / `stateVersion` | `limit` | Pokryte `stillPastEnd` + brak HTTP@onopen        |

## Następny krok eng

Trzymać FA OUT. Nie budować nazwanego FSM z dumpu.
