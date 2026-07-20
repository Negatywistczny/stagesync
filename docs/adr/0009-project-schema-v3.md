# ADR 0009 — Project schema v3 (assets + setlist)

- **Status:** Zaakceptowany
- **Data:** 2026-07-20
- **Powiązane:** [ADR 0001](./0001-storage-layout.md), [ADR 0008](./0008-timeline-clip-editing.md)

## Kontekst

Alpha.6 wprowadza import plików audio do folderu projektu oraz setlistę koncertową.
Schema v2 ma tylko `forma` / `tempoMap` / `meterMap`. Potrzebne są referencje do
plików na dysku oraz osobny stan setlisty (Set ≠ Utwory).

## Decyzja

1. **`formatVersion: 3`** — pola `assets[]`, `audioTracks[]`, `audioClips[]`
   (puste tablice OK). Upgrade v2→v3 przy odczycie (puste tablice).
2. **Pliki** pod `data/projects/<id>/assets/<storageName>` — izolacja per projekt
   ([ADR 0001](./0001-storage-layout.md)).
3. **Setlista** w `data/library/setlist.json` (nie w `library.json` ani w projekcie):
   `{ version: 1, enabled, projectIds[], autoAdvance: { enabled } }`.
4. **Ownership PUT:** pełny `PUT /api/projects/:id` **nie kasuje** `assets` /
   `audioTracks` / `audioClips` obecnych na serwerze, jeśli body ich nie zawiera
   (merge-preserve). Mutacja assets wyłącznie przez asset endpoints.
5. **Playback audio** — poza zakresem (β2).

## Ewolucja formatVersion (nota 2026-07-20)

Ten ADR utrwala **wprowadzenie** assets + setlisty jako **`formatVersion: 3`**.
Kolejne linie schematu w `@stagesync/shared` (`ProjectSchemaV4`, **`ProjectSchemaV5`**)
dodają m.in. lane’y treści / `keyMap` / metadata — bez unieważniania decyzji o
izolacji `assets/` i `setlist.json`.

**Kanon runtime dziś:** `ProjectSchema = ProjectSchemaV5` (`formatVersion: 5`)
w `packages/shared/src/schema.ts`. Odczyt starszych v2/v3/v4 = upgrade path w
storage / migratorze — nie osobny „powrót do v3” w UI.

Audyt: [report-v4-v5-parity-audit.md](../analysis/reports/report-v4-v5-parity-audit.md) §5.

## Konsekwencje

- Shared: historycznie `ProjectSchemaV3`; **aktualnie** kanoniczny `ProjectSchemaV5`.
- Serwer: ścieżki `projectAssetsDir`, `setlistFile`; multipart upload.
- Timeline α6: read-only placeholdery lane’ów audio z v3+ (UI audio → β2).
