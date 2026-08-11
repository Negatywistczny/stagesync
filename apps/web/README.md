> [📦 StageSync](../../README.md) / [apps](../README.md)

# 💻 apps/web — Interfejs Użytkownika Admin / Timeline / Client

Aplikacja `apps/web` to główny projekt kliencki zrealizowany w technologii **React + Vite**. Zawiera pełny interfejs graficzny dla reżyserii scenicznej, interaktywną oś czasu (Timeline) oraz responsywne, zoptymalizowane pod urządzenia mobilne ekrany wykonawców (Client Shell).

## 📁 Struktura projektu

- **`src/`** — Kod źródłowy aplikacji klienckiej:
  ```text
  src/
  ├── shells/                 # Powłoki i ekrany interfejsu UI
  │   ├── admin/              # Zarządzanie bazą utworów, setlistą i sceną (/admin)
  │   ├── client/             # Ekrany sceniczne muzyków (/client: Karaoke, OSMD, Akordy, Drums)
  │   ├── desktop/            # Pasek tytułu, menubar i obsługa okiem dla Tauri Desktop
  │   ├── import/             # Kreatory importu UltraStar, Ultimate Guitar i Audio
  │   ├── settings/           # Popovery i modale ustawień serwera/motywu/audio
  │   ├── timeline/           # Edytor osi czasu DAW (ścieżki, klipy, inspektory, mixer)
  │   └── components/         # Współdzielone kontrolki shella (AppHeader, Navigation, Gates)
  ├── lib/                    # Logika domenowa ułożona w 5 modułów (@lib/*)
  │   ├── audio/              # Analiza tempa DSP, Smart Tempo, silnik odtwarzania audio
  │   ├── timeline/           # Logika osi czasu, siatka kwantyzacji i pozycjonowanie klipów
  │   ├── timeline-edit/      # Operacje edycyjne klipów, podział nożyczkami, drag & drop
  │   ├── client/             # Płynny kursor OSMD, karuzela fraz, formatowanie akordów
  │   └── shell-operator/     # Zarządzanie pinami, połączeniami i obecnością na scenie
  ├── transport/              # Klient WebSocket odbierający ticki czasu SSOT z serwera
  └── dev/                    # Narzędzia deweloperskie i podglądy pomocnicze
  ```
- **`public/`** — Zasoby statyczne (logotypy brandu, ikony, czcionki).
- **`scripts/`** — Skrypty budowania wariantów mobilnych (Performer i Console na Androida).
- **[`e2e/`](./e2e/README.md)** — Testy end-to-end realizowane przy użyciu **Playwright**.
- **`test/`** — Konfiguracja i zestawy testów jednostkowych i integracyjnych (Vitest).

## 🚀 Główne funkcjonalności

1. **Panel Admina / Timeline (`/admin`):**
   - Zaawansowany edytor osi czasu wzorowany na profesjonalnych stacjach roboczych DAW (Logic Pro).
   - Sterowanie odtwarzaczem, lokatorami, pętlami oraz zarządzanie biblioteką utworów i setlistą.
2. **Ekrany Klienta (`/client`):**
   - Synchroniczne renderowanie cyfrowych partytur (OSMD), siatek akordów, tekstów piosenek (karaoke) oraz sekcji tapowania dla wokalistów/perkusistów.
   - Płynne przesuwanie wskaźnika pozycji (_playhead_) wyłącznie na podstawie informacji synchronizacyjnych przesyłanych przez serwer (wygładzanie pomiędzy tickami, brak własnego zegara).

## 🎨 Standardy

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
