# ADR 0001 — Układ storage

- **Status:** Zaakceptowany
- **Data:** 2026-07-19

## Kontekst

StageSync v5 potrzebuje jasnego układu na dysku: indeks biblioteki, dane per projekt i logi — osobno od legacy monolitu `database.json`. Walidacja ma być na krawędziach I/O, żeby uszkodzone lub nieznane kształty kończyły się szybkim błędem.

## Decyzja

Dane runtime / szablony żyją pod `data/` w repo:

```
data/
  library/
    library.template.json   # seed / szablon indeksu biblioteki
    seed-projects/          # bundled project.json per seed entry (e.g. Template wzór)
    library.json            # runtime indeks (gitignore)
    setlist.json            # setlista koncertowa (α6+; niezależna od library.json)
  projects/
    <projectId>/
      project.json          # dokument projektu (formatVersion 2+)
      assets/               # pliki mediów per projekt (α6+; izolacja folderu)
  host/
    midi-config.json        # wybór portów MIDI Host (gitignore runtime)
  logs/                     # logi serwera / aplikacji
```

- Puste katalogi utrzymujemy w gicie przez `.gitkeep`.
- **Schematy Zod** z `@stagesync/shared` walidują na krawędziach (load/save, HTTP). Nieprawidłowe dane są odrzucane — bez cichej naprawy w day-0.
- Szczegóły schema v3 (assets, setlist ownership): [ADR 0009](./0009-project-schema-v3.md).

## Konsekwencje

- Migratory i CRUD celują w ścieżki po id projektu, bez monolitycznego pliku DB.
- Import legacy 4.x należy do osobnego migratora później; nie dual-write starych kształtów do tego układu.
- Usunięcie katalogu projektu usuwa też `assets/` — brak globalnego katalogu uploadów.
