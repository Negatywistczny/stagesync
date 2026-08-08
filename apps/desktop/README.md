# 🖥️ apps/desktop — Kontener i Shell Desktopowy (Tauri)

Aplikacja `apps/desktop` to natywna powłoka desktopowa dla systemu macOS i Windows, oparta na frameworku **Tauri (Rust)** oraz deweloperskich skryptach wspomagających w Node.js. Służy do automatycznego, lokalnego uruchamiania serwera oraz zapewnienia integracji z systemem operacyjnym.

## 📁 Struktura projektu

- **`src-tauri/`** — Rdzeń aplikacji Tauri napisany w języku Rust:
  - Definiuje okna systemowe, menu, integracje mDNS, oraz mechanizm automatycznych aktualizacji (updater).
  - Pakuje binarny proces sidecara (Node.js) odpowiedzialny za lokalny serwer i timing.
  - Zawiera konfigurację instalatora NSIS dla Windowsa (dedykowane grafiki, spersonalizowany instalator).
- **`launcher/`** — Lekki i intuicyjny interfejs startowy (HTML/CSS/JS) odpowiadający za:
  - Wykrywanie działających serwerów w sieci LAN za pomocą mDNS (*host discovery*).
  - Zarządzanie lokalnym serwerem i przekierowywanie do głównego panelu Admina.
  - Wyświetlanie informacji o aktualizacjach i błędach (ze zoptymalizowanymi, systemowymi stylami UI/UX).
- **`scripts/`** — Skrypty pre-build (Node.js) odpowiadające m.in. za sprawdzenie wersji Rusta oraz automatyczną synchronizację plików UI i sidecara serwera przed uruchomieniem Tauri.
- **`ui-placeholder/`** — Lekki panel zastępczy wyświetlany podczas inicjalizacji kontenera Tauri.

## ⚙️ Budowanie i uruchamianie

Do budowania i testowania wymagane są **Rust/Cargo** oraz zależności platformowe Tauri (na Windowsie zwłaszcza **MSVC C++ Build Tools** + **WebView2** — sam Node tego nie doinstaluje). Lista i komendy winget: **[DESKTOP — Wymagania](../../docs/guides/DESKTOP.md#wymagania-dev--build)**.

- `pnpm --filter @stagesync/desktop dev` — skrypty z `scripts/` (`check-rust`, sync UI/sidecar) + `tauri dev`.
- `pnpm --filter @stagesync/desktop tauri:build` — pre-build + instalator (`.dmg` / `.exe` NSIS itd.).

Konfiguracja operatorska i updater: **[docs/guides/DESKTOP.md](../../docs/guides/DESKTOP.md)**.
