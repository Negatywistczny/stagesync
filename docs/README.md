> [📦 StageSync](../README.md)

# 📚 docs/ — Dokumentacja Techniczna, Standardy i Architektura

Katalog `docs/` stanowi centralną bazę wiedzy dla twórców, instalatorów, muzyków i operatorów systemu **StageSync**.

Dokumentacja jest podzielona na **4 główne filary domenowe**:

---

## 📁 Struktura i Filary Dokumentacji

### 1. 🏛️ Architektura i Domena ([`architecture/`](./architecture/README.md))

_Opis działania systemu, niezmienniki domenowe, autorytet serwera i decyzje._

- **[ARCHITECTURE.md](./architecture/ARCHITECTURE.md)** — Główna mapa architektury, Timebase SSOT (ticks / PPQ), silnik transportu i granice pakietów.
- **[`adr/`](./architecture/adr/README.md)** — Rejestr decyzji architektonicznych (_Architecture Decision Records_, ADR 0001–0019).
- **[`api/`](./architecture/api/README.md)** — Specyfikacja kontraktów programistycznych REST i WebSocket (`/ws/transport`).
- **[`ui/`](./architecture/ui/README.md)** — Specyfikacja Design Systemu (kolory, typografia, spacing, inwentarz kontrolek).

---

### 2. 📐 Standardy Inżynieryjne i Jakość ([`standards/`](./standards/README.md))

_Reguły jakościowe, kontrakty kodu, bramki testowe i audyty._

- **[STANDARDS.md](./standards/STANDARDS.md)** — Standardy zewnętrzne (Conventional Commits, SemVer, Keep a Changelog, TSDoc, EditorConfig).
- **[TESTING.md](./standards/TESTING.md)** — Strategia testowania, architektura testów, bramki CI i progi pokrycia kodu per moduł.
- **[`analysis/`](./standards/analysis/README.md)** — Raporty audytowe (`reports/`), inspiracje z profesjonalnych DAW oraz notatki robocze.

---

### 3. 📖 Podręczniki Operacyjne ([`guides/`](./guides/README.md))

_Instrukcje wdrożeniowe i operacyjne „krok po kroku”._

- **[INSTALL.md](./guides/INSTALL.md)** — Wdrożenie produkcyjne serwera (Docker Compose, GHCR, porty, zmienne środowiskowe, bezpieczeństwo).
- **[DESKTOP.md](./guides/DESKTOP.md)** — Budowanie, launcher i aktualizacja aplikacji desktopowych Tauri (`.dmg`, `.msi`, `.exe`).
- **[MOBILE.md](./guides/MOBILE.md)** — Uruchamianie i dystrybucja aplikacji Android — Performer i Console (sideloading APK, QR kody).
- **[DX.md](./guides/DX.md)** — Przewodnik deweloperski — konfiguracja środowiska, Dev Hub TUI, komendy monorepo i troubleshooting.

---

### 4. 🗺️ Zarządzanie Projektem i Indeksy (Root `docs/`)

_Plany rozwojowe, bieżący backlog i automatyczne mapy kodu._

- **[ROADMAP.md](./ROADMAP.md)** — Długoterminowa ścieżka rozwoju i kamienie milowe.
- **[TODO.md](./TODO.md)** — Aktywny backlog bieżącego etapu prac.
- **[REPO_MAP.md](./REPO_MAP.md)** — Automatycznie generowana mapa kodu źródłowego (`pnpm generate:map`), ułatwiająca analizę projektu przez systemy AI.
- **[`examples/`](./examples/README.md)** — Przykładowe pliki pakietów projektów v5 (`.stagesync.json`).

---

## 🎨 Standardy i Wkład

Wszelkie modyfikacje funkcjonalności interfejsu lub mechaniki synchronizacji czasu muszą być uprzednio weryfikowane z zapisami w tym katalogu. Działa tu **Zasada Parity** (parytetu funkcjonalnego z wersją v4 legacy) jako nadrzędny wymóg stabilności systemu estradowego.

Wkład i język docs: [`.github/CONTRIBUTING.md`](../.github/CONTRIBUTING.md). Zgłoszenia bezpieczeństwa: [`.github/SECURITY.md`](../.github/SECURITY.md).
