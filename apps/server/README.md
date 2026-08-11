> [📦 StageSync](../../README.md) / [apps](../README.md)

# ⚙️ apps/server — Serwer Czasu, Transportu i API (SSOT)

Aplikacja `apps/server` odpowiada za logikę backendową, persystencję danych projektów oraz precyzyjną dystrybucję czasu muzycznego (_Single Source of Truth_ — SSOT) za pomocą protokołu WebSockets.

## 📁 Struktura projektu

- **[`src/`](./src/README.md)** — Kod źródłowy serwera (trasy REST API, persystencja v5, zegar SSOT, transport WebSocket). Szczegóły: **[src/README.md](./src/README.md)**.
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
