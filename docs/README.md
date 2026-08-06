# 📚 docs/ — Dokumentacja Techniczna, Standardy i ADR

Katalog `docs/` stanowi centralną bazę wiedzy dla twórców, instalatorów, muzyków i operatorów systemu StageSync. Znajdują się tu specyfikacje techniczne, indeksy decyzji architektonicznych (ADR) oraz poradniki operacyjne.

## 📁 Struktura katalogu

### Dokumenty główne:
- **`ARCHITECTURE.md`** — Mapa architektury całego monorepo, zasada transportu SSOT oraz przepływy danych.
- **`STANDARDS.md`** — Standardy zewnętrzne, ergonomia oraz przyjęte konwencje deweloperskie.
- **`REPO_MAP.md`** — Automatycznie generowana mapa kodu źródłowego, ułatwiająca analizę projektu przez systemy AI (agenci LLM).
- **`ROADMAP.md`** — Długoterminowa ścieżka rozwoju.
- **`TODO.md`** — Dynamiczny plik zadań do wykonania.

### Podręczniki operacyjne:
- **`INSTALL.md`** — Instrukcja wdrożenia produkcyjnego w środowisku Docker (Docker Compose, rejestr GHCR, porty, zmienne środowiskowe).
- **`DESKTOP.md`** — Poradnik konfiguracji, budowania i aktualizacji aplikacji desktopowych opartych na Tauri.
- **`MOBILE.md`** — Poradnik uruchamiania i dystrybucji (sideloading APK, obsługa QR-kodów) dla platform Android.
- **`MIGRATION.md`** — Instrukcje przeniesienia danych z wersji v4 legacy do v5.

### Podkatalogi specjalistyczne:
- **`adr/`** — Indeks decyzji architektonicznych (*Architecture Decision Records*). Każda kluczowa zmiana technologiczna lub strukturalna jest tu szczegółowo opisywana i numerowana (np. `0011-ui-parity-behavior.md`).
- **`api/`** — Specyfikacja punktów końcowych interfejsu REST i WebSockets.
- **`analysis/`** — Raporty z audytów wydajnościowych, notatki robocze oraz analizy porównawcze (podzielone na commitowane `reports/` oraz ignorowane `working/` wg `.clinerules`).
- **`examples/`** — Przykładowe pliki projektów dla wersji v5 i legacy v4.
- **`ui/`** — Zestawienia, inwentarz komponentów i wizualna analiza interfejsu.

## ⚙️ Rola w projekcie

Wszelkie modyfikacje funkcjonalności interfejsu lub mechaniki synchronizacji czasu muszą być uprzednio weryfikowane z zapisami w tym katalogu. Działa tu **Zasada Parity** (parytetu funkcjonalnego z wersją v4 legacy) jako nadrzędny wymóg stabilności systemu estradowego.
