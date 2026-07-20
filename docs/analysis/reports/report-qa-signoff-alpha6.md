# QA sign-off — alpha.6

**Cel:** zamknięcie `5.0.0-alpha.6` — smoke przed tagiem.  
**Scope must:** [report-scope-alpha6.md](./report-scope-alpha6.md).

Legenda: ✅ OK · ⚠️ OK z zastrzeżeniem · 🔜 odłożone · ❌ fail blocker

**Data sign-off:** 2026-07-20

---

## Automatyzacja (ostatni run)

| Warstwa | Wynik | Uwagi |
|---------|-------|-------|
| `pnpm lint` | ✅ | |
| `pnpm check-types` | ✅ | |
| `pnpm test` | ✅ | shared + server assets/setlist + web |
| `pnpm build` | ✅ | |

---

## Must α6

| ID | Kryterium | Status | Notatka |
|----|-----------|--------|---------|
| M-01 | Schema v3 + upgrade | ✅ | `ProjectSchemaV3`, seed/create v3 |
| M-02 | Import audio → assets/ | ✅ | multipart + auto-clip stub |
| M-03 | Inspector pliki | ✅ | `ProjectFilesPanel` |
| M-04 | Setlista Set tab | ✅ | CRUD + drag + footer Dalej |
| M-05 | Set ≠ Utwory | ✅ | osobna zakładka + `setlist.json` |
| M-06 | Race PUT vs POST | ✅ | merge-preserve + test |

---

## Should α6

| Wycinek | Status |
|---------|--------|
| Admin Teraz = activeProjectId | ✅ |
| Transport Stop | ✅ |
| Scena cue + Client toast | ✅ |
| Client grid/score empty | ✅ |
| Timeline setlist prev/next | ✅ |
| Host logi | 🔜 cut |

---

## Werdykt

**Must α6:** domknięte w kodzie i CI. Tag `v5.0.0-alpha.6` na prośbę (po ręcznym smoke #1–#6).
