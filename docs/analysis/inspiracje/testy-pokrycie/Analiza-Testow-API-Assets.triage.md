# Triage: Luki testów API assetów (`routes/assets`)

**Źródło:** [Analiza-Testow-API-Assets.md](./Analiza-Testow-API-Assets.md) (Gemini Deep Search)  
**Status:** `open`  
**Obszar:** `apps/server` — upload/list/stream/delete assetów per projekt  
**Data triage:** 2026-07-27

## Werdykt przydatności

**Wysoka (integralność danych).** E2E pokrywa happy path; brakuje 413, matrycy multipart, błędów strumienia po `headersSent`. Propozycja wydzielenia `extFromName` / `mimeForExt` — zgodna z monorepo (pure + test).

## Priorytety weryfikacji

| ID | Temat | Priorytet | Stan | Następny krok |
|----|--------|-----------|------|----------------|
| TST-AST-01 | Pure helpers `extFromName`, `mimeForExt` | P1 | `hypothesis` | Extract + unit bez HTTP |
| TST-AST-02 | POST multipart: audio vs musicxml, `trackId`/`startTicks` kombinacje | P0 | `hypothesis` | Mock `Stores`, assert `createAudioClip` |
| TST-AST-03 | Multer `LIMIT_FILE_SIZE` → HTTP 413 | P0 | `hypothesis` | Symulacja `MulterError` bez 100 MB bufora |
| TST-AST-04 | GET stream: błąd przed nagłówkami (500) vs mid-pipe | P0 | `hypothesis` | Mock `createReadStream` + `headersSent` |
| TST-AST-05 | `projectIdFrom` / `assetIdFrom` — invalid params | P1 | `hypothesis` | Tablica, pusty string |
| TST-AST-06 | Rozszerzenia `.mxl`, `.flac`, `.aif` + flagi w `addProjectAsset` | P1 | `hypothesis` | Po TST-AST-02 |

## Kontekst

- Limit 100 MB multer memory — test 413 musi być deterministyczny.
- Nie mylić z audytem audio engine ([Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md](../audyty-silnik/Audyt-Silnika-Odtwarzania-Audio-WebAudio.triage.md) — `closed`).

## Następny krok eng

Rozszerzyć `assets-router-unit.test.ts` o TST-AST-03/04; matrycę uploadu TST-AST-02.
