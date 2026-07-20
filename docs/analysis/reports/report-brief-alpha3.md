# Brief sesji — StageSync **5.0.0-alpha.3** (scope)

| | |
|---|---|
| **Data** | 2026-07-20 |
| **Cel** | Wycinek alpha.3 — nie pełna parity v4 |
| **Repo** | `stagesync` (v5); legacy tylko referencja |
| **SSOT** | ADR v5 > legacy kod > `STAGESYNC-V5-PLAN` (hipotezy) |
| **Zakaz** | Implementacja produktu; nowe ADR; commit |

## Stan wejściowy (alpha.2)

- Transport SSOT (REST + WS, ticks + PPQ, soft playhead).
- CRUD biblioteki **name-only** (`ProjectSchema` `formatVersion: 1`).
- Shelle Admin / Timeline / Client z inventarzem v4 (większość `disabled` / lokalny overlay).
- DS (`--ss-*`), ADR 0001–0006, CI.

## Default scope (bazowy, do zatwierdzenia)

1. **ProjectSchema v2** — metadane + Forma (clipy w ticks) + tempo/metrum map  
2. **PUT/GET treści** — `data/projects/<id>/project.json`  
3. **Admin** — wybór utworu + „Edytuj w Timeline” z `projectId` w route  
4. **Timeline** — canvas **read** + **pencil** na Formie (bez Tap / UG / Różdżka)  
5. **Client** — aktywna sekcja z transportu + danych projektu (rola Forma / grid sekcji)  
6. **Transport** — tempo/metrum z projektu przy play/seek  

## Poza scope (jawne)

Migrator 4.x · MIDI I/O · audio engine · Docker · motywy · auth · polish UI przed 5.0.0 · pełna edycja Tekst/Akordy/Cue · setlista · MusicXML.

## Deliverables

| Plik | Rola |
|------|------|
| [report-inventory-delta-alpha3.md](./report-inventory-delta-alpha3.md) | Kontrolki: wired / local / disabled / blocker alpha.3 |
| [report-project-schema-draft-alpha3.md](./report-project-schema-draft-alpha3.md) | Draft Zod + JSON + mapowanie IN-scope |
| [report-api-flow-alpha3.md](./report-api-flow-alpha3.md) | Mermaid + endpointy |
| [report-scope-alpha3.md](./report-scope-alpha3.md) | **Główny produkt** IN / OUT / ryzyka |
| [report-implementation-plan-alpha3.md](./report-implementation-plan-alpha3.md) | Kolejność `feat/*` PR, testy, release |
| [report-exec-summary.md](./report-exec-summary.md) | 1 strona dla właściciela |

## Checkpointy faz

| Faza | Status | Notatka |
|------|--------|---------|
| Synteza domenowa | ✅ | Utrwalona w raportach `report-*` |
| Audyt 8h cykle 1–8 | ✅ | zamknięty i streszczony w raportach kanonicznych |
| Scope / EXEC **v1** | ✅ | po falsyfikacji (CD −7680, Zod strict, …) |

## Hipotezy odrzucone / skorygowane względem planu V5

- Legacy TODO sugerował `projects/<id>/song.json` z modelem v4 (`startAbs`) — **odrzucone** na rzecz ADR 0002 (ticks) + istniejącego `project.json`.
- Pełna parity inventarza w alpha.3 — **odrzucona**; inventarz zostaje w DOM jako disabled, wiring tylko wycinka Forma + treść.
