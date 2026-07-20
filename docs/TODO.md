# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.5` — historia w [CHANGELOG.md](../CHANGELOG.md).  
Ten plik: **tylko bieżący etap** (po tagu release → procedura zamykania poniżej).

Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**QA / sign-off α4:** [report-qa-signoff-alpha4.md](./analysis/reports/report-qa-signoff-alpha4.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją alpha.N+1 (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze (`5.0.0-alpha.N+1`).

## Alpha 5 (`5.0.0-alpha.5`)

Hero: **Client roles poza Formą/`drums`** — co najmniej jedna dodatkowa rola Client z transportem + danymi projektu.  
Scope: *(przed startem — report-scope-alpha5.md)*.

### Must

- [ ] Client: co najmniej jedna rola poza `drums` działa z transportem i danymi projektu
- [ ] Scope report alpha.5 przed kodem

### Should

- [ ] Client rola `drums` polish (layout roli)
- [ ] Client welcome: ikony kart ról + chipów tonacji/stróju
- [ ] Admin: „Teraz” vs `activeProjectId` / Odtwórz UX
- [ ] Transport UI: Stop, clamp końca, opcjonalnie seek

### OUT α5

- Edycja geometryczna Forma → **α7**
- Audio playback → **α6** import, **β1** silnik
- Zoom UI/H/V, pełna Pomoc → **5.0.0 polish**

### Release α5

- [ ] Bump, CHANGELOG, CI, smoke przed tagiem
