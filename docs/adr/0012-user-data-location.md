# ADR 0012 — Lokalizacja danych użytkownika (MuseScore-style)

- **Status:** Zaakceptowany
- **Data:** 2026-07-21

## Kontekst

StageSync v5 potrzebuje różnych domyślnych katalogów danych w zależności od środowiska:

- **Dev / repo** — szybki start bez konfiguracji; dane pod `<repo>/data`.
- **Docker / Compose** — dane na zewnętrznym volume, jawnie przez `STAGESYNC_DATA_DIR`.
- **Desktop / host użytkownika** — dane widoczne dla użytkownika w Finderze/Eksploratorze,
  łatwe do backupu i przenoszenia — analogicznie do MuseScore, który trzyma projekty
  w `~/Documents/MuseScore`.

Dotychczasowy default (`<repo>/data`) był odpowiedni dla dev, ale niepraktyczny w realu:
dane produkcyjne użytkownika lądowały wewnątrz katalogu repozytorium.

## Decyzja

`defaultDataDir()` (`apps/server/src/storage/paths.ts`) stosuje następujący priorytet:

| Priorytet | Warunek | Katalog |
|-----------|---------|---------|
| 1 | `STAGESYNC_DATA_DIR` ustawione | wartość zmiennej |
| 2 | `STAGESYNC_REPO_DEV=1` | `<repo>/data` |
| 3 | `HOME` lub `USERPROFILE` dostępne | `~/Documents/StageSync` |
| 4 | fallback (brak HOME) | `<repo>/data` |

`STAGESYNC_REPO_DEV=1` jest domyślnie ustawione w `.env.example` — deweloper
kopiuje plik jako `.env` i nie musi nic zmieniać. Docker i Compose zawsze ustawiają
`STAGESYNC_DATA_DIR` jawnie (bez zmian).

### Struktura danych użytkownika

```
~/Documents/StageSync/
  library/
    library.json        # indeks biblioteki (seeded z library.template.json)
    setlist.json
  projects/
    <uuid>/
      project.json
      assets/
```

## Konsekwencje

- Desktop / host: projekty i biblioteka widoczne w standardowym miejscu OS — łatwy backup,
  przeniesienie, ręczna inspekcja.
- Docker: bez zmian — `STAGESYNC_DATA_DIR=/app/data` w Compose.
- Dev: bez zmian — `STAGESYNC_REPO_DEV=1` w `.env` (z `.env.example`).
- Windows: `USERPROFILE\Documents\StageSync` (`C:\Users\nazwa\Documents\StageSync`).
- Migracja istniejących danych (jeśli ktoś miał dane w `repo/data`):
  `cp -a data ~/Documents/StageSync` (macOS/Linux) lub przenieś folder ręcznie.
  Patrz [INSTALL.md](../INSTALL.md) § Folder danych użytkownika.
