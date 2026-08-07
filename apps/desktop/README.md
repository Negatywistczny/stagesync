# 🖥️ apps/desktop — Kontener i Shell Desktopowy (Tauri)

Aplikacja `apps/desktop` to natywna powłoka desktopowa dla systemu macOS i Windows, oparta na frameworku **Tauri (Rust)** oraz deweloperskich skryptach wspomagających w Node.js. Służy do automatycznego, lokalnego uruchamiania serwera oraz zapewnienia integracji z systemem operacyjnym.

## 📁 Struktura projektu

- **`src-tauri/`** — Rdzeń aplikacji Tauri napisany w języku Rust:
  - Definiuje okna systemowe, menu, integracje mDNS, oraz mechanizm automatycznych aktualizacji (updater).
  - Pakuje binarny proces sidecara (Node.js) odpowiedzialny za lokalny serwer i timing.
- **`launcher/`** — Lekki i intuicyjny interfejs startowy (HTML/CSS/JS) odpowiadający za:
  - Wykrywanie działających serwerów w sieci LAN za pomocą mDNS (*host discovery*).
  - Zarządzanie lokalnym serwerem i przekierowywanie do głównego panelu Admina.
  - Wyświetlanie informacji o aktualizacjach i błędach.
- **`ui-placeholder/`** — Lekki panel zastępczy wyświetlany podczas inicjalizacji kontenera Tauri.

## ⚙️ Budowanie i uruchamianie

Do budowania i testowania wymagane jest posiadanie zainstalowanego kompilatora **Rust** i narzędzia Cargo:

- `pnpm dev` (z poziomu folderu głównego lub bezpośrednio) — uruchamia proces Tauri w trybie deweloperskim wraz z hot-reloadingiem.
- `pnpm build` — kompiluje produkcyjną aplikację Tauri i tworzy gotowe instalatory (np. `.dmg` na macOS, `.msi` na Windows).

Więcej szczegółów technicznych oraz konfigurację systemową opisano w **[docs/guides/DESKTOP.md](../../docs/guides/DESKTOP.md)**.
