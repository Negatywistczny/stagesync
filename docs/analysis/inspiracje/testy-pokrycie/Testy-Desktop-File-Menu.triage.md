# Triage: Luki testów menu Plik Desktop (`desktopFileMenu`)

**Źródło:** [Testy-Desktop-File-Menu.md](./Testy-Desktop-File-Menu.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `apps/web` — Tauri menu Plik → `libraryApi` (create/save-as/import/export)  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Wysoka (ryzyko utraty danych).** Funkcje menu wdrożone w produkcie (`desktopFileMenu.ts`); pokrycie = praktycznie tylko `currentTimelineProjectId`. Dump daje gotową strategię mocków `libraryApi`, DOM download, ZIP rejection — do wdrożenia przed kolejnymi zmianami Save As (znane ograniczenie: brak kopi binariów audio).

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-DFM-01 | `saveProjectAs` — optimistic `updatedAt`, zachowanie `midiProgramId` | P0 | `hypothesis` | Mock fetch+put; assert pola |
| TST-DFM-02 | `importLibraryFile` — limit 16 MB, `looksLikeZipBytes`, invalid JSON | P0 | `hypothesis` | `File` + `Uint8Array` w Vitest |
| TST-DFM-03 | `downloadLibraryExport` — mock `URL.createObjectURL`, anchor click | P1 | `hypothesis` | Spy DOM; cleanup revoke |
| TST-DFM-04 | `listTemplateIds` — filtr `isTemplate` | P1 | `hypothesis` | Mock `fetchLibrary` |
| TST-DFM-05 | `createSongAndOpen` → `pushRecentTimelineProject` | P1 | `hypothesis` | Mock `lastTimelineProject` |
| TST-DFM-06 | `DesktopMenuBridge` — tylko smoke event dispatch | P2 | `hypothesis` | Nie duplikować logiki z lib |

## Kontekst

- Działa w przeglądarce i Tauri (fetch API).
- Powiązane: [Audyt-Lifecycle-StageSync-v5-Desktop.triage.md](../audyty-silnik/Audyt-Lifecycle-StageSync-v5-Desktop.triage.md) (`partial`).

## Następny krok eng

Nowy `desktopFileMenu.test.ts` — TST-DFM-01/02 przed export/templates.
