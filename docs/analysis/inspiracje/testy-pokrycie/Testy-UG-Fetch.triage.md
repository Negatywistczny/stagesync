# Triage: Luki testów Ultimate Guitar fetch (`ug/ug-fetch`)

**Źródło:** [Testy-UG-Fetch.md](./Testy-UG-Fetch.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `apps/server` — HTML→js-store, search, resolve URL, błędy sieci  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Średnia–wysoka.** Pure helpers częściowo pokryte; async `fetchUgTab` / `searchUgChords` / Cloudflare / timeout — wymagają mock `global.fetch` (deterministyczne, bez flaky). Granica: router `import.ts` vs `ug-fetch.ts` vs shared `importUgText` — dump poprawnie rozdziela.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-UGF-01 | `extractDataContentJson` — odwrotna kolejność atrybutów HTML | P1 | `hypothesis` | Minimalny string inline |
| TST-UGF-02 | `isCloudflareChallenge`, 403, 404, timeout | P1 | `hypothesis` | `vi.stubGlobal('fetch', …)` |
| TST-UGF-03 | `resolveUgTabUrl` fallback search loop | P2 | `hypothesis` | Mock search + tab fetch |
| TST-UGF-04 | Typ tab ≠ Chords (Pro/Bass) → throw | P1 | `hypothesis` | Fixture JSON typu |
| TST-UGF-05 | `parseUgSearchResults` + `rankSearchHits` + filtr artist | P2 | `hypothesis` | Minimal HTML search fixture |
| TST-UGF-06 | Mapowanie błędów w `routes/import.ts` (502 vs 400) | P1 | `hypothesis` | Test routera, nie duplikować parsera |

## Kontekst

- Admin tool, nie mass scraping; shared: `cleanUgTabContent`, `importUgText`.
- Powiązane: [Analiza-Importu-ChordProUG.triage.md](./Analiza-Importu-ChordProUG.triage.md) (warstwa shared po fetch).

## Następny krok eng

TST-UGF-01/02/04 w `ug-fetch.test.ts`; izolacja od sieci obowiązkowa.
