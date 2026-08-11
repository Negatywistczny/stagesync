> [📦 StageSync](../../../README.md) / [apps](../../README.md) / [server](../README.md)

# ⚙️ apps/server/src — Logika Backendowa i Serwer Czasu (SSOT)

Katalog `src/` zawiera kod źródłowy serwera StageSync zrealizowany w technologii **TypeScript / Node.js 22**, odpowiadający za dystrybucję czasu, persystencję i REST API.

## 📁 Struktura i przeznaczenie subkatalogów

- **`routes/`** — Punkty końcowe REST API (`/api/projects`, `/api/library`, `/api/system`, `/api/transport`, `/api/stage`, `/api/import`).
- **`storage/`** — Persystencja danych w `data/`: obsługa zapisu/odczytu projektów w formacie v5, automatyczne migracje oraz indeksy biblioteki.
- **`transport/`** — Serwer czasu Single Source of Truth (SSOT): pętla ticków 25 Hz i obsługa gniazd WebSockets (`/ws/transport`).
- **`stage/`** — Reżyseria sceniczna: rozsyłanie komunikatów scenicznych (stage cues) oraz rejestr obecności urządzeń w LAN (presence).
- **`usdb/`** — Integrator z bazą USDB: automatyczne logowanie, wyszukiwanie i pobieranie plików UltraStar.
- **`security/`** — Bezpieczeństwo: weryfikacja PIN-u operatora, autoryzacja tokenów LAN oraz obsługa trybu Master/Spare (Safety Net).
- **`midi/`** — Natywny mostek MIDI: wysyłanie komunikatów Program Change/Control Change oraz wyciszanie awaryjne (MIDI Panic).
