# 💻 apps/web — Interfejs Użytkownika Admin / Timeline / Client

Aplikacja `apps/web` to główny projekt kliencki zrealizowany w technologii **React + Vite**. Zawiera pełny interfejs graficzny dla reżyserii scenicznej, interaktywną oś czasu (Timeline) oraz responsywne, zoptymalizowane pod urządzenia mobilne ekrany wykonawców (Client Shell).

## 📁 Struktura projektu

- **`src/`** — Kod źródłowy aplikacji klienckiej:
  - **`src/lib/`** — Moduły pomocnicze, podzielone na 5 ścisłych kategorii zgodnie z regułą `.clinerules` / `lib-structure.mdc` (np. `@lib/audio`, `@lib/timeline`, `@lib/client`, `@lib/timeline-edit`, `@lib/shell-operator`). W katalogu `src/lib/` bezpośrednio obowiązuje zakaz umieszczania plików.
  - **`src/components/`** — Komponenty interfejsu (np. przyciski, modale, paski narzędziowe).
  - **`src/pages/`** — Główne ekrany aplikacji (Admin, Client, Timeline).
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
   - Płynne przesuwanie wskaźnika pozycji (*playhead*) wyłącznie na podstawie informacji synchronizacyjnych przesyłanych przez serwer (wygładzanie pomiędzy tickami, brak własnego zegara).

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
