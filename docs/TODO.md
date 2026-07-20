# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.6` — historia w [CHANGELOG.md](../CHANGELOG.md).  
Ten plik: **tylko bieżący etap** (po tagu release → procedura zamykania poniżej).

Kolejne etapy: [ROADMAP.md](./ROADMAP.md).

**QA / sign-off α5:** [report-qa-signoff-alpha5.md](./analysis/reports/report-qa-signoff-alpha5.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją alpha.N+1 (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze (`5.0.0-alpha.N+1`).

## Alpha 6 (`5.0.0-alpha.6`)

Hero: **Admin Live Desk — setlista, scena, pliki**.  
Scope: *(przed startem — report-scope-alpha6.md)*.

### Must

- [ ] Scope report alpha.6 przed kodem
- [ ] Import audio do projektu (refs w schema v3)
- [ ] Setlista + pliki w inspectorze (wiring IA v5)

### Should

- [ ] Admin: „Teraz” vs `activeProjectId` / Odtwórz UX
- [ ] Transport UI: Stop, clamp końca, opcjonalnie seek
- [ ] Client `grid` / `score` shell polish

### OUT α6

- Silnik odtwarzania audio → **β1**
- Edycja geometryczna Forma → **α7**
- Pełna partytura OSMD → **α7**

### Release α6

- [ ] Bump, CHANGELOG, CI, smoke przed tagiem
