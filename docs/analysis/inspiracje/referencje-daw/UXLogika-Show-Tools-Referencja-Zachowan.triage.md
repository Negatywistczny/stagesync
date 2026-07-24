# Triage: UX/logika Show Tools (Follow Actions / setlista FOH)

**Źródło:** [UXLogika-Show-Tools-Referencja-Zachowan.md](./UXLogika-Show-Tools-Referencja-Zachowan.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** Setlista / auto-advance / pause-at-end / FSM transportu vs Ableton·QLab·MainStage  
**Data triage:** 2026-07-25

## Werdykt przydatności

**Bardzo dobra macierz MUST vs OUT** (FA-01…15) i zasada priorytetu operatora FOH. Część dumpu jest **aspiracyjna** (stany `Waiting-for-end` / `Advancing` / `Failed-load`, `loadToken`, `stateVersion`) — w kodzie nie weryfikowano pełnego pięciostanowego FSM pod tymi nazwami. Wyścigi FOH → rozstrzygać w [Race Conditions](../audyty-silnik/Audyt-StageSync-v5-Race-Conditions.triage.md) + [Transport SSOT](../audyty-silnik/Audyt-Synchronizacji-Transport-SSOT.triage.md), nie implementować „tokenów” z dumpu na ślepo.

## Macierz FA — status triage

| ID | Temat | Stan | Notatka |
|----|--------|------|---------|
| FA-01 | Auto-advance (Follow Next) | `hypothesis` | IN produktowo; race I/O → `stillPastEnd` już w silniku |
| FA-02 | Pause-at-end | `hypothesis` | IN; soft-stop audio — Transport triage |
| FA-03 | Loop song/section | `limit` | Dump: LATER |
| FA-04 / 05 / 11 / 14 | Prev/Next, direct select, section jump, GO | `hypothesis` | IN wg dumpu — smoke FOH |
| FA-06 / 12 / 13 | Chance %, nested cues, video/lighting | `limit` | Dump: OUT — trzymać |
| FA-07 / 08 / 09 | Form boundary, flat setlist, auto-advance toggle | `hypothesis` | Zgodne z ADR 0002 / modelem setlisty |
| FA-10 | Break items (minuty) | `hypothesis` | IN wg dumpu |
| FA-15 | Countdown ≤ 0 ticks | `hypothesis` | Aksjomat Granicy 0 |

## Propozycje algorytmiczne dumpu (ostrożnie)

| Propozycja | Stan | Notatka |
|------------|------|---------|
| `pendingPlayOnLoad` przy PLAY w trakcie advance | `hypothesis` | Sensowna; sprawdzić czy istnieje odpowiednik w kodzie przed implementacją |
| `loadToken` / session invalidate przy SEEK/PAUSE | `hypothesis` | Częściowo pokryte przez `stillPastEnd` po await — nie dublować bez repro |
| Monotoniczny `stateVersion` HTTP vs WS | `hypothesis` | WS onopen bez HTTP już naprawione; pełny version na wszystkich ścieżkach = osobna decyzja |

## Następny krok eng

1. Traktować FA OUT jako twardą granicę produktu (nie QLab-clone).
2. Weryfikacja MUST (FA-01/02/14) = smoke FOH + triage Race/Transport.
3. Nie otwierać TODO na FSM pięciu nazwanych stanów wyłącznie z tego dumpu.
