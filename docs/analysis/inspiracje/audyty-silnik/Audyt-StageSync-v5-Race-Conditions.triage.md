# Triage: Audyt race conditions (setlista / auto-advance)

**Źródło:** [Audyt-StageSync-v5-Race-Conditions.md](./Audyt-StageSync-v5-Race-Conditions.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Setlista + auto-advance vs FOH / WS / Ghost ID  
**Data triage:** 2026-07-25  
**Ostatnia aktualizacja:** 2026-07-25 (SET-02 WS snapshot + SET-04 null poza listą)

## Werdykt przydatności

**Rozszerzenie warstwy setlisty** względem audytu Transport SSOT (usunięty; historia w git). BUG-SET-01/03/05 rozstrzygnięte wcześniej; **SET-02** i **SET-04** naprawione w tej fali. Otwarte: concurrent PUT/PATCH (06).

## Rozstrzygnięte

| ID         | Temat                                      | Stan       | Notatka                                                            |
| ---------- | ------------------------------------------ | ---------- | ------------------------------------------------------------------ |
| BUG-SET-01 | Auto-advance await I/O vs Seek/Pause FOH   | `fixed`    | `stillPastEnd` po każdym await                                     |
| BUG-SET-02 | Brak WS event po `PUT/PATCH` setlisty      | `fixed`    | `setlist_snapshot` na `/ws/transport` + hub; Client/Admin/Timeline |
| BUG-SET-03 | Ghost ID → unhandled rejection             | `rejected` | Prune + catch/finally                                              |
| BUG-SET-04 | `resolveSetlistNext` poza setlistą → first | `fixed`    | Zwraca `null` (align z Client UI); auto-advance → stop             |
| BUG-SET-05 | HTTP `getTransport` vs WS tick             | `fixed`    | Brak HTTP w `ws.onopen`                                            |

## Otwarte / hipotezy

| ID         | Temat                                  | Impact | Stan         | Dlaczego ciekawe                       |
| ---------- | -------------------------------------- | ------ | ------------ | -------------------------------------- |
| BUG-SET-06 | Równoległe PUT + PATCH setlist bez OCC | Średni | `hypothesis` | Last-write-wins; bez repro multi-Admin |

## Następny krok eng

1. SET-06 tylko po repro multi-Admin.
2. Smoke: Admin zmienia setlistę przy otwartym Client — „następny” odświeża się bez zmiany utworu.
