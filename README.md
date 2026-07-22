# StageSync

[![CI](https://img.shields.io/badge/CI-GitHub_Actions-2088FF?logo=githubactions&logoColor=white)](https://github.com/Negatywistyczny/stagesync/actions/workflows/ci.yml)
[![version](https://img.shields.io/badge/version-5.0.0--beta.2-blue)](https://github.com/Negatywistyczny/stagesync/releases)
[![license](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**StageSync** to nowoczesny, wieloplatformowy system synchronizacji scenicznej oraz odtwarzania osi czasu (Timeline) przeznaczony dla realizatorów, zespołów i operatorów wydarzeń na żywo.

> ℹ️ **Legacy 4.x:** [STAGESYNC-APP-LEGACY](https://github.com/Negatywistyczny/STAGESYNC-APP-LEGACY). Rozwój wersji v5: [stagesync](https://github.com/Negatywistyczny/stagesync).

---

### ✨ Kluczowe możliwości
- ⏱ **Precyzyjna Oś Czasu (Timeline):** Obsługa wielościeżkowego audio, pętli, przejść fade/crossfade oraz płynnego przyciągania (Snap).
- 🌐 **Architektura Host / Client:** Centralny serwer sceniczny synchronizujący w czasie rzeczywistym podłączone iPady i ekrany muzyków.
- 💻 **Natywna Aplikacja Desktopowa:** Lekkie środowisko Tauri dla macOS i Windows z wbudowanym automatycznym silnikiem (sidecar).

---

## 🚀 Szybki start — Scena / Produkcja

### Aplikacja Desktopowa (Tauri — zalecana dla operatora)

1. Pobierz instalator `.dmg` (macOS) lub `.msi` (Windows) z sekcji [Releases](https://github.com/Negatywistyczny/stagesync/releases).
2. Zainstaluj i uruchom aplikację — wbudowany serwer wystartuje automatycznie, otwierając widok Admina i Osi Czasu.

> 📄 Pełna instrukcja obsługi: [docs/DESKTOP.md](docs/DESKTOP.md)

---

### Serwer Sceniczny (Docker — infrastruktura dedykowana)

Dla dedykowanych serwerów rackowych i instalacji stacjonarnych:

```sh
docker login ghcr.io          # PAT read:packages — jednorazowo
cp .env.example .env          # Ustaw STAGESYNC_VERSION i tokeny
docker compose -f compose.prod.yml up -d
```

| URL | Rola / Dostęp |
| :--- | :--- |
| `http://localhost:4000/admin` | Panel Admina (konfiguracja, stan sieci) |
| `http://localhost:4000/timeline` | Edytor Osi Czasu (Timeline) |
| `http://localhost:4000/` | Widok Klienta (ekrany dla muzyków) |

> 📄 Pełna instrukcja wdrożenia: [docs/INSTALL.md](docs/INSTALL.md)

---

### 🔄 Aktualizacja

- **Aplikacja Desktop:** Wybierz w menu: `Admin` → `Sprawdź aktualizacje`.
- **Docker:** Zmień zmienną `STAGESYNC_VERSION` w pliku `.env` i przeładuj kontenery (`docker compose -f compose.prod.yml up -d`).

---

## 🛠 Deweloperzy (Uruchomienie ze źródeł)

**Wymagania:** Node.js 20 (`nvm use`), [pnpm](https://pnpm.io/) 9.

```sh
# 1. Sklonuj repozytorium i zainstaluj zależności
git clone [https://github.com/Negatywistyczny/stagesync.git](https://github.com/Negatywistyczny/stagesync.git)
cd stagesync
pnpm install

# 2. Uruchom środowisko deweloperskie (Web :3000 + Server :4000)
pnpm dev
```

### Przydatne polecenia:
```sh
pnpm test      # Uruchomienie zestawu testów
pnpm build     # Kompilacja produkcyjna paczek
pnpm lint      # Weryfikacja spójności kodu i linter
```

---

## 📚 Dokumentacja i Architektura

| Przewodnik | Opis |
| :--- | :--- |
| 🚀 [INSTALL](docs/INSTALL.md) | Wdrożenie produkcyjne Docker Compose, GHCR, procedury rollback |
| 💻 [DESKTOP](docs/DESKTOP.md) | Konfiguracja aplikacji Tauri oraz architektura Sidecara |
| 🏗 [ARCHITECTURE](docs/ARCHITECTURE.md) | Mapa monorepo, model danych SSOT i integracja |
| 🗺 [ROADMAP](docs/ROADMAP.md) | Kamienie milowe i etapy wydań (Alpha → Beta → 5.0.0) |
| 📋 [TODO](docs/TODO.md) | Bieżąca lista zadań i priorytetów |
| 📝 [CHANGELOG](CHANGELOG.md) | Pełna historia zmian |
| 🎨 [UI System](docs/ui/README.md) | Design System, tokeny i komponenty UI |
| 🤝 [CONTRIBUTING](CONTRIBUTING.md) | Zasady współtworzenia kodu i standardy commitów |