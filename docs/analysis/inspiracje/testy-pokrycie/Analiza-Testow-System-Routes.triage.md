# Triage: Luki testów tras systemowych (`routes/system`)

**Źródło:** [Analiza-Testow-System-Routes.md](./Analiza-Testow-System-Routes.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `apps/server` — PIN, Safety Net, settings, backup/restore, lifecycle, update  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Wysoka (operatorskie / bezpieczeństwo).** Częściowe pokrycie lifecycle i logs; brak HTTP dla `/operator-auth`, `/promote`+transport pause ([ADR 0017](../../../adr/0017-live-show-control.md)), PUT `/settings` Zod, restore ZIP error paths, mock GitHub przy update check.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-SYS-01 | `assertLifecycleAllowed` — loopback vs LAN + `HOST_TOKEN` | P0 | `hypothesis` | Matryca env + request IP mock |
| TST-SYS-02 | POST `/promote` — pause transport gdy `PLAYING` | P0 | `hypothesis` | Mock `TransportEngine` |
| TST-SYS-03 | `/operator-auth` GET/POST — PIN required, invalid body | P0 | `hypothesis` | |
| TST-SYS-04 | PUT `/settings` — `PutServerSettingsBodySchema`, `restartRequired` | P1 | `hypothesis` | |
| TST-SYS-05 | Restore: `restoreFromZipArchive` error paths | P1 | `hypothesis` | Tmp zip fixture |
| TST-SYS-06 | `fetchLatestReleaseVersion` — GitHub 401/403/404/timeout | P2 | `hypothesis` | Mock `fetch` |
| TST-SYS-07 | `/logs/stream` SSE — disconnect bez race/leak | P2 | `hypothesis` | AbortController pattern |

## Kontekst

- Env: `STAGESYNC_HOST_TOKEN`, `STAGESYNC_ALLOW_REMOTE_LIFECYCLE`.
- Safety Net shipped 5.2.x — testy promote = regresja sceniczna, nie nowy feature.

## Następny krok eng

Rozszerzyć `system-routes.test.ts` o TST-SYS-02/03; lifecycle matrix TST-SYS-01.
