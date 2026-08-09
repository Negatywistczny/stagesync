<div align="center">

<picture>
  <source media="(prefers-color-scheme: light)" srcset="apps/web/public/brand/stagesync-logo-light.svg" />
  <img src="apps/web/public/brand/stagesync-logo.svg" alt="StageSync" width="320" />
</picture>

<br />
<br />

<a href="https://negatywistczny.github.io/stagesync/">
  <img src="apps/web/public/brand/btn-official-website.svg" alt="Oficjalna Strona WWW" height="42" /></a>
&nbsp;&nbsp;
<a href="https://github.com/Negatywistczny/stagesync/releases">
  <img src="apps/web/public/brand/btn-download-stagesync.svg" alt="Pobierz StageSync" height="42" /></a>

<br />
<br />

[![Release](https://img.shields.io/github/v/release/Negatywistczny/stagesync?include_prereleases&color=FFB700&labelColor=18181b)](https://github.com/Negatywistczny/stagesync/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/Negatywistczny/stagesync/ci.yml?branch=main&label=CI&color=FFB700&labelColor=18181b)](https://github.com/Negatywistczny/stagesync/actions/workflows/ci.yml)
[![Codecov](https://img.shields.io/codecov/c/github/Negatywistczny/stagesync?color=FFB700&labelColor=18181b)](https://codecov.io/gh/Negatywistczny/stagesync)
[![Downloads](https://img.shields.io/github/downloads/Negatywistczny/stagesync/total?label=downloads&color=FFB700&labelColor=18181b)](https://github.com/Negatywistczny/stagesync/releases)
[![License](https://img.shields.io/badge/License-BUSL--1.1-FFB700?labelColor=18181b)](LICENSE)

<br />

**Języki i frameworki**

![TypeScript](https://img.shields.io/badge/TypeScript-18181b?logo=typescript&logoColor=FFB700)
![React](https://img.shields.io/badge/React-18181b?logo=react&logoColor=FFB700)
![Rust](https://img.shields.io/badge/Rust-18181b?logo=rust&logoColor=FFB700)
![Tauri](https://img.shields.io/badge/Tauri-18181b?logo=tauri&logoColor=FFB700)
![Node.js](https://img.shields.io/badge/Node.js-18181b?logo=nodedotjs&logoColor=FFB700)
![CSS Modules](https://img.shields.io/badge/CSS_Modules-18181b?logo=css&logoColor=FFB700)

**Infrastruktura i tooling**

![Docker](https://img.shields.io/badge/Docker-18181b?logo=docker&logoColor=FFB700)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-18181b?logo=githubactions&logoColor=FFB700)
![Zod](https://img.shields.io/badge/Zod-18181b?logo=zod&logoColor=FFB700)
![Vite](https://img.shields.io/badge/Vite-18181b?logo=vite&logoColor=FFB700)
![Vitest](https://img.shields.io/badge/Vitest-18181b?logo=vite&logoColor=FFB700)
![pnpm](https://img.shields.io/badge/pnpm-18181b?logo=pnpm&logoColor=FFB700)

<br />

**StageSync** — scentralizowana oś czasu, sterowanie odtwarzaniem oraz synchronizacja stanowisk muzyków na żywo.

</div>

## ⚡ O projekcie

**StageSync** to zaawansowany, scentralizowany system reżyserii scenicznej i synchronizacji występów na żywo (*Live Show Control*). 

Łączy w sobie precyzyjny silnik transportu (SSOT), interaktywną oś czasu (Timeline) oraz wielourządzeniową synchronizację ekranów dla muzyków w sieci lokalnej — od cyfrowych partytur i akordów, po automatyzację MIDI i metronom.

### 🎯 Kluczowe możliwości

* ⏱️ **Pancerny silnik transportu (SSOT):** Jedno źródło prawdy dla zegara, tempa, metrum i osi czasu, gwarantujące idealne zsynchronizowanie całego zespołu.
* 🎼 **Dedykowane widoki muzyków (Client Shell):** Automatyczne renderowanie i synchroniczne przewijanie partytur (OSMD), widoków akordowych, tekstów oraz sekcji perkusyjnych na tabletach i ekranach wykonawców.
* 🎛️ **Reżyseria i zarządzanie setlistą:** Błyskawiczne przełączanie utworów, elasteczne szablony występów oraz pełna kontrola nad przebiegiem koncertu z poziomu panelu Admina.
* 🔌 **Automatyzacja MIDI:** Wysyłanie komunikatów *Program Change* i *Control Change* do zewnętrznych procesorów efektów, instrumentów oraz DAW.
* 📡 **Zero-config w sieci LAN:** Automatyczne wykrywanie urządzeń w sieci lokalnej (mDNS/WebSockets) bez konieczności dostępu do Internetu.

## 🚀 Szybki start

### 🛠️ Uruchomienie ze źródeł (Dla deweloperów)

Wszystko w jednej komendzie (automatyczny setup środowiska + interaktywne centrum sterowania):

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/Negatywistczny/stagesync.git
cd stagesync

# 2. Uruchom natywny DX Suite
# Windows (PowerShell):
.\dev

# Windows (CMD):
dev

# macOS / Linux:
./dev
```

Skrypt weryfikuje środowisko (Node/pnpm) i uruchamia **Dev Hub**:
* **Admin UI:** http://localhost:3000/admin
* **API / WS:** http://localhost:4000 (`/api/health`)

> 💡 Komendy test/build/lint, podgląd wymagań kompilacji Tauri/Rust oraz reguły współpracy: [CONTRIBUTING.md](.github/CONTRIBUTING.md).

---

### 📦 Dla użytkowników i wdrożeń produkcyjnych

* 💻 **Aplikacja Desktop (Windows / macOS):** Pobierz gotowy instalator z [GitHub Releases](https://github.com/Negatywistczny/stagesync/releases).
* 🐳 **Serwer Dedykowany (Docker):** Zobacz [Instrukcję wdrożenia serwerowego](./docs/guides/INSTALL.md).

## 📦 Monorepo

| Ścieżka | Rola | Opis |
| :--- | :--- | :--- |
| 📱 **[`apps/`](apps/README.md)** | **Kontener aplikacji** | Główny katalog aplikacji monorepo |
| -> ⚙️ **[`server`](apps/server/README.md)** | API i transport SSOT | Serwer czasu, persystencja |
| -> 💻 **[`web`](apps/web/README.md)** | UI Admin / Client / Timeline | Oś czasu, panele, sterowanie |
| -> 🖥️ **[`desktop`](apps/desktop/README.md)** | Tauri Shell | Natywne paczkowanie i autowykrywanie |
| -> 📱 **[`performer`](apps/performer/README.md)** | Android Client | Lekki klient sceniczny |
| -> 📱 **[`console`](apps/console/README.md)** | Android Admin Shell | Zarządzanie z tabletu |
| -> 🌐 **[`www`](apps/www/README.md)** | Publiczne WWW | Portal i aktualności |
| 📦 **[`packages/`](packages/README.md)** | **Pakiety współdzielone** | Biblioteki, konfiguracje i design system |
| -> 📐 **[`shared`](packages/shared/README.md)** | Czysta logika i czas | Walidacja Zod, helpery ticks/PPQ |
| -> 🎨 **[`ui`](packages/ui/README.md)** | Design System | Komponenty bez logiki, CSS Modules |
| 📂 **[`data/`](data/README.md)** | Dane operacyjne | Magazyn runtime, projekty v3 i logi *(w `.gitignore`)* |
| 🛠️ **[`scripts/`](scripts/README.md)** | Narzędzia i automatyzacja | Skrypty release, build i generowania mapy |
| 📚 **[`docs/`](docs/README.md)** | Baza wiedzy | Dokumentacja techniczna, specyfikacje i decyzje ADR |

## 📚 Dokumentacja

| Dokument | Opis |
| :--- | :--- |
| 🚀 **[INSTALL](./docs/guides/INSTALL.md)** | Produkcyjne wdrożenie Docker Compose / GHCR (PIN, Safety Net, motyw) |
| 🖥️ **[DESKTOP](./docs/guides/DESKTOP.md)** | Instalatory Tauri (`.dmg`, `.exe`), Launcher i aktualizacja |
| 📱 **[MOBILE](./docs/guides/MOBILE.md)** | Performer / Console — sideload APK, QR, Offline-First |
| 🏗️ **[ARCHITECTURE](docs/ARCHITECTURE.md)** | Mapa architektura monorepo i przepływ danych SSOT |
| 🗺️ **[REPO_MAP](docs/REPO_MAP.md)** | Automatycznie generowana mapa struktury i statystyki kodu dla LLM |
| 🔌 **[API](docs/api/README.md)** | Specyfikacja powierzchni REST API i punktów końcowych |
| 💡 **[ADR](docs/adr/README.md)** | Dziennik decyzji architektonicznych (*Architecture Decision Records*) |
| 🗺️ **[ROADMAP](docs/ROADMAP.md)** / **[TODO](docs/TODO.md)** | Kamienie milowe, plan rozwoju oraz bieżąca checklista |
| 📜 **[CHANGELOG](CHANGELOG.md)** | Historia wydań (`5.4` Syllables, …) |
| 🎨 **[UI](docs/ui/README.md)** | Przewodnik po Design Systemie i tokenach CSS |
| 🔒 **[SECURITY](.github/SECURITY.md)** | Polityka bezpieczeństwa i zgłaszanie podatności |
| 🤝 **[CONTRIBUTING](.github/CONTRIBUTING.md)** | Standardy commitów, obsługa PR-ów i praca na gałęziach |

## 📜 Licencja

StageSync jest **source-available** na [Business Source License 1.1](LICENSE) (SPDX: `BUSL-1.1`).
Domyślnie dozwolone jest użycie **nieprodukcyjne** (dev / test / ewaluacja). **Produkcja** (w tym własny host sceniczny) wymaga osobnej licencji komercyjnej — szczegóły i kontakt w `LICENSE`.
