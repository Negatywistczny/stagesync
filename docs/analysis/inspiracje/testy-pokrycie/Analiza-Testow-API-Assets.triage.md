# Triage: Luki testów API Assets (`routes/assets`)

**Źródło:** [Analiza-Testow-API-Assets.md](./Analiza-Testow-API-Assets.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `apps/server` — `routes/assets.ts`, [`assets-helpers.ts`](../../../../apps/server/src/routes/assets-helpers.ts)  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage [`assets.ts`](../../../../apps/server/src/routes/assets.ts) **68.81%** lines / **51.21%** branches ([`assets-helpers.ts`](../../../../apps/server/src/routes/assets-helpers.ts) wydzielony, helpers unit ~100%)

## Werdykt przydatności

**Średnia–wysoka.** 413, multipart matrix, invalid ids — dodane; stream error mid-response nadal trudny deterministycznie.

## Priorytety weryfikacji

| ID         | Temat                                         | Priorytet | Stan    | Dowód                                                                                  |
| ---------- | --------------------------------------------- | --------- | ------- | -------------------------------------------------------------------------------------- |
| TST-AST-01 | MIME / ext matrix                             | P1        | `fixed` | [`assets-helpers.test.ts`](../../../../apps/server/src/routes/assets-helpers.test.ts)  |
| TST-AST-02 | Multipart `.flac`/`.mxl` + trackId/startTicks | P1        | `fixed` | [`assets-router-unit.test.ts`](../../../../apps/server/src/assets-router-unit.test.ts) |
| TST-AST-03 | Multer `LIMIT_FILE_SIZE` → 413                | P0        | `fixed` | `uploadSingleFileForTests` spy                                                         |
| TST-AST-04 | `createReadStream` error paths                | P1        | `limit` | `getAssetFilePath` throw zamiast mock stream (uncaught)                                |
| TST-AST-05 | Invalid `projectId` / `assetId`               | P1        | `fixed` | [`assets-router-unit.test.ts`](../../../../apps/server/src/assets-router-unit.test.ts) |

## Limit

Lines **68.81%** / branches **51.21%** — brakuje pełnego stream 500 po `headersSent` bez flaky uncaught (TST-AST-04 `limit`).
