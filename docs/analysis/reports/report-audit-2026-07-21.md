# Audyt kodu 2026-07-21 — StageSync v5 (α8)

**Status:** AKTYWNY (rosnący do 11:00 Europe/Warsaw)  
**Start:** ~01:38 · **Deadline:** 11:00 · **Wersja:** `5.0.0-alpha.8`  
**Metoda:** deep-read + repro in-process · bez fixów produkcyjnych · bez commitów  
**Runbook:** [`../working/working-audit-2026-07-21-runbook.md`](../working/working-audit-2026-07-21-runbook.md)  
**Baza porównawcza:** [report-overnight-audit.md](./report-overnight-audit.md) (2026-07-20) · [report-audit-alpha4.md](./report-audit-alpha4.md) · parity α8/α9

> Konwencja `docs/analysis`: raport tutaj; scratch/runbook w `working/`; evidence w `evidence/audit-21-*`.

---

## 0. Exec (draft — pełna sekcja ≥11:00)

| Metryka | Wartość (aktualizacja ciągła) |
|---------|-------------------------------|
| Ryzyko fundamentu (transport/storage) | **ŚREDNI** — H1/H3/H5/M15 FIXED; **A21-H01** cold `getLibrary` 19/20 fail |
| Ryzyko produktu (parity β) | P8 green (osobny tor); ten audyt = regressje/residual |
| High otwarte | **A21-H01** (cold seed / getLibrary poza mutex) |
| Medium | M03–M08 (Zod strict, H4 create, `-r` ids, M12 WS/REST) |
| Fale evidence | F01–F05 ✓ · F06+ w toku |

**Werdykt roboczy:** Silnik transportu i mutacje storage pod lockiem są **naprawione** względem overnight. Najpoważniejszy świeży residual: **cold seed race** (`getLibrary` poza `withLibraryLock`). WS/REST M12 nadal otwarte.

---

## 1. Diff vs overnight-audit (narastająco)

| ID | Temat overnight | Status dziś (α8) | Dowód |
|----|-----------------|------------------|-------|
| **H1** | mid-play BPM skok pozycji | **FIXED** | `engine.ts` 168 przed assign BPM; test H1; repro 1920→1920 |
| **H2** | brak mutex RMW library | **FIXED** | `withLibraryLock` `storage/index.ts` 150–158; test concurrent creates |
| **H3** | path traversal `projectDir(id)` | **FIXED** | `assertSafeProjectId` + `ProjectIdSchema` UUID |
| **H4** | crash create/delete niespójność | **PARTIAL** | delete: library **przed** `rm`; create: library **przed** `writeProject` → okno **odwrócone** (ghost UI bez dysku) |
| **H5** | partial apply BPM przy bad meter | **FIXED** | assert przed mutate + test |
| **M1** | transport client bez Zod | **FIXED** | `apps/web/src/transport/api.ts` parse |
| **M2** | BPM bez `.finite()` | **FIXED** | `transport.ts` / schema |
| **M11** | brak `.strict()` | **PARTIAL** | Put/Project/Transport strict; **CreateProjectBody** nadal bez |
| **M12** | WS/REST race | ⏳ fala 7 | — |
| **M15** | clock skew rewind | **FIXED** | `Math.max(0, elapsed)` + test |

---

## 2. High (2026-07-21)

### A21-H01 — Cold `getLibrary` / seed poza `withLibraryLock` (residual H2)

**Impact:** świeży `dataDir` + równoległe `GET /api/library` (lub mix get+create) → masowe `500 Failed to seed library from template` / `ENOENT rename` na `library.json`.  
**Repro:** 20× parallel `getLibrary` → **1 OK / 19 fail** (2026-07-21 01:40).  
**Dowód:** [audit-21-f02-storage.md](../evidence/audit-21-f02-storage.md) · `storage/index.ts` 235–237 vs 150–158.

Mutacje CRUD pod lockiem są OK (10/10 concurrent create gdy biblioteka już istnieje).

---

## 3. Medium (narastająco)

| ID | Temat | Status | Cytat / evidence |
|----|-------|--------|------------------|
| **A21-M02** | Create: library przed `writeProject` (H4 odwrócone) | OPEN | F02 · `index.ts` 319–321 |
| **A21-M03** | `CreateProjectBodySchema` bez `.strict()` | OPEN | F03 · `schema.ts` 336–340 |
| **A21-M04** | Nested clip schemas bez `.strict()` (cichy strip) | OPEN | F03 |
| **A21-M05** | `fromTemplateId` / Batch id / Library entry ≠ UUID | OPEN | F03 |
| **A21-M07** | Split remnant id `${id}-r` + heurystyka parent | OPEN | F04 |
| **A21-M08** | M12: REST `applyAnchor` bez `serverTimeMs` | OPEN | F05 · `TransportProvider.tsx` 266–267 |

*(A21-M01 wchłonięte do **A21-H01**)*

---

## 4. Low (narastająco)

| ID | Temat | Status |
|----|-------|--------|
| **A21-L01** | `atomic-write` tmp = `pid + Date.now()` | OPEN |
| **A21-L02** | Library entry id luźne vs ProjectId UUID | OPEN |
| **A21-L03** | `TransportSeekBodySchema` bez `.strict()` | OPEN |
| **A21-L04** | ADR 0009 filename „v3” vs kanon v5 (nota ewolucji już w ADR) | LOW / docs |
| **A21-L06–L08** | test gaps subsections; shell size; commandPending | OPEN |

---

## 5. Fale / checkpointy

| Fala | Obszar | Plik evidence | Czas |
|------|--------|---------------|------|
| F01 | Transport H1/H5/M15 | [audit-21-f01](../evidence/audit-21-f01-transport-engine.md) | 01:39 |
| F02 | Storage RMW / id / H4 / cold seed | [audit-21-f02](../evidence/audit-21-f02-storage.md) | 01:40 |
| F03 | Schema v5 + Zod strict | [audit-21-f03](../evidence/audit-21-f03-schema-zod.md) | 01:41 |
| F04 | clip-collision | [audit-21-f04](../evidence/audit-21-f04-clip-collision.md) | 01:42 |
| F05 | Web WS/REST M12 | [audit-21-f05](../evidence/audit-21-f05-web-transport-ws.md) | 01:43 |
| F06 | TimelineShell / ADR 0008 | w toku | 01:44+ |

---

## 6. Remediacje (propozycje — nie wdrożone)

1. **Must:** `getLibrary` → `withLibraryLock(() => ensureLibrary())` + test cold concurrent seed.
2. Create H4: rozważyć kolejność / kompensację orphanów.
3. `.strict()` na Create/Batch/Seek + UUID na template/batch ids.
4. REST transport: propaguj `serverTimeMs` z silnika do `applyAnchor`.
5. Split remnants: UUID zamiast `${id}-r`.
