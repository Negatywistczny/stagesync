# Triage: Audyt race conditions (setlista / auto-advance)

**Źródło:** [Audyt-StageSync-v5-Race-Conditions.md](./Audyt-StageSync-v5-Race-Conditions.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** Setlista + auto-advance vs FOH / WS / Ghost ID  
**Data triage:** 2026-07-25

## Werdykt przydatności

**Rozszerzenie warstwy setlisty** względem [Transport SSOT](./Audyt-Synchronizacji-Transport-SSOT.triage.md). BUG-SET-01/05 pokrywają się z już **`fixed`** BUG-SSV5-02 / 01+06. Ghost ID (03) — dump **nieaktualny** (`pruneSetlistToLibrary` przy `deleteProject` + `try/catch` + `finally inFlight=false` w `auto-advance.ts`). Najciekawsze otwarte: **brak WS push setlisty (02)**, concurrent PUT/PATCH (06), semantyka bis / `resolveSetlistNext` poza listą (04).

## Rozstrzygnięte w tej fali (grep / read)

| ID | Temat | Stan | Notatka |
|----|--------|------|---------|
| BUG-SET-01 | Auto-advance await I/O vs Seek/Pause FOH | `fixed` | `stillPastEnd` po każdym await — jak BUG-SSV5-02 |
| BUG-SET-03 | Ghost ID → unhandled rejection / `inFlight` stuck | `rejected` | Prune przy delete; catch+finally w `auto-advance.ts` |
| BUG-SET-05 | HTTP `getTransport` vs WS tick przy reconnect | `fixed` | Brak HTTP w `ws.onopen` (komentarz w `TransportProvider.tsx`) |

## Otwarte / hipotezy

| ID | Temat | Impact | Stan | Dlaczego ciekawe |
|----|--------|--------|------|------------------|
| BUG-SET-02 | Brak WS event po `PUT/PATCH` setlisty | Wysoki (scena „następny”) | `hypothesis` | Admin zmienia kolejność; Client trzyma stary podgląd do reload/advance |
| BUG-SET-04 | `resolveSetlistNext` poza setlistą → first | Średni (bis) | `hypothesis` | Kod + test **oczekują** first — decyzja PO: `limit` vs zmiana na `null` |
| BUG-SET-06 | Równoległe PUT + PATCH setlist bez OCC | Średni (multi-Admin) | `hypothesis` | Last-write-wins na `setlist.json` |

## Rozszerzenia SSV5 w dumpie

- Overshoot audio przy auto-advance (rozszerzenie BUG-SSV5-05) — soft-stop po stronie klienta już w Transport triage; trzask przy song-switch = osobny smoke WebAudio.
- Happy-path „cache RAM zamiast disk I/O w tick loop” — optymalizacja, nie blocker bez repro latency.

## Następny krok eng

1. Decyzja PO: BUG-SET-04 — bis spoza setlisty: stop vs jump do #1.
2. Repro BUG-SET-02: dwa okna (Admin + Client) — zmiana setlisty bez reload; potem ewentualnie ramka WS.
3. Nie dublować pracy Transport/WebAudio już `fixed`.
