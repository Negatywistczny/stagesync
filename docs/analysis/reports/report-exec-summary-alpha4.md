# exec-summary — StageSync 5.0.0-alpha.4 (po audycie dowodowym)

**Data:** 2026-07-20  
**Metoda:** audyt read-only kod + repro in-process; synteza w [`report-audit-alpha4.md`](./report-audit-alpha4.md).  
**Wersja w repo:** `5.0.0-alpha.3` (`package.json`) — α4 w TODO bez bumpu / tagu.

## Werdykt

Repozytorium jest **gotowe jako alpha.3** (zgodnie z tagiem), **nie** jako `5.0.0-alpha.4`.  
Must layout (#1–#3) i inspector Formy (#5) nie zostały zaimplementowane; song picker (#6) jest domknięty.  
**Tag α4 przedwczesny** — bramka release **ZAMKNIĘTA** do domknięcia must #1–#6, D-08, D-11, D-14.

| Metryka | Wartość |
|---------|---------|
| Must pass rate (ściśle PASS) | **14%** (1/7) |
| Must z częściowym uznaniem | **~21%** (1 PASS + 2×½ PARTIAL) |
| CI | `pnpm test` — **89/89** PASS |
| Ryzyko wydania α4 | **WYSOKI** |
| Ryzyko fundamentu po α3 | **ŚREDNI** |

## Top wnioski

1. **Track grid — bloker #1** — osobne drzewa DOM (`aside.dock` vs `motiondiv.lanes` w `TimelineShell.tsx`); brak wspólnej siatki wierszy; przy `@media (max-width: 900px)` gwarantowany rozjazd.
2. **Eye i kolejność lane’ów — FAIL** — jedyny toggle „Specjalne on/off”; kolejność odwrotna do v4 (Specjalne pod treścią zamiast nad).
3. **Song picker — PASS** — `fetchLibrary` + modal z `Link to={/timeline/${p.id}}`; bez mock overlay.
4. **Inspector Formy — read-only** — brak inputów rename / CD length; CSS `.lengthInput` nieużywany; `putProject` + draft istnieją bez UI.
5. **Mapy Tempo/Metrum — PARTIAL** — wartości z `resolveTempoAt` / `resolveMeterAt` OK; brak renderu segmentów map wzdłuż osi czasu.
6. **Dirty — PARTIAL** — badge + Zapisz/Odrzuć działają; brak `beforeunload` / guard nawigacji (D-08 z QA α3).
7. **Carry-over overnight załatany w α3** — H1/H5/H3 FIXED; H2/H4 PARTIAL; M15 (monotoniczność playhead) i M12 (race WS/REST) nadal OPEN.

## Top ryzyka

1. **Brak PR `feat/timeline-track-grid`** — blokuje resztę UI Timeline (eye, kolejność, inspector, smoke D-11).
2. **M15 — cofnięcie `positionTicks` przy skew zegara** — SSOT monotoniczność (`engine.ts` 45–48); repro: 1920→960.
3. **Scope creep „prawie v4 canvas”** — lane Tekst/Akordy mają pozostać placeholder; twardy OUT z scope.
4. **M12 race WS tick vs REST** — `applyAnchor` bez porównania `serverTimeMs` (`TransportProvider.tsx`).

## Quick wins

- Song picker już PASS — odhaczyć w smoke bez nowego PR.
- `putProject` + draft + `.lengthInput` CSS — inspector to głównie podpięcie UI do istniejącego flow.
- Dirty badge działa — brakuje tylko `beforeunload` + blocker na `Link`.
- H1/H5/H3 — testy + repro potwierdzają brak regresji (D-13 ✅).

## Następny branch / PR

**`feat/timeline-track-grid`** — wspólna siatka wierszy dock+canvas (CSS `subgrid` lub jeden kontener); w tym samym PR: kolejność lane’ów (Tempo/Tonacja/Metrum/Kotwice **nad** treścią) + eye per ślad.  
Plan: [report-implementation-plan-alpha4.md](./report-implementation-plan-alpha4.md).

## Carry-over overnight

| ID | Status | Notatka |
|----|--------|---------|
| **H1** | FIXED | `samplePosition()` przed mutacją BPM (`engine.ts`) |
| **H2** | FIXED (mutacje) / PARTIAL (cold seed GET) | `withLibraryLock` na CRUD |
| **H3** | FIXED | `assertSafeProjectId` + UUID |
| **H4** | PARTIAL | Delete OK; create: `saveLibrary` przed `writeProject` → orphan przy crash |
| **H5** | FIXED | Walidacja metrum przed mutate BPM |
| **M1** | OPEN | Klient transportu bez Zod przed `fetch` (`transport/api.ts`) |
| **M12** | OPEN | Race WS/REST — brak guard `serverTimeMs` |
| **M15** | OPEN | Brak clamp elapsed przy skew wall-clock |

## Sign-off (skrót D-01–D-16)

| Status | Kryteria |
|--------|----------|
| ✅ | D-06 picker, D-07 dirty badge, D-10 CI, D-12 wersja shelli, D-13 carry-over H1/H5 |
| ⚠️ | D-04 mapy (wartości OK, brak renderu), D-09 load (API + play z projectId) |
| ❌ | D-01 track grid, D-02 eye, D-03 kolejność, D-05 inspector, D-08 dirty guard, D-11 smoke, D-14 bump α4, D-15/D-16 should |
| 🔜 | — |

Pełna macierz: [report-audit-alpha4.md §8](./report-audit-alpha4.md#8-sign-off-checklist--bramka-α4).

## Deliverables

| Plik | Rola |
|------|------|
| [report-audit-alpha4.md](./report-audit-alpha4.md) | **pełny audyt α4** |
| [report-exec-summary-alpha4.md](./report-exec-summary-alpha4.md) | ten plik |
| [report-scope-alpha4.md](./report-scope-alpha4.md) | scope IN/OUT + stan po audycie |
