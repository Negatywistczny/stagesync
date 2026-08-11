> [📦 StageSync](../../../README.md) / [apps](../../README.md) / [desktop](../README.md)

# 🖥️ apps/desktop/launcher — Ekran Startowy Desktopowy (Launcher)

Launcher to lekki i intuicyjny interfejs startowy (HTML/CSS/JS) ładowany bezpośrednio przez kontener Tauri. Odpowiada za wykrywanie serwerów w sieci LAN, zarządzanie lokalnym serwerem oraz przekierowywanie użytkownika do głównego panelu Admina.

## 📁 Struktura katalogu

- **[`index.html`](./index.html)** — Główny widok launchera (discovery + sterowanie hostem).
- **[`splash.html`](./splash.html)** — Ekran powitalny wyświetlany podczas inicjalizacji kontenera Tauri.
- **[`app.js`](./app.js)** — Logika UI: orchestracja hostów, logowanie statusu, obsługa błędów.
- **[`host-discovery.js`](./host-discovery.js)** — Detekcja serwerów StageSync w sieci LAN (mDNS `_stagesync._tcp`).
- **[`updateDialog.js`](./updateDialog.js)** — Dialog aktualizacji (Tauri updater).
- **[`localErrorActions.js`](./localErrorActions.js)** — Obsługa błędów lokalnego serwera.
- **[`styles.css`](./styles.css)** — Arkusz stylów launchera (tokeny `--ss-*` z vendora).
- **`vendor/`** — Skopiowane tokeny i style z Design Systemu ([`tokens.css`](./vendor/tokens.css), [`button.css`](./vendor/button.css)) — synchronizacja: `pnpm sync:launcher-ui`.
- **`brand/`** — Logotypy i zasoby graficzne launchera.

## 🚀 Główne funkcjonalności

1. **Wykrywanie hostów LAN:** mDNS (`_stagesync._tcp`) + ręczny URL + lista ostatnich połączeń.
2. **Zarządzanie lokalnym serwerem:** Start/stop sidecar Node.js, monitoring `health`.
3. **Aktualizacje:** Dialog Tauri updater z informacjami o nowej wersji.
4. **Title bar:** Na Windows/Linux — frameless HTML title bar z menu i kontrolkami okna; na macOS — natywne dekoracje.

## 🎨 Standardy

Launcher działa **bez React** — czysty HTML/CSS/JS. Style korzystają z vendorowanych tokenów Design Systemu ([ADR 0014](../../../docs/adr/0014-desktop-launcher.md)). Klasy przycisków `ss-btn*` pochodzą z skopiowanego [`button.css`](./vendor/button.css).

## 🔗 Powiązane

- Kontener Tauri: [`apps/desktop/README.md`](../README.md)
- Wzorzec Launcher UX: [ADR 0014](../../../docs/adr/0014-desktop-launcher.md)
- Design System: [`docs/ui/README.md`](../../../docs/ui/README.md)
