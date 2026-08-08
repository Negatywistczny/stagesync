<div align="center">

<picture>
  <source media="(prefers-color-scheme: light)" srcset="apps/web/public/brand/stagesync-logo-light.svg" />
  <img src="apps/web/public/brand/stagesync-logo.svg" alt="StageSync" width="320" />
</picture>

<br />

[![Release](https://img.shields.io/github/v/release/Negatywistczny/stagesync?include_prereleases&label=release)](https://github.com/Negatywistczny/stagesync/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/Negatywistczny/stagesync/ci.yml?branch=main&label=CI)](https://github.com/Negatywistczny/stagesync/actions/workflows/ci.yml)
[![Codecov](https://img.shields.io/codecov/c/github/Negatywistczny/stagesync)](https://codecov.io/gh/Negatywistczny/stagesync)
[![Downloads](https://img.shields.io/github/downloads/Negatywistczny/stagesync/total?label=downloads)](https://github.com/Negatywistczny/stagesync/releases)
[![Stars](https://img.shields.io/github/stars/Negatywistczny/stagesync)](https://github.com/Negatywistczny/stagesync/stargazers)
[![Forks](https://img.shields.io/github/forks/Negatywistczny/stagesync)](https://github.com/Negatywistczny/stagesync/network/members)
[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-informational)](LICENSE)

**Języki i frameworki**

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)
![Rust](https://img.shields.io/badge/Rust-000000?logo=rust&logoColor=white)
![Tauri](https://img.shields.io/badge/Tauri-24C8D8?logo=tauri&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![CSS Modules](https://img.shields.io/badge/CSS_Modules-0B7285?logo=css&logoColor=white)

**Infrastruktura i tooling**

![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?logo=github-actions&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?logo=zod&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?logo=pnpm&logoColor=white)

<br />

**StageSync** — scentralizowany transport sceniczny, Timeline oraz synchronizacja stanowisk muzyków na żywo.

</div>

## ⚡ O projekcie

**StageSync** to zaawansowany, scentralizowany system reżyserii scenicznej i synchronizacji występów na żywo (*Live Show Control*). 

Łączy w sobie precyzyjny silnik transportu (SSOT), interaktywną oś czasu (Timeline) oraz wielourządzeniową synchronizację ekranów dla muzyków w sieci lokalnej — od cyfrowych partytur i akordów, po automatyzację MIDI i metronom.

### 🎯 Kluczowe możliwości

* ⏱️ **Pancerny silnik transportu (SSOT):** Jedno źródło prawdy dla zegara, tempa, metrum i osi czasu, gwarantujące idealne zsynchronizowanie całego zespołu.
* 🎼 **Dedykowane widoki muzyków (Client Shell):** Automatyczne renderowanie i synchroniczne przewijanie partytur (OSMD), widoków akordowych, tekstów oraz sekcji perkusyjnych na tabletach i ekranach wykonawców.
* 🎛️ **Reżyseria i zarządzanie setlistą:** Błyskawiczne przełączanie utworów, elastyczne szablony występów oraz pełna kontrola nad przebiegiem koncertu z poziomu panelu Admina.
* 🔌 **Automatyzacja MIDI:** Wysyłanie komunikatów *Program Change* i *Control Change* do zewnętrznych procesorów efektów, instrumentów oraz DAW.
* 📡 **Zero-config w sieci LAN:** Automatyczne wykrywanie urządzeń w sieci lokalnej (mDNS/WebSockets) bez konieczności dostępu do Internetu.

## 🚀 Szybki start

* 💻 **Desktop (zalecane):** Pobierz gotowy instalator `.dmg` / `.exe` z zakładki [Releases](https://github.com/Negatywistczny/stagesync/releases).  
  *Instrukcja krok po kroku: [docs/guides/DESKTOP.md](./docs/guides/DESKTOP.md)*
* 🐳 **Docker / Host rackowy:** Produkcyjne uruchomienie w chmurze lub na serwerze rackowym — zobacz [docs/guides/INSTALL.md](./docs/guides/INSTALL.md) *(Compose, GHCR, porty)*.
* 🛠️ **Ze źródeł (Dev):**
  * **Web + API:** **Node.js 22** + **pnpm 11** → `pnpm install` / `pnpm dev` (przeglądarka).
  * **Shell desktop (Tauri):** dodatkowo **Rust (rustup)** oraz na Windowsie **MSVC C++ Build Tools** + **WebView2** — bez tego `tauri` / `cargo` padają od razu. Skrót: [CONTRIBUTING — Środowisko](.github/CONTRIBUTING.md#środowisko); szczegóły: [DESKTOP — Wymagania](./docs/guides/DESKTOP.md#wymagania-dev--build).

```bash
git clone https://github.com/Negatywistczny/stagesync.git
cd stagesync

# KROK 1: Automatyczna weryfikacja i instalacja środowiska (Node, pnpm, Rust, MSVC)
.\scripts\setup.ps1                           # Windows (PowerShell)
# ./scripts/setup.sh                          # macOS/Linux (Bash)

# KROK 2: Uruchomienie
pnpm install
pnpm dev                                      # Vite :3000 + API :4000
pnpm --filter @stagesync/desktop dev          # wymaga Rust (+ MSVC na Windows)
```

Po `pnpm dev`: **Admin** → http://localhost:3000/admin (Vite); **API / WS** → http://localhost:4000 (`/api/health`). W Dockerze / desktop sidecarze UI i API są na tym samym porcie `:4000` — [docs/guides/INSTALL.md](./docs/guides/INSTALL.md).

> 💡 Komendy test/build/lint i reguły współpracy: [CONTRIBUTING.md](.github/CONTRIBUTING.md).

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
| 🏗️ **[ARCHITECTURE](docs/ARCHITECTURE.md)** | Mapa architektury monorepo i przepływ danych SSOT |
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
