# Triage: Luki testów Ultimate Guitar fetch (`ug/ug-fetch`)

**Źródło:** [Testy-UG-Fetch.md](./Testy-UG-Fetch.md) (Gemini Deep Search)  
**Status:** `partial`  
**Obszar:** `apps/server` — HTML→js-store, search, resolve URL, błędy sieci  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage [`ug-fetch.ts`](../../../../apps/server/src/ug/ug-fetch.ts) **91.78%** lines / **69.38%** branches (async `fetch` mocki dodane)

## Werdykt przydatności

**Wysoka.** [`ug-fetch.test.ts`](../../../../apps/server/src/ug/ug-fetch.test.ts) — helpers + async (`fetchUgTab`, `searchUgChords`, resolve via search); TST-UGF-06 (router [`import.ts`](../../../../apps/server/src/routes/import.ts)) poza lib.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Dowód |
|----|--------|-----------|------|--------|
| TST-UGF-01 | `extractDataContentJson` — odwrotna kolejność atrybutów | P1 | `fixed` | [`ug-fetch.test.ts`](../../../../apps/server/src/ug/ug-fetch.test.ts) — reverse attribute order |
| TST-UGF-02 | Cloudflare / 403 / 404 / timeout | P1 | `fixed` | [`ug-fetch.test.ts`](../../../../apps/server/src/ug/ug-fetch.test.ts) — async mocked `fetch` |
| TST-UGF-03 | `resolveUgTabUrl` fallback search | P2 | `fixed` | [`ug-fetch.test.ts`](../../../../apps/server/src/ug/ug-fetch.test.ts) — resolves via search |
| TST-UGF-04 | Typ tab ≠ Chords | P1 | `fixed` | `buildFetchResult` + async non-Chords |
| TST-UGF-05 | `parseUgSearchResults` + rank | P2 | `fixed` | helpers + `searchUgChords` ranking |
| TST-UGF-06 | Mapowanie błędów w `routes/import.ts` | P1 | `confirmed` | Granica router vs lib — osobny plik testowy |

## Limit

Branches **69.38%**; TST-UGF-06 (mapowanie błędów w `routes/import.ts`) — osobny plik testowy, P1 otwarte.
