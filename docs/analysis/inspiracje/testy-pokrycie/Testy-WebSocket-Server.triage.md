# Triage: Luki testów WebSocket transport (`transport/ws`)

**Źródło:** [Testy-WebSocket-Server.md](./Testy-WebSocket-Server.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `apps/server` — `/ws/transport`, broadcast, presence, huby opcjonalne  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage `ws.ts` **81.37%** lines / **89.65%** branches (`ws.integration.test.ts` + `broadcastJson` try/catch)

## Werdykt przydatności

**Wysoka (scena live).** Integracja multi-client + cleanup domknięta; pozostałe luki: pełne handshake wszystkich hubów, 100% lines.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Dowód |
|----|--------|-----------|------|--------|
| TST-WS-01 | Handshake: tick + opcjonalne liveDesk/setlist/stage snapshots | P0 | `fixed` | `ws.integration.test.ts` — hub snapshot frames |
| TST-WS-02 | `transport.onChange` — wielu klientów, skip `CLOSED` | P0 | `fixed` | `ws.integration.test.ts` — dual client broadcast |
| TST-WS-03 | `client_hello` — presence upsert, malformed JSON ignored | P1 | `fixed` | `ws.integration.test.ts` — hello + bad JSON |
| TST-WS-04 | Message length > 8192 — drop | P1 | `fixed` | `ws.integration.test.ts` — 9k payload |
| TST-WS-05 | `wss.close` — unsubscribe wszystkich hubów | P0 | `fixed` | `ws.integration.test.ts` — no tick after close |
| TST-WS-06 | `send()` error mid-broadcast — reszta klientów dostaje tick | P1 | `fixed` | `broadcastJson` + `ws.integration.test.ts` |

## Limit

Lines **81.37%** (cel 100%) — gałęzie error-path `wss` init / edge hubów bez pełnego stub matrix.
