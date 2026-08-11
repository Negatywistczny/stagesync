> [📦 StageSync](../../../README.md) / [packages](../../README.md) / [shared](../README.md)

# 📐 @stagesync/shared/src — Czysta Logika Domenowa i Czas

Katalog `src/` zawiera czystą logikę domenową (no DOM, no FS) oraz definicje typów i walidatory Zod dla całego monorepo.

## 📁 Struktura i przeznaczenie subkatalogów

- **`smart-tempo/`** — Algorytmy analizy siatki tempa, detekcji akcentów rytmicznych (onsets) i układu sekcji Formy.
- **`tempo-map-solver/`** — Precyzyjny solver przeliczający integer ticks ↔ milisekundy na podstawie zmiennej mapy tempa i metrum.
- **`text-anchor-bridge/`** — Algorytm dopasowywania tekstu piosenek do nut i kadrów siatki na osi czasu.
- **`import/`** — Parsery formatu UltraStar (.txt), Ultimate Guitar (Chords/taby) i setlist.
- **`project/`** — Schematy walidacyjne Zod dla projektów v5 (`ProjectSchemaV5`), protokół i helpery rozstrzygania konfliktów.
- **`time-tempo/`** — Helpery matematyczne dla czystego czasu muzycznego (stałe PPQ 960, konwersje ticks ↔ BBT, kwantyzacja).
- **`transport/`** — Typy i schematy Zod ramek komunikacyjnych WebSockets i REST API dla transportu SSOT.
- **`ui-helpers/`** — Bezstanowe funkcje pomocnicze dla prezentacji akordów, sekcji i motywów.
