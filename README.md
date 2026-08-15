<div align="center">

<picture>
  <source media="(prefers-color-scheme: light)" srcset="apps/web/public/brand/stagesync-logo-light.svg" />
  <img src="apps/web/public/brand/stagesync-logo.svg" alt="StageSync" width="320" />
</picture>

<br />
<br />

<a href="https://kacperczeczot.github.io/stagesync/">
  <img src="apps/web/public/brand/btn-official-website.svg" alt="Oficjalna Strona WWW" height="42" /></a>
&nbsp;&nbsp;
<a href="https://github.com/kacperczeczot/stagesync/releases">
  <img src="apps/web/public/brand/btn-download-stagesync.svg" alt="Pobierz StageSync" height="42" /></a>

<br />
<br />

[![Release](https://img.shields.io/github/v/release/kacperczeczot/stagesync?include_prereleases&color=FFB700&labelColor=18181b)](https://github.com/kacperczeczot/stagesync/releases)
[![CI](https://img.shields.io/github/actions/workflow/status/kacperczeczot/stagesync/ci.yml?branch=main&label=CI&color=FFB700&labelColor=18181b)](https://github.com/kacperczeczot/stagesync/actions/workflows/ci.yml)
[![Codecov](https://img.shields.io/codecov/c/github/kacperczeczot/stagesync?color=FFB700&labelColor=18181b)](https://codecov.io/gh/kacperczeczot/stagesync)
[![Downloads](https://img.shields.io/github/downloads/kacperczeczot/stagesync/total?label=downloads&color=FFB700&labelColor=18181b)](https://github.com/kacperczeczot/stagesync/releases)
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

**StageSync** to zaawansowany, scentralizowany system reżyserii scenicznej i synchronizacji występów na żywo (_Live Show Control_).

Łączy w sobie precyzyjny silnik transportu (SSOT), interaktywną oś czasu (Timeline) oraz wielourządzeniową synchronizację ekranów dla muzyków w sieci lokalnej — od cyfrowych partytur i akordów, po automatyzację MIDI i metronom.

### 🎯 Kluczowe możliwości

- ⏱️ **Pancerny silnik transportu (SSOT):** Jedno źródło prawdy dla zegara, tempa, metrum i osi czasu, gwarantujące idealne zsynchronizowanie całego zespołu.
- 🎼 **Dedykowane widoki muzyków (Client Shell):** Automatyczne renderowanie i synchroniczne przewijanie partytur (OSMD), widoków akordowych, tekstów oraz sekcji perkusyjnych na tabletach i ekranach wykonawców.
- 🎛️ **Reżyseria i zarządzanie setlistą:** Błyskawiczne przełączanie utworów, elasteczne szablony występów oraz pełna kontrola nad przebiegiem koncertu z poziomu panelu Admina.
- 🔌 **Automatyzacja MIDI:** Wysyłanie komunikatów _Program Change_ i _Control Change_ do zewnętrznych procesorów efektów, instrumentów oraz DAW.
- 📡 **Zero-config w sieci LAN:** Automatyczne wykrywanie urządzeń w sieci lokalnej (mDNS/WebSockets) bez konieczności dostępu do Internetu.

## 🚀 Szybki start

### 🛠️ Uruchomienie ze źródeł (Dla deweloperów)

#### 1. Sklonuj repozytorium

```bash
git clone https://github.com/kacperczeczot/stagesync
cd stagesync
```

#### 2. Uruchom DX Hub

```bash
dev           # Windows (CMD)
.\dev         # Windows (PowerShell)
./dev         # macOS / Linux
```

Więcej informacji znajdziesz w pełnej [Dokumentacji DX](./docs/guides/DX.md).
<br>

---

### 📦 Dla użytkowników i wdrożeń produkcyjnych

- 💻 **Aplikacja Desktop (Windows / macOS):** Pobierz gotowy instalator z [GitHub Releases](https://github.com/kacperczeczot/stagesync/releases).
- 🐳 **Serwer Dedykowany (Docker):** Zobacz [Instrukcję wdrożenia serwerowego](./docs/guides/INSTALL.md).

## 📦 Monorepo

| Ścieżka                                  | Opis                                                                                        |
| :--------------------------------------- | :------------------------------------------------------------------------------------------ |
| 📱 **[`apps/`](apps/README.md)**         | Aplikacje końcowe: Serwer SSOT, Web UI, Desktop (Tauri), Android (Performer / Console), WWW |
| 📦 **[`packages/`](packages/README.md)** | Pakiety współdzielone: logika domenowa (`shared`), Design System (`ui`), wtyczki i tooling  |
| 📂 **[`data/`](data/README.md)**         | Magazyn runtime: pliki projektów v5, biblioteka utworów oraz logi _(w `.gitignore`)_        |
| 🛠️ **[`scripts/`](scripts/README.md)**   | Narzędzia deweloperskie: Dev Hub, skrypty release, setup oraz automatyzacja CI              |
| 📚 **[`docs/`](docs/README.md)**         | Baza wiedzy: podręczniki operatorskie, specyfikacje API, architektura i decyzje ADR         |

## 📚 Dokumentacja

| Dokument                                                     | Kategoria    | Opis                                                                  |
| :----------------------------------------------------------- | :----------- | :-------------------------------------------------------------------- |
| 🏗️ **[ARCHITECTURE](docs/architecture/ARCHITECTURE.md)**     | Architektura | Mapa architektury monorepo, zasada transportu SSOT i granice          |
| 💡 **[ADR](docs/architecture/adr/README.md)**                | Architektura | Dziennik decyzji architektonicznych (_Architecture Decision Records_) |
| 🔌 **[API](docs/architecture/api/README.md)**                | Architektura | Specyfikacja powierzchni REST API i punktów końcowych WebSocket       |
| 🎨 **[UI](docs/architecture/ui/README.md)**                  | Architektura | Przewodnik po Design Systemie, komponentach i tokenach CSS            |
| 📐 **[STANDARDS](docs/standards/STANDARDS.md)**              | Standardy    | Standardy zewnętrzne (SemVer, Conventional Commits, TSDoc)            |
| 🧪 **[TESTING](docs/standards/TESTING.md)**                  | Standardy    | Strategia testowa, bramki CI i minimalne/zalecane progi pokrycia      |
| 🚀 **[INSTALL](docs/guides/INSTALL.md)**                     | Podręczniki  | Produkcyjne wdrożenie Docker Compose / GHCR (PIN, Safety Net, motyw)  |
| 🖥️ **[DESKTOP](docs/guides/DESKTOP.md)**                     | Podręczniki  | Instalatory Tauri (`.dmg`, `.exe`), Launcher i aktualizacja           |
| 📱 **[MOBILE](docs/guides/MOBILE.md)**                       | Podręczniki  | Performer / Console — sideload APK, QR, Offline-First                 |
| 🛠️ **[DX](docs/guides/DX.md)**                               | Podręczniki  | Przewodnik deweloperski, konfiguracja środowiska oraz Dev Hub         |
| 🗺️ **[ROADMAP](docs/ROADMAP.md)** / **[TODO](docs/TODO.md)** | Zarządzanie  | Kamienie milowe, plan rozwoju oraz bieżąca checklista zadań           |
| 🗺️ **[REPO_MAP](docs/REPO_MAP.md)**                          | Indeksy      | Automatycznie generowana mapa kodu źródłowego (`generate:map`)        |
| 📜 **[CHANGELOG](CHANGELOG.md)**                             | Historia     | Historia wydań                                                        |
| 🔒 **[SECURITY](.github/SECURITY.md)**                       | Polityka     | Polityka bezpieczeństwa i zgłaszanie podatności                       |
| 🤝 **[CONTRIBUTING](.github/CONTRIBUTING.md)**               | Współpraca   | Standardy commitów, obsługa PR-ów i praca na gałęziach                |

## 📜 Licencja

StageSync jest **source-available** na [Business Source License 1.1](LICENSE) (SPDX: `BUSL-1.1`).
Domyślnie dozwolone jest użycie **nieprodukcyjne** (dev / test / ewaluacja). **Produkcja** (w tym własny host sceniczny) wymaga osobnej licencji komercyjnej — szczegóły i kontakt w `LICENSE`.
