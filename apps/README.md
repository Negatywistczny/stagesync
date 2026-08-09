# 📱 apps/ — Aplikacje Monorepo (Uruchomieniowe)

Katalog `apps/` grupuje wszystkie aplikacje końcowe wspierane w ramach ekosystemu StageSync. Każda z aplikacji reprezentuje oddzielną platformę uruchomieniową, ale korzysta ze wspólnych reguł biznesowych oraz design systemu zadeklarowanego w `packages/`.

## 📁 Aplikacje drugiego rzędu

Każda aplikacja w monorepo odpowiada za inny aspekt systemu synchronizacji scenicznej:

1. **[`apps/server`](server/README.md)**
   - **Rola:** Główny serwer czasu i transportu (SSOT).
   - **Odpowiedzialność:** Przechowywanie stanu projektu, komunikacja w czasie rzeczywistym (WebSockets), precyzyjny timing i udostępnianie REST API.

2. **[`apps/web`](web/README.md)**
   - **Rola:** Główny interfejs webowy (Vite + React).
   - **Odpowiedzialność:** Panel admina, zaawansowana oś czasu (Timeline) oraz responsywne ekrany klientów/muzyków na scenie.

3. **[`apps/desktop`](desktop/README.md)**
   - **Rola:** Kontener desktopowy (Tauri + Rust + sidecar Node.js).
   - **Odpowiedzialność:** Natywne budowanie instalatorów dla Windows i macOS, lokalne zarządzanie serwerem bez konfiguracji oraz mostki systemowe (mDNS, obsługa plików).

4. **[`apps/performer`](performer/README.md)**
   - **Rola:** Natywny klient dla urządzeń mobilnych (Android Performer).
   - **Odpowiedzialność:** Widok sceniczny dla muzyków (teksty, akordy, nuty OSMD), zoptymalizowany pod kątem ekranów dotykowych i szybkiego dostępu offline.

5. **[`apps/console`](console/README.md)**
   - **Rola:** Narzędzie administracyjne dla tabletów (Android Console).
   - **Odpowiedzialność:** WebView opakowujące interfejs `/admin` dla wygody reżysera lub realizatora koncertu na scenie.

6. **[`apps/www`](www/README.md)**
   - **Rola:** Publiczny portal informacyjny (Strona WWW).
   - **Odpowiedzialność:** Prezentacja możliwości systemu, dokumentacja, sekcja aktualności i wsparcie dla użytkowników końcowych.

## ⚙️ Lokalne uruchomienie (pnpm)

Główne komendy do uruchamiania i budowania aplikacji znajdują się w głównym katalogu monorepo. Przykładowo:

- `pnpm dev` — uruchamia jednocześnie wszystkie aplikacje w trybie deweloperskim (wykorzystuje [`turbo.json`](../turbo.json)).
- `pnpm build` — kompiluje wszystkie aplikacje do wersji produkcyjnej.
