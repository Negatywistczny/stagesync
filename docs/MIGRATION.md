# Migracja legacy 4.x → StageSync v5

Import monolitycznego `database.json` z **STAGESYNC-APP-LEGACY** do układu v5
(`data/library/` + `data/projects/<id>/`). Implementacja: `@stagesync/shared`
(`migrateLegacySong` / `migrateLegacyDatabase` / `normalizeLibraryImport`) + CLI
oraz **Admin → Utwory** (kafelek Pliki pod Wybrany; auto-detect formatu przy uploadzie).

Zob. [report-scope-alpha9.md](./analysis/reports/report-scope-alpha9.md),
[ADR 0002](./adr/0002-timebase-ssot.md) (ticks + shift osi).

## Wymagania

- Node 20+
- Zainstalowane zależności monorepo (`pnpm install`)

## Dry-run (bez zapisu)

```bash
pnpm migrate:legacy -- \
  --input /ścieżka/do/database.json \
  --dry-run
```

Przykład z fixture w repo:

```bash
pnpm migrate:legacy -- \
  --input docs/examples/legacy/database.sample.json \
  --dry-run
```

Typowa baza (multi-song, maps, cues, setlista) — **M9 smoke / CI**:

```bash
pnpm migrate:legacy -- \
  --input docs/examples/legacy/database.typical.json \
  --dry-run
```

CI (`.github/workflows/ci.yml`) uruchamia oba dry-run po `pnpm test`.

## Apply (zapis do data/)

```bash
pnpm migrate:legacy -- \
  --input /ścieżka/do/database.json \
  --data-dir ./data \
  --apply
```

Co robi:

1. Kopiuje `database.json` → `database.json.pre-migrate-<ts>.bak` (shadow backup).
2. Dla każdego utworu: `data/projects/<uuid>/project.json` + kopia plików z `--uploads-dir` do `assets/`.
3. Aktualizuje `data/library/library.json` (merge po `id`).
4. Zapisuje `data/library/setlist.json` z zmapowanymi id.

Istniejące `project.json` / `setlist.json` dostają `.bak` przed nadpisaniem.

## Mapowanie (skrót)

| Legacy | v5 |
|--------|-----|
| `title` | `name` |
| `sections[]` + END marker | `forma.clips` (Countdown → `kind: countdown`) |
| `tempo` / `tempoMap` | `defaultBpm` / `tempoMap` |
| `chords.timeSignature` / `meterMap` | `defaultMeter` / `meterMap` |
| `key` / `keyMap` | `keyMap` |
| `vocal.lines` (bez `rest`, bez `vl-cd-*`) | `tekst.clips` (cyfry CD **nie** w storage — Client syntetyzuje z długości Countdown) |
| `chords.clips` | `akordy.clips` (digit clipy w CD dropnięte) |
| `cues[]` | `cue.clips` |
| `setlist.songIds` | `setlist.projectIds` (zmapowane) |
| `scoreBarMap` / Kotwice | `scoreBarMap.anchors` (+ ids) |
| `sections[].drumsNote` | `forma.clips[].note` |
| `year` / `artist` / `genre` | `year` / `artist` / `genre` |
| `coverUrl` (http/s) | `coverUrl` (meta preview) |
| `coverUrl` (local image in uploads/) | `assets[]` `kind: cover` + copy |
| `musicxmlFile` | `assets[]` `kind: musicxml` + copy z `uploads/` |
| `audioFile` / `audioFiles` / `stems` | `assets[]` + `audioTracks` / `audioClips` + copy |

Pozycje: `startTicks = round((startAbs − shift) × PPQ)`, gdzie `shift` =
`startAbs` pierwszej sekcji nie-Countdown (treść od taktu 1).

Przy `--apply` podaj `--uploads-dir` (domyślnie `<input>/uploads` lub `../uploads`),
żeby skopiować pliki do `data/projects/<id>/assets/`. Brak pliku → ostrzeżenie,
wpis w `assets` zostaje (można dograć w Admin).

## Błędy

- Brak `songs[]` → exit ≠ 0.
- Utwór, który nie przejdzie `ProjectSchema` → ostrzeżenie `SKIP` (pozostałe lecą dalej);
  jeśli **żaden** nie przejdzie → błąd.
- Nieznane id w setliście → warning.

## Admin (Utwory → Pliki)

W **Admin → Utwory** (kafelek **Pliki** pod Wybrany) upuść lub wybierz:

| Plik | Wykrycie |
|------|----------|
| `.stagesync.json` / pakiet v5 `{ projects: [...] }` | import bez migracji |
| legacy `database.json` (`songs[]`) | `migrateLegacyDatabase` → import utworów |

Format jest wykrywany automatycznie (klient + `POST /api/library/import`).
Archiwa ZIP / binarne `.stagesync` — na razie **nie** (czytelny błąd PL).
Import JSON legacy przenosi **refs** assetów (`musicxml` / audio / cover);
bajty plików kopiuj CLI z `--uploads-dir` albo wgraj ręcznie w Admin → Pliki.

CLI (`pnpm migrate:legacy`) nadal przydatny do dry-run / zapisu setlisty pod wskazany `--data-dir`.

## Po migracji

1. Uruchom serwer v5 z tym samym `--data-dir` / `STAGESYNC_DATA_DIR`.
2. Sprawdź listę w Admin → Utwory.
3. Otwórz Timeline i zweryfikuj Formę / Tekst / Akordy (smoke PO).
