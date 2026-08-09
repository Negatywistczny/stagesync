# 💻 apps/web — Interfejs Użytkownika Admin / Timeline / Client

Aplikacja `apps/web` to główny projekt kliencki zrealizowany w technologii **React + Vite**. Zawiera pełny interfejs graficzny dla reżyserii scenicznej, interaktywną oś czasu (Timeline) oraz responsywne, zoptymalizowane pod urządzenia mobilne ekrany wykonawców (Client Shell).

## 📁 Struktura projektu

- **`src/`** — Kod źródłowy aplikacji klienckiej:
  - **`src/shells/`** — Shelle UI (Admin, Client, Timeline), wspólny chrome i strony w `shells/pages/`.
  - **`src/lib/`** — Moduły pomocnicze w 5 kategoriach zgodnie z `.clinerules` / [`lib-structure.mdc`](../../.cursor/rules/lib-structure.mdc) (`@lib/audio`, `@lib/timeline`, `@lib/timeline-edit`, `@lib/client`, `@lib/shell-operator`). W root `src/lib/` obowiązuje zakaz umieszczania plików.
  - **`src/transport/`** — Klient transportu / WebSocket (playhead między tickami serwera).
  - **`src/dev/`** — Narzędzia deweloperskie (np. podgląd layoutów).
- **`public/`** — Zasoby statyczne, w tym oficjalne logotypy, ikony i czcionki.
- **`scripts/`** — Skrypty budowania dedykowane dla poszczególnych platform docelowych (np. dystrybucje Performer i Console na Androida).
- **`e2e/`** — Testy end-to-end realizowane przy użyciu narzędzia **Playwright**.
- **`test/`** — Konfiguracja i zestawy testów jednostkowych/integracyjnych.

## 🚀 Główne ekrany i mechaniki

1. **Panel Admina / Timeline (`/admin`):**
   - Zaawansowany edytor osi czasu wzorowany na profesjonalnych stacjach roboczych DAW (Logic Pro).
   - Sterowanie odtwarzaczem, lokatorami, pętlami oraz zarządzanie biblioteką utworów i setlistą.
2. **Ekrany Klienta (`/client`):**
   - Synchroniczne renderowanie cyfrowych partytur (OSMD), siatek akordów, tekstów piosenek (karaoke) oraz sekcji tapowania dla wokalistów/perkusistów.
   - Płynne przesuwanie wskaźnika pozycji (_playhead_) wyłącznie na podstawie informacji synchronizacyjnych przesyłanych przez serwer (wygładzanie pomiędzy tickami, brak własnego zegara).

## 🎨 Standardy i Wytyczne

- **Zakaz Tailwind CSS i Inline-Styles:** Wszystkie style deweloperskie muszą opierać się wyłącznie o **CSS Modules** (`*.module.css`) oraz zmienne z design systemu (tokeny `--ss-*`).
- **Ergonomia Sceniczna:** Interfejs jest zoptymalizowany pod kątem pracy w trudnych warunkach oświetleniowych na scenie (wysoki kontrast APCA, ciemny motyw, minimalna powierzchnia stref dotykowych 36x36px na desktopie i 44x44px na urządzeniach mobilnych).

## ⚙️ Budowanie i testowanie

- `pnpm dev` — uruchamia deweloperski serwer Vite na porcie `3000`.
- `pnpm build` — kompiluje aplikację w trzech wariantach:
  - Standardowe SPA (Admin + Client).
  - `dist-performer` — lekki klient mobilny.
  - `dist-console` — wersja administracyjna dla tabletów.
- `pnpm test` — testy jednostkowe (Vitest).
- `pnpm test:e2e` — uruchomienie testów Playwright.
