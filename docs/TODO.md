# StageSync v5 — TODO

**Stan:** `5.0.0-alpha.2` — historia w [CHANGELOG.md](../CHANGELOG.md).  
Ten plik: **tylko bieżący etap** (po tagu release → procedura zamykania poniżej).

Kolejne etapy: [ROADMAP.md](./ROADMAP.md). Scope następnej alfy →
`docs/analysis/reports/report-scope-alphaN.md` przed kodem.

Scope i plan α3: [report-scope-alpha3.md](./analysis/reports/report-scope-alpha3.md),
[report-implementation-plan-alpha3.md](./analysis/reports/report-implementation-plan-alpha3.md).
Audyt kodu: [report-overnight-audit.md](./analysis/reports/report-overnight-audit.md).

## Procedura zamykania etapu

Przy tagu `v5.0.0-alpha.N` (analogicznie `beta.N`, `5.0.0`):

1. Przenieś zrealizowane pozycje do [CHANGELOG.md](../CHANGELOG.md).
2. **Wyczyść całą checklistę** w tym pliku — bez starych sekcji i odhaczonych bulletów.
3. Zastąp plik **wyłącznie** sekcją alpha.N+1 (nagłówek, link do scope report, must/should/release).
4. Zaktualizuj `**Stan:**` na górze (`5.0.0-alpha.N+1`).

**Pull-forward:** drobne zadania z kolejnego etapu (alpha.N+1) można wciągnąć do
bieżącego TODO bez zmiany numeracji w ROADMAP — odnotuj w scope report bieżącej alfy.

## Alpha 3 (`5.0.0-alpha.3`)

Wąski pion treści w ticks — **nie** pełna parity v4. Szczegóły OUT: ROADMAP.

### Stabilność (audyt — przed / równolegle z α3)

- [ ] Transport `play()`: `samplePosition()` przy starych bpm/meter, potem mutate +
      reanchor (H1 — skok pozycji mid-play)
- [ ] Transport `play()`: walidacja całego body **przed** mutacją stanu; BPM
      `.finite()`; błędne metrum → 400 bez zmiany SSOT (H5)
- [ ] `ProjectIdSchema` (UUID) + containment ścieżki przed `join` w storage (H3)
- [ ] Mutex / serializacja RMW na `library.json` (create / update / delete) (H2)
- [ ] Spójność create/delete: brak sierot projekt↔biblioteka (H4)

### Must (produkt α3)

- [ ] `feat/project-schema-v2` — ProjectSchema v2 + `.strict()`; `forma.clips` +
      `tempoMap` / `meterMap`; seed Countdown **−7680** (2 takty @ PPQ 960);
      auto-upgrade v1→v2; `resolveFormaClipAt`; test unknown keys → fail
- [ ] `feat/project-content-api` — GET/PUT pełny dokument `project.json`
- [ ] `feat/timeline-project-route` — `/timeline/:projectId`; link Admin z
      `selected.id`
- [ ] `feat/timeline-forma-pencil` — canvas Formy z GET; pencil; Zapisz → PUT;
      Odrzuć = reload
- [ ] `feat/transport-active-project` — `activeProjectId`; play/seek resolve
      bpm/meter z map + reanchor przy zmianie tempa
- [ ] Admin „Sekcja” via `resolveFormaClipAt` (status nie `—`)

### Should (α3 — cut first przy timebox)

- [ ] Client rola `drums` (Forma): tytuł + aktywna sekcja
- [ ] `POST /api/transport/load` (jawny load bez play)
- [ ] Dirty badge Timeline; lane Tempo/Metrum read-only; inspector rename / CD
      length; song picker z `GET /api/library`

### Release α3

- [ ] `docs/api/README.md` — kontrakt PUT full v2 + transport z map
- [ ] Bump `5.0.0-alpha.3`, CHANGELOG, wersja w shellach = `package.json`
- [ ] CI zielone; ręczny smoke: create → Timeline → pencil → save → play → sekcja
