# docs/ — Dokumentacja Techniczna, Standardy i ADR

Katalog `docs/` stanowi centralną bazę wiedzy dla twórców, instalatorów, muzyków i operatorów systemu StageSync. Znajdują się tu specyfikacje techniczne, indeksy decyzji architektonicznych (ADR) oraz poradniki operacyjne.

## Struktura katalogu

### Dokumenty główne

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Mapa architektury całego monorepo, zasada transportu SSOT oraz przepływy danych.
- **[STANDARDS.md](./STANDARDS.md)** — Standardy zewnętrzne, ergonomia oraz przyjęte konwencje deweloperskie.
- **[REPO_MAP.md](./REPO_MAP.md)** — Automatycznie generowana mapa kodu źródłowego (`pnpm generate:map`), ułatwiająca analizę projektu przez systemy AI.
- **[ROADMAP.md](./ROADMAP.md)** — Długoterminowa ścieżka rozwoju.
- **[TODO.md](./TODO.md)** — Dynamiczny plik zadań do wykonania.

### Podręczniki operacyjne (`guides/`)

- **[INSTALL.md](./guides/INSTALL.md)** — Instrukcja wdrożenia produkcyjnego w środowisku Docker (Docker Compose, rejestr GHCR, porty, zmienne środowiskowe).
- **[DESKTOP.md](./guides/DESKTOP.md)** — Poradnik konfiguracji, budowania i aktualizacji aplikacji desktopowych opartych na Tauri.
- **[MOBILE.md](./guides/MOBILE.md)** — Poradnik uruchamiania i dystrybucji (sideloading APK, obsługa QR-kodów) dla platform Android.
- **[MIGRATION.md](./guides/MIGRATION.md)** — Instrukcje przeniesienia danych z wersji v4 legacy do v5.

### Podkatalogi specjalistyczne

- **`adr/`** — Indeks decyzji architektonicznych (*Architecture Decision Records*).
- **`api/`** — Specyfikacja punktów końcowych interfejsu REST i WebSockets.
- **`analysis/`** — Raporty kanoniczne (`reports/{current,milestones,hygiene}/`), inspiracje zewnętrzne + triage, oraz lokalny scratch `working/`.
- **`examples/`** — Przykładowe pliki projektów dla wersji v5 i legacy v4.
- **`ui/`** — Design system (kolory, typografia, spacing, Button) oraz inwentarz shelli.
- **`guides/`** — Podręczniki operatorskie (INSTALL / DESKTOP / MOBILE / MIGRATION).

## Rola w projekcie

Wszelkie modyfikacje funkcjonalności interfejsu lub mechaniki synchronizacji czasu muszą być uprzednio weryfikowane z zapisami w tym katalogu. Działa tu **Zasada Parity** (parytetu funkcjonalnego z wersją v4 legacy) jako nadrzędny wymóg stabilności systemu estradowego.

Wkład i język docs: [`.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md). Zgłoszenia bezpieczeństwa: [`.github/SECURITY.md`](../.github/SECURITY.md).
