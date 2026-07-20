# Evidence fala 8 — Tests coverage gaps

**Data:** 2026-07-21 ~01:44 Europe/Warsaw  
**Komenda:** `pnpm test` (turbo) — **PASS**

---

## Liczniki

| Pakiet | Test files | Tests |
|--------|------------|-------|
| `@stagesync/shared` | 20 | **136** |
| `@stagesync/ui` | 1 | **5** |
| `@stagesync/web` | 21 | **139** |
| `@stagesync/server` | 8 | **41** |
| **Σ** | **50** | **321** |

Porównanie: α4 report ~**89** testów → α8 **~3.6×**.

---

## Mocne obszary

- Time / soft-clock / clip-collision / forma / content / maps / client karaoke+grid  
- Transport engine (H1/H5/M15)  
- Library CRUD + concurrent creates (gdy library istnieje)  
- Assets / setlist API smoke  

---

## Luki (priorytet)

| Gap | Sev | Dlaczego |
|-----|-----|----------|
| **Cold concurrent `getLibrary` seed** | **H** (A21-H01) | Brak testu; repro 19/20 fail |
| REST vs WS `serverTimeMs` (M12) | M | Brak testu `TransportProvider` ordering |
| `TimelineShell` komponent / Playwright gest | M | 5k LOC bez testu UI |
| Path traversal HTTP encoded id | L | Unit `assertSafeProjectId` OK; HTTP e2e słabe |
| System restart/shutdown authz | M | Brak testu „odmowa bez sekretu” (bo brak auth) |
| `CreateProjectBody` unknown keys | L | Brak assert `.strict()` |

---

## Cytaty luk

- `library-crud.test.ts` ma concurrent **creates**, nie concurrent **cold GET**.  
- Brak pliku `TransportProvider.test.tsx`.  
- `apps/web` testy = prawie wyłącznie `src/lib/*.test.ts`.

## Remediacje

1. Test: pusty dataDir → 20× `GET /api/library` → wszystkie 200, 1 wpis seed.  
2. Test: applyAnchor REST late vs WS nowszy.  
3. Opcjonalnie Playwright pencil→save na harnessie.
