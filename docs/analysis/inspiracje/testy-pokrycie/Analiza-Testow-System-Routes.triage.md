# Triage: Luki testów tras systemowych (`routes/system`)

**Źródło:** [Analiza-Testow-System-Routes.md](./Analiza-Testow-System-Routes.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `apps/server` — PIN, Safety Net, settings, backup/restore, lifecycle, update  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27

## Werdykt przydatności

**Średnia–wysoka.** Dump przecenia braki P0 — część tras ma już dedykowane testy w osobnych plikach (nie tylko `system-routes.test.ts`).

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Dowód |
|----|--------|-----------|------|--------|
| TST-SYS-01 | `assertLifecycleAllowed` — loopback vs LAN + `HOST_TOKEN` | P0 | `rejected` | `lifecycle-guard.test.ts` — matryca IP/token |
| TST-SYS-02 | POST `/promote` — pause transport gdy `PLAYING` | P0 | `rejected` | `safety-net-api.test.ts` — „pauses PLAYING transport on promote…” |
| TST-SYS-03 | `/operator-auth` GET/POST — PIN | P0 | `rejected` | `operator-pin-api.test.ts` — required, 403/200 unlock |
| TST-SYS-04 | PUT `/settings` — `PutServerSettingsBodySchema`, `restartRequired` | P1 | `fixed` | `system-settings-routes.test.ts` + `settings-api.test.ts` |
| TST-SYS-05 | Restore ZIP error paths | P1 | `fixed` | `system-routes.test.ts` — corrupt ZIP + traversal |
| TST-SYS-06 | `fetchLatestReleaseVersion` — GitHub errors | P2 | `fixed` | `update-status.test.ts` — mock GitHub errors |
| TST-SYS-07 | `/logs/stream` SSE disconnect | P2 | `fixed` | `system-routes.test.ts` — SSE line + abort |

## Następny krok eng

Backlog P1 domknięty w fazie 2; brak otwartych P0.
