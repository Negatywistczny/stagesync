> [📦 StageSync](../README.md)

# 📱 apps/ — Aplikacje Monorepo (Uruchomieniowe)

Katalog `apps/` grupuje wszystkie aplikacje końcowe wspierane w ramach ekosystemu StageSync. Każda z aplikacji reprezentuje oddzielną platformę uruchomieniową, ale korzysta ze wspólnych reguł biznesowych oraz design systemu zadeklarowanego w `packages/`.

## 📁 Aplikacje

1. **[`apps/server`](server/README.md)** — Główny serwer czasu i transportu (SSOT): odpowiada za persystencję danych, zegar 25 Hz, komunikację WebSockets i REST API.
2. **[`apps/web`](web/README.md)** — Główny interfejs webowy (Vite + React): zawiera panel Admina, edytor osi czasu Timeline oraz responsywne ekrany klientów scenicznych.
3. **[`apps/desktop`](desktop/README.md)** — Kontener desktopowy (Tauri + Rust): natywne instalatory Windows/macOS, auto-wykrywanie w LAN i sidecar Node.js.
4. **[`apps/performer`](performer/README.md)** — Natywny klient Android (Performer): lekki ekran sceniczny dla muzyków (Karaoke, OSMD, Akordy, Drums).
5. **[`apps/console`](console/README.md)** — Tabletowy panel reżyserski Android (Console): WebView ładujące `/admin` z opcjonalnym lokalnym silnikiem hosta.
6. **[`apps/www`](www/README.md)** — Publiczny portal informacyjny: strona marketingowa, dokumentacja oraz aktualności wydań.

## ⚙️ Budowanie i testowanie

Główne komendy do uruchamiania i budowania aplikacji znajdują się w głównym katalogu monorepo. Przykładowo:

- `pnpm dev` — uruchamia jednocześnie wszystkie aplikacje w trybie deweloperskim (wykorzystuje [`turbo.json`](../turbo.json)).
- `pnpm build` — kompiluje wszystkie aplikacje do wersji produkcyjnej.
