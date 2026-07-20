# QA sign-off — alpha.5

**Cel:** zamknięcie `5.0.0-alpha.5` — smoke przed tagiem.  
**Scope must:** [report-scope-alpha5.md](./report-scope-alpha5.md).

Legenda: ✅ OK · ⚠️ OK z zastrzeżeniem · 🔜 odłożone · ❌ fail blocker

**Data sign-off:** 2026-07-20

---

## Automatyzacja (ostatni run)

| Warstwa | Wynik | Uwagi |
|---------|-------|-------|
| `pnpm lint` | ✅ | |
| `pnpm check-types` | ✅ | |
| `pnpm test` | ✅ | +3 testy `clientKaraoke` |
| `pnpm build` | ✅ | |

---

## Must α5

| ID | Kryterium | Status | Notatka |
|----|-----------|--------|---------|
| K-01 | Client karaoke: sekcja + BBT + tempo @ transport | ✅ | `KaraokePane` + `buildKaraokeLiveContext` |
| K-02 | Placeholder braku linii tekstu (nie „Oczekiwanie…”) | ✅ | gdy `activeProjectId` set |
| K-03 | Drums / split bez regresji | ✅ | `DrumsPane` extract |
| K-04 | Timeline locator drag + typografia linijki | ✅ | patch po `6d76053` |
| K-05 | CI + bump + CHANGELOG | ✅ | sesja release |

---

## Should α5

| Wycinek | Status |
|---------|--------|
| Welcome ikony kart ról | ✅ |
| Drums polish | 🔜 cut / minimal |
| Admin Teraz UX | 🔜 α6 |
| Transport Stop/seek | 🔜 α6 |

---

## Werdykt

**Must α5:** domknięte w kodzie i CI. Tag `v5.0.0-alpha.5` zalecany po smoke manualnym (split Tekst + Forma).
