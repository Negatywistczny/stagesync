# QA sign-off — alpha.3

**Cel:** zamknięcie `5.0.0-alpha.3` — smoke przed tagiem.  
**Scope must:** [report-scope-alpha3.md](./report-scope-alpha3.md).  
**Procedura:** automatyzacja agenta + checklista manualna użytkownika.

Legenda: ✅ OK · ⚠️ OK z zastrzeżeniem · 🔜 odłożone (nie blocker α3) · ❌ fail blocker

**Ostatnia aktualizacja manual:** 2026-07-20 (sesja testowa użytkownika).

---

## Automatyzacja (ostatni run)

| Warstwa | Wynik | Uwagi |
|---------|-------|-------|
| `pnpm test` | ✅ 89 testów | |
| `pnpm check-types` | ✅ | |
| `pnpm build` | ✅ | |
| `pnpm lint` | ✅ | naprawione unused vars w `schema.test.ts` (D-10) |
| API smoke (CRUD, transport, strict PUT) | ✅ | |
| snap-grid + formaCanvas | ✅ | |

---

## Must α3 — podsumowanie

| # | Kryterium | Status |
|---|-----------|--------|
| 1–3 | Schema v2, PUT, seed CD | ✅ auto |
| 4 | Admin → Timeline + id | ✅ manual (wcześniej) |
| 5 | Pencil + Zapisz + Odrzuć | ✅ manual B2–B4; ⚠️ B5 dirty badge |
| 6 | Transport + mapy | ⚠️ API OK; UI seek/stop/koniec utworu — 🔜 |
| 7 | Sekcja + Client drums | ⚠️ działa minimalnie; polish 🔜 |

**Werdykt must:** treść Formy + zapis + podstawowy transport **OK na α3**.  
Braki UX transportu / dirty badge / Admin „Teraz vs gra” = **should / α4**, nie blocker wydania α3 przy świadomym OUT.

---

## Checklista manualna — wyniki

### B. Timeline — Forma

| ID | Krok | Status | Notatka |
|----|------|--------|---------|
| B1 | Load CD/Intro, grid, Tempo/Metrum | ✅ | Tempo/Metrum widoczne, nieaktywne — OK (read-only placeholder) |
| B2 | Pencil po scrollu | ✅ | |
| B3 | Nadpisanie zajętego taktu | ✅ | |
| B4 | Zapisz / Odrzuć / reload | ✅ | |
| B5 | Dirty badge | ⚠️ | Badge **„Niezapisane zmiany” widoczny**; **brak guarda** przy wyjściu (reload / nawigacja) → D-11 |

### D. Transport UI

| ID | Krok | Status | Notatka |
|----|------|--------|---------|
| D1 | Play / Pause | ⚠️ | Play działa; **brak końca utworu** (playhead w pustą przestrzeń); Stop disabled; brak seek w UI |
| D2 | Admin sekcja przy play | ⚠️ | Sekcja się zmienia; **„Teraz” ≠ odtwarzany utwór** gdy zaznaczenie ≠ active (D-12) |

### E. Client

| ID | Krok | Status | Notatka |
|----|------|--------|---------|
| E1 | Rola Forma | ⚠️ | Metronom + tekst sekcji/taktu OK; reszta UI = shell (D-13) |
| E2 | Nagłówek wyboru ról | ✅ | Jedna linia; ustawienia po prawej; spójny przed/po starcie |

### C. Song picker / Admin

| ID | Krok | Status | Notatka |
|----|------|--------|---------|
| C1 | Picker biblioteki | ⚠️ | Logika niejasna; **„Odtwórz”** ≠ v4 — α3 skrót do `play+projectId` (D-12) |
| C2 | Inspector „Właściwości” | ✅ | Read-only — OK na α3; edycja → α4 must (D-08) |
| F1 | Nawigacja Admin ↔ Timeline ↔ Client | — | Do sprawdzenia; **wersja ≠ stopka** — patrz niżej |

---

## Odłożone — nie blocker α3

| ID | Temat | Etap | Uzasadnienie |
|----|-------|------|--------------|
| D-01 | Track grid dock ↔ lane | **α4 must** | report-scope-alpha4 |
| D-02 | Eye per-ślad, kolejność lane’ów | **α4 must** | j.w. |
| D-03 | Zoom UI/H/V, follow playhead | **5.0.0** | placeholder shell |
| D-04 | Eraser, Scissors, Zoom tool | **OUT α3** | inventarz |
| D-05 | Pencil drag | **α7** | parity v4 |
| D-06 | Pełny onset model Formy | **α4–α7** | |
| D-07 | Snap picker UI | **5.0.0** / ADR 0007 faza 2 | bar na sztywno OK |
| D-08 | Inspector rename + CD length | **α4 must** | TODO |
| D-09 | `POST /api/transport/load` w UI | **α4** | API jest; brak przycisku |
| D-10 | ESLint warnings shared | **przed tagiem α3** | CI |
| **D-11** | **Dirty: badge OK, brak confirm przy utracie** (`beforeunload` / modal przy nawigacji z dirty) | **α4 should** | Zapisz/Odrzuć działają |
| **D-12** | **Admin: „Teraz” = selected, „Sekcja” = activeProjectId∥selected**; przycisk **Odtwórz** | **α4 should** | Sync zaznaczenia przy play lub etykiety „Wybrany” / „Grany”; Odtwórz = α3 dev shortcut |
| **D-13** | **Client drums — tylko tekst, brak layoutu roli** | **α4 should** | TODO Client polish |
| **D-14** | **Stop → seek 0 + pause** | **α4 should** | Timeline Stop disabled (shell); v4 ma Stop |
| **D-15** | **Seek / scrub playhead w UI** | **α4–5.0.0** | API `POST /api/transport/seek` jest; brak UI (klik linijka / suwak) |
| **D-16** | **Koniec utworu: clamp playhead / auto-pause** | **α4 should** | Silnik nie zna `songEndTicks`; playhead w TRAILING_VIEW_BARS |
| **D-17** | **Follow playhead (auto-scroll canvas)** | **5.0.0** | przycisk disabled w Timeline |
| **D-18** | **Client: nagłówek wyboru ról** — jedna linia; ustawienia po prawej (jak drawer); **ten sam nagłówek** po wyborze roli | **α4 should** | ✅ naprawione w tej sesji |

### Naprawione w tej sesji (re-test B2–B3 ✅)

- Pencil hit / scroll / canvas width / snap bar

---

## Workaround do testów transportu (dev)

Bez UI seek — tymczasowo w konsoli przeglądarki (strona z Timeline/Admin):

```js
await fetch('/api/transport/seek', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ positionTicks: 0 }),
});
await fetch('/api/transport/pause', { method: 'POST' });
```

`positionTicks: 0` = początek taktu 1; `-7680` = start Countdown.

---

## Zamknięcie α3

- [x] Must treści: Forma pencil + PUT + route + resolver (manual B2–B4)
- [ ] Should: dirty badge widoczny (D-11 — akceptacja cut na α3?)
- [ ] `pnpm lint` zielone (D-10) — ✅ w tej sesji
- [ ] CHANGELOG / wersja w shellach
- [ ] Tag `v5.0.0-alpha.3` na prośbę właściciela
