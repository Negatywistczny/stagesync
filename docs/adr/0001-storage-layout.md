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
    …                       # runtime indeks (użytkownik; gitignore tam gdzie trzeba)
  projects/
    <projectId>/            # jeden katalog na projekt
  logs/                     # logi serwera / aplikacji
```

- Puste katalogi utrzymujemy w gicie przez `.gitkeep`.
- **Schematy Zod** z `@stagesync/shared` walidują na krawędziach (load/save, HTTP). Nieprawidłowe dane są odrzucane — bez cichej naprawy w day-0.

## Konsekwencje

- Migratory i CRUD celują w ścieżki po id projektu, bez monolitycznego pliku DB.
- Import legacy 4.x należy do osobnego migratora później; nie dual-write starych kształtów do tego układu.
