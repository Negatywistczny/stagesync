> [📦 StageSync](../../../README.md) / [apps](../../README.md) / [web](../README.md)

# 💻 apps/web/src — Moduły i Struktura Kodu Web UI

Katalog `src/` zawiera kompletny kod źródłowy interfejsu graficznego StageSync zrealizowany w technologii **React + Vite**.

## 📁 Struktura i przeznaczenie subkatalogów

- **`shells/`** — Powłoki i ekrany interfejsu użytkownika:
  - **`admin/`** — Panel zarządzania koncertem, setlistą, biblioteką utworów i ustawieniami sceny (`/admin`).
  - **`client/`** — Responsywne ekrany sceniczne dla muzyków (`/client`: widoki Karaoke, partytur OSMD, Akordów oraz Sekcji Perkusyjnej).
  - **`desktop/`** — Zintegrowany menubar, pasek tytułu i obsługa okna dla kontenera Tauri Desktop.
  - **`import/`** — Kreatory importu piosenek z formatów UltraStar (.txt), Ultimate Guitar (Chords) i plików audio.
  - **`settings/`** — Popovery i okna modalne konfiguracji serwera, motywów kolorystycznych i parametrów audio.
  - **`timeline/`** — Zaawansowany edytor osi czasu DAW (ścieżki audio, klipy Formy/tekstu/akordów, inspektory właściwości, mikser).
  - **`components/`** — Współdzielone kontrolki nagłówka i paska nawigacji (AppHeader, OperatorNav, DeviceGates).

- **`lib/`** — Logika pomocnicza i domenowa podzielona na 5 ścisłych modułów (alias `@lib/*`):
  - **`audio/`** — Algorytmy DSP, analiza tempa Smart Tempo, silnik odtwarzania audio i kontrola miksera.
  - **`timeline/`** — Logika matematyczna osi czasu, siatka kwantyzacji (snap grid) i przeliczanie pozycji.
  - **`timeline-edit/`** — Operacje edycji klipów (podział nożyczkami, zmiana rozmiaru, przeciąganie).
  - **`client/`** — Płynny kursor partytury OSMD, karuzela fraz karaoke i formatowanie transpozycji akordów.
  - **`shell-operator/`** — Autoryzacja PIN-em operatora, monitoring połączeń LAN i obecności urządzeń.

- **`transport/`** — Klient synchronizacji WebSockets:
  - Odbiera ticki zegara SSOT z serwera i wygładza pozycję playheada wyłącznie pomiędzy tickami.

- **`dev/`** — Komponenty deweloperskie i podglądy pomocnicze.
