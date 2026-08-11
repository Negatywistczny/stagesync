> [📦 StageSync](../../README.md) / [apps](../README.md)

# ⚙️ apps/server — Serwer Czasu, Transportu i API (SSOT)

Aplikacja `apps/server` odpowiada za logikę backendową, persystencję danych projektów oraz precyzyjną dystrybucję czasu muzycznego (_Single Source of Truth_ — SSOT) za pomocą protokołu WebSockets.

## 📁 Struktura projektu

- **`src/`** — Kod źródłowy serwera (TypeScript / Node.js):
  ```text
  src/
  ├── routes/                 # Punkty końcowe REST API (/api/projects, /api/library, /api/system)
  ├── storage/                # Obsługa zapisu/odczytu projektów, migracji v5 i biblioteki w data/
  ├── transport/              # Zegar SSOT, pętla ticków 25 Hz i serwer WebSockets (/ws/transport)
  ├── stage/                  # Komunikaty sceniczne (stage cues) i lista połączonych urządzeń (presence)
  ├── usdb/                   # Integrator pobierania i autoryzacji z serwisem USDB
  ├── security/               # Weryfikacja PIN-u operatora, tokenów LAN i Safety Net Master/Spare
  └── midi/                   # Mostek natywny do wysyłania komunikatów MIDI i panic CC
  ```
- **`tools/`** — Pomocnicze skrypty deweloperskie i konfiguracyjne specyficzne dla backendu.

## 🚀 Główne funkcjonalności

1. **Autorytet Czasu:** Rozsyła precyzyjne komunikaty synchronizacyjne w formacie ticks + PPQ (zdefiniowane w `@stagesync/shared`), eliminując rozbieżności timingowe między urządzeniami.
2. **REST API:** Zapewnia punkty końcowe dla pobierania konfiguracji, zarządzania setlistami oraz importowania i eksportowania biblioteki utworów. Szczegóły specyfikacji API opisano w **[docs/api/README.md](../../docs/api/README.md)**.
3. **Transport LAN:** Działa całkowicie lokalnie w sieci LAN i wykorzystuje protokół mDNS do rozgłaszania obecności serwera w sieci (ułatwiając autowykrywanie na tabletach i komputerach).

## ⚙️ Budowanie i testowanie

Wszystkie komendy mogą być uruchamiane bezpośrednio z tego katalogu lub poprzez skróty monorepo:

- `pnpm dev` — startuje serwer deweloperski z autoreloadem na porcie `4000`.
- `pnpm test` — uruchamia testy jednostkowe przy użyciu frameworku **Vitest**.
- `pnpm build` — kompiluje projekt do katalogu `dist/` (czysty JavaScript).
