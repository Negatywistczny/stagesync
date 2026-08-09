# Triage: Luki testów tras systemowych (`routes/system`)

**Źródło:** [Analiza-Testow-System-Routes.md](./Analiza-Testow-System-Routes.md) (Gemini Deep Search)  
**Status:** `closed`  
**Obszar:** `apps/server` — PIN, Safety Net, settings, backup/restore, lifecycle, update  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage [`system.ts`](../../../../apps/server/src/routes/system.ts) **77.9%** lines / **65.18%** branches (`system-settings-routes`, `system-routes`, `update-status`)

## Werdykt przydatności

**Średnia–wysoka.** Wszystkie pozycje P0/P1 rozstrzygnięte (fixed lub rejected); settings/restore/update-status/SSE w dedykowanych testach.

## Priorytety weryfikacji

| ID         | Temat                                                              | Priorytet | Stan       | Dowód                                                                                                                                                                       |
| ---------- | ------------------------------------------------------------------ | --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TST-SYS-01 | `assertLifecycleAllowed` — loopback vs LAN + `HOST_TOKEN`          | P0        | `rejected` | [`lifecycle-guard.test.ts`](../../../../apps/server/src/lifecycle-guard.test.ts) — matryca IP/token                                                                         |
| TST-SYS-02 | POST `/promote` — pause transport gdy `PLAYING`                    | P0        | `rejected` | [`safety-net-api.test.ts`](../../../../apps/server/src/safety-net-api.test.ts) — „pauses PLAYING transport on promote…”                                                     |
| TST-SYS-03 | `/operator-auth` GET/POST — PIN                                    | P0        | `rejected` | [`operator-pin-api.test.ts`](../../../../apps/server/src/operator-pin-api.test.ts) — required, 403/200 unlock                                                               |
| TST-SYS-04 | PUT `/settings` — `PutServerSettingsBodySchema`, `restartRequired` | P1        | `fixed`    | [`system-settings-routes.test.ts`](../../../../apps/server/src/system-settings-routes.test.ts) + [`settings-api.test.ts`](../../../../apps/server/src/settings-api.test.ts) |
| TST-SYS-05 | Restore ZIP error paths                                            | P1        | `fixed`    | [`system-routes.test.ts`](../../../../apps/server/src/system-routes.test.ts) — corrupt ZIP + traversal                                                                      |
| TST-SYS-06 | `fetchLatestReleaseVersion` — GitHub errors                        | P2        | `fixed`    | [`update-status.test.ts`](../../../../apps/server/src/update-status.test.ts) — mock GitHub errors                                                                           |
| TST-SYS-07 | `/logs/stream` SSE disconnect                                      | P2        | `fixed`    | [`system-routes.test.ts`](../../../../apps/server/src/system-routes.test.ts) — SSE line + abort                                                                             |

## Limit

Branches **65.18%** — brak otwartych `confirmed`; reszta to rejected lub fixed.
