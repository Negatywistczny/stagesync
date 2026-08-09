# Triage: Luki testów `desktopFileMenu`

**Źródło:** [Testy-Desktop-File-Menu.md](./Testy-Desktop-File-Menu.md) (Gemini Deep Search)  
**Status:** `closed`  
**Obszar:** `apps/web` — [`desktopFileMenu.ts`](../../../../apps/web/src/lib/client/desktopFileMenu.ts)  
**Data triage:** 2026-07-27  
**Ostatnia weryfikacja:** 2026-07-27 — coverage **~100%** ([`desktopFileMenu.test.ts`](../../../../apps/web/src/lib/client/desktopFileMenu.test.ts), 8 tests)

## Werdykt przydatności

**Wysoka.** Pure helpers + mocki `libraryApi` / DOM — w pełni pokryte.

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Dowód |
|----|--------|-----------|------|--------|
| TST-DFM-01 | `saveProjectAs` — OCC + `midiProgramId` | P0 | `fixed` | [`desktopFileMenu.test.ts`](../../../../apps/web/src/lib/client/desktopFileMenu.test.ts) |
| TST-DFM-02 | `importLibraryFile` — 17MB / ZIP / JSON | P0 | `fixed` | [`desktopFileMenu.test.ts`](../../../../apps/web/src/lib/client/desktopFileMenu.test.ts) |
| TST-DFM-03 | Export blob URL + revoke | P1 | `fixed` | [`desktopFileMenu.test.ts`](../../../../apps/web/src/lib/client/desktopFileMenu.test.ts) |
| TST-DFM-04 | `listTemplateIds` | P1 | `fixed` | [`desktopFileMenu.test.ts`](../../../../apps/web/src/lib/client/desktopFileMenu.test.ts) |
| TST-DFM-05 | `createSongAndOpen` + recent timeline | P1 | `fixed` | [`desktopFileMenu.test.ts`](../../../../apps/web/src/lib/client/desktopFileMenu.test.ts) |
