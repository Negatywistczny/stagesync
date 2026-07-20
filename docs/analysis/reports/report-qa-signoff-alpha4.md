# QA sign-off — alpha.4

**Cel:** zamknięcie `5.0.0-alpha.4` — smoke przed tagiem.  
**Scope must:** [report-scope-alpha4.md](./report-scope-alpha4.md).  
**Audyt wyjściowy:** [report-audit-alpha4.md](./report-audit-alpha4.md).

Legenda: ✅ OK · ⚠️ OK z zastrzeżeniem · 🔜 odłożone · ❌ fail blocker

**Data sign-off:** 2026-07-20

---

## Automatyzacja (ostatni run)

| Warstwa | Wynik | Uwagi |
|---------|-------|-------|
| `pnpm lint` | ✅ | |
| `pnpm check-types` | ✅ | |
| `pnpm test` | ✅ **100** testów (shared 49, ui 5, web 24, server 22) | |
| `pnpm build` | ✅ | |

---

## Must α4 — bramka D-01–D-14

| ID | Kryterium | Status | Notatka |
|----|-----------|--------|---------|
| D-01 | Track grid dock ↔ lane zsynchronizowane | ✅ | `.trackRow` + sticky `.dockCell` |
| D-02 | Eye per ślad; Forma zawsze on | ✅ | `timelineTracks.ts` + menu checkbox |
| D-03 | Specjalne lane’y nad treścią | ✅ | Kolejność v4 w `TRACKS` |
| D-04 | Lane Tempo/Metrum z map | ✅ | `mapSegments.ts` segment render |
| D-05 | Inspector rename + CD length → PUT | ✅ | `formaInspector.ts` + draft |
| D-06 | Song picker biblioteka → route | ✅ | bez zmian (α3 PASS) |
| D-07 | Dirty badge widoczny | ✅ | bez zmian |
| D-08 | Dirty guard przy wyjściu | ✅ | `beforeunload` + `useBlocker` |
| D-09 | `POST /api/transport/load` w UI | ✅ | przy `reloadProject` |
| D-10 | CI zielone | ✅ | sesja release |
| D-11 | Smoke picker → eye → edycja → save → play | ⚠️ | auto OK; manual do potwierdzenia |
| D-12 | Wersja shelli = `package.json` | ✅ | `appVersion.ts` alpha.4 |
| D-13 | Carry-over H1/H5 bez regresji | ✅ | testy engine |
| D-14 | Bump + CHANGELOG + tag | ✅ | `v5.0.0-alpha.4` |

---

## Should α4

| Wycinek | Status |
|---------|--------|
| Admin panel toggle na split | ✅ |
| Pliki projektu empty state | ✅ |
| Transport M15/M12/M1/M3 | ✅ |
| Client drums polish | 🔜 α5 |
| Stop / seek UI | 🔜 α5 |

---

## Werdykt

**Must α4:** domknięte w kodzie i CI. Tag `v5.0.0-alpha.4` zalecany po krótkim smoke manualnym (D-11).
