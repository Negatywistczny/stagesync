# Migracja legacy 4.x → StageSync v5

Import monolitycznego `database.json` z **STAGESYNC-APP-LEGACY** do układu v5
(`data/library/` + `data/projects/<id>/`). Implementacja: `@stagesync/shared`
(`migrateLegacySong` / `migrateLegacyDatabase`) + CLI.

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

CLI wypisze: mapowanie `legacyId → projectId`, liczby clipów, `shiftQuarters`, ostrzeżenia.

## Apply (zapis do data/)

```bash
pnpm migrate:legacy -- \
  --input /ścieżka/do/database.json \
  --data-dir ./data \
  --apply
```

Co robi:

1. Kopiuje `database.json` → `database.json.pre-migrate-<ts>.bak` (shadow backup).
2. Dla każdego utworu: `data/projects/<uuid>/project.json` (+ pusty `assets/`).
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
| `vocal.lines` (bez `rest`) | `tekst.clips` |
| `chords.clips` | `akordy.clips` |
| `cues[]` | `cue.clips` |
| `setlist.songIds` | `setlist.projectIds` (zmapowane) |
| `scoreBarMap` / Kotwice | `scoreBarMap.anchors` (+ ids) |
| `sections[].drumsNote` | `forma.clips[].note` |
| MusicXML / cover file copy | OUT (assets empty) |

Pozycje: `startTicks = round((startAbs − shift) × PPQ)`, gdzie `shift` =
`startAbs` pierwszej sekcji nie-Countdown (treść od taktu 1).

## Błędy

- Brak `songs[]` → exit ≠ 0.
- Utwór, który nie przejdzie `ProjectSchema` → ostrzeżenie `SKIP` (pozostałe lecą dalej);
  jeśli **żaden** nie przejdzie → błąd.
- Nieznane id w setliście → warning.

## Po migracji

1. Uruchom serwer v5 z tym samym `--data-dir` / `STAGESYNC_DATA_DIR`.
2. Sprawdź listę w Admin → Utwory.
3. Otwórz Timeline i zweryfikuj Formę / Tekst / Akordy (smoke PO).
