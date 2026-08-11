> [📦 StageSync](../../README.md) / [apps](../README.md)

# 🖥️ apps/desktop — Kontener i Shell Desktopowy (Tauri)

Aplikacja `apps/desktop` to natywna powłoka desktopowa dla systemu macOS i Windows, oparta na frameworku **Tauri (Rust)** oraz deweloperskich skryptach wspomagających w Node.js. Służy do automatycznego, lokalnego uruchamiania serwera oraz zapewnienia integracji z systemem operacyjnym.

## 📁 Struktura projektu

- **`src-tauri/`** — Rdzeń aplikacji Tauri napisany w języku Rust:
  - Definiuje okna systemowe (Windows/Linux: frameless + HTML title bar [#836](https://github.com/Negatywistczny/stagesync/issues/836); macOS: natywne dekoracje + menubar), tray, mDNS, updater.
  - Pakuje binarny proces sidecara (Node.js) odpowiedzialny za lokalny serwer i timing.
  - Zawiera konfigurację instalatora NSIS dla Windowsa (dedykowane grafiki, spersonalizowany instalator).
- **[`launcher/`](./launcher/README.md)** — Lekki i intuicyjny interfejs startowy (HTML/CSS/JS) odpowiadający za:
  - Wykrywanie działających serwerów w sieci LAN za pomocą mDNS (_host discovery_).
  - Zarządzanie lokalnym serwerem i przekierowywanie do głównego panelu Admina.
  - Wyświetlanie informacji o aktualizacjach i błędach; na Windows/Linux ten sam wizualny title bar co SPA (Menu + sterowanie oknem).
- **`scripts/`** — Skrypty pre-build (Node.js): `check-rust`, sync launcher / server / **web** ([`sync-sidecar-web.mjs`](./scripts/sync-sidecar-web.mjs) przy [`dev`](../../dev), żeby lokalny host nie serwował starego bundla bez title bara).
- **`ui-placeholder/`** — Lekki panel zastępczy wyświetlany podczas inicjalizacji kontenera Tauri.

## ⚙️ Budowanie i testowanie

Do budowania i testowania wymagane są **Rust/Cargo** oraz zależności platformowe Tauri (na Windowsie zwłaszcza **MSVC C++ Build Tools** + **WebView2** — sam Node tego nie doinstaluje). Lista i komendy winget: **[DESKTOP — Wymagania](../../docs/guides/DESKTOP.md#wymagania-dev--build)**.

- `pnpm --filter @stagesync/desktop dev` — skrypty z `scripts/` (`check-rust`, sync launcher / server / **web**) + `tauri dev`.
- `pnpm --filter @stagesync/desktop tauri:build` — pre-build + instalator (`.dmg` / `.exe` NSIS itd.).
- `pnpm --filter @stagesync/desktop tauri:build:nsis-smoke` — szybki smoke instalatora Windows (`target/*/nsis-smoke/StageSync-Setup.exe`). Instaluje osobny produkt **StageSync NSIS Smoke** (nie używaj go zamiast release `StageSync-Setup.exe`).

Konfiguracja operatorska i updater: **[docs/guides/DESKTOP.md](../../docs/guides/DESKTOP.md)**.
