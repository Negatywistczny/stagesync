# 📂 data/ — Katalog Runtime i Persystencja

Katalog `data/` służy jako lokalny magazyn danych operacyjnych w czasie działania aplikacji (_runtime_). Jest on domyślnie zignorowany w systemie kontroli wersji Git (poza plikami konfiguracyjnymi i tym dokumentem), aby zapobiec commitowaniu lokalnych danych projektów, logów i pobranych zasobów użytkownika.

## 📁 Struktura katalogu

- **`projects/`** — Pliki projektów StageSync w formacie JSON (schemat zgodny z wersją v3, walidowany przez Zod w `@stagesync/shared`).
- **`library/`** — Biblioteka utworów, w tym pliki tekstowe, akordy, pliki XML/MXML/OSMD (partytury) oraz inne zasoby multimedialne przypisane do utworów.
- **`downloads/`** — Katalog tymczasowy dla pobieranych aktualizacji lub zasobów z zewnętrznych integratorów.
- **`logs/`** — Logi działania serwera (`apps/server`) oraz deskryptorów desktopowych.
- **`host/`** — Pliki konfiguracyjne specyficzne dla hosta sieciowego lub środowiska lokalnego.

## ⚙️ Integracja z systemem

Katalog ten jest wykorzystywany przez:

1. **`apps/server`** jako domyślne miejsce zapisu projektów i logów (zgodnie z decyzjami ADR [0001-storage-layout](../docs/adr/0001-storage-layout.md) i [0012-user-data-location](../docs/adr/0012-user-data-location.md)).
2. **Docker Compose** jako zamontowany wolumen (`volume`), gwarantujący trwałość danych przy restartach kontenera.
