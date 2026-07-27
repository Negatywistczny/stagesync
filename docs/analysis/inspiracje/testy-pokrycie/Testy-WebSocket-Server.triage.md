# Triage: Luki testów WebSocket transport (`transport/ws`)

**Źródło:** [Testy-WebSocket-Server.md](./Testy-WebSocket-Server.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `apps/server` — `/ws/transport`, broadcast, presence, huby opcjonalne  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Wysoka (scena live).** `transport-api.test.ts` = pojedynczy klient; dump identyfikuje multi-client fanout, malformed JSON, limit 8192, cleanup przy `wss.close`, brak `try/catch` na `send` do zamykającego się socketu.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-WS-01 | Handshake: tick + opcjonalne liveDesk/setlist/stage snapshots | P0 | `hypothesis` | Stuby hubów; assert kolejność ramek |
| TST-WS-02 | `transport.onChange` — wielu klientów, skip `CLOSED` | P0 | `hypothesis` | 2× WebSocket client localhost |
| TST-WS-03 | `client_hello` — presence upsert, malformed JSON ignored | P1 | `hypothesis` | Zod parse + brak throw |
| TST-WS-04 | Message length > 8192 — drop | P1 | `hypothesis` | Buffer 9k |
| TST-WS-05 | `wss.close` — unsubscribe wszystkich hubów | P0 | `hypothesis` | Spy `off` / brak leak listenerów |
| TST-WS-06 | `send()` error mid-broadcast — reszta klientów dostaje tick | P1 | `hypothesis` | Mock socket throw na 2. kliencie |

## Kontekst

- Powiązane: [Audyt-Synchronizacji-Transport-SSOT.triage.md](../audyty-silnik/Audyt-Synchronizacji-Transport-SSOT.triage.md) (`partial`).
- Wzorzec testów: prawdziwy WS na losowym porcie (jak istniejące).

## Następny krok eng

Nowy plik `transport-ws.integration.test.ts` lub rozszerzenie `transport-api.test.ts` o TST-WS-02/05.
