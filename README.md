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

<br />

**StageSync** — scentralizowany transport sceniczny, Timeline oraz synchronizacja Clientów muzyków podczas koncertów na żywo.

</div>

## Stos technologiczny

<div align="center">

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

</div>

## Szybki start

**Desktop (zalecane):** pobierz `.dmg` / `.msi` z [Releases](https://github.com/Negatywistczny/stagesync/releases), zainstaluj i uruchom. Szczegóły: [docs/DESKTOP.md](docs/DESKTOP.md).

**Docker / host rackowy:** zobacz [docs/INSTALL.md](docs/INSTALL.md) (Compose, GHCR, porty, aktualizacje).

**Ze źródeł (dev):** Node.js **20** + [pnpm](https://pnpm.io/) 9. Buildy desktop ze źródeł wymagają też **Rust** (Tauri).

```sh
git clone https://github.com/Negatywistczny/stagesync.git
cd stagesync && pnpm install && pnpm dev
```

`test` / `build` / `lint` oraz reguły współpracy → [CONTRIBUTING.md](CONTRIBUTING.md).

## Monorepo

| Ścieżka | Rola |
| :--- | :--- |
| `apps/server` | API, persystencja, transport SSOT |
| `apps/web` | UI Admin / Timeline / Client |
| `apps/desktop` | Shell Tauri + sidecar Node |
| `packages/shared` | Schematy Zod + czyste helpery czasu |
| `packages/ui` | Design system (tokeny `--ss-*`) |
| `data/` | Szablony runtime (projekty użytkownika w gitignore) |

## Dokumentacja

| Dokument | |
| :--- | :--- |
| [INSTALL](docs/INSTALL.md) | Produkcja Docker / GHCR |
| [DESKTOP](docs/DESKTOP.md) | Instalatory Tauri i updater |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Mapa monorepo i SSOT |
| [docs/api](docs/api/) | Powierzchnia REST |
| [ADR](docs/adr/) | Decyzje architektoniczne |
| [SECURITY](SECURITY.md) | Zgłaszanie podatności |
| [ROADMAP](docs/ROADMAP.md) / [TODO](docs/TODO.md) | Kamienie milowe i checklista |
| [CHANGELOG](CHANGELOG.md) | Historia wydań |
| [UI](docs/ui/README.md) | Design system |
| [CONTRIBUTING](CONTRIBUTING.md) | Commity, PR-y, gałęzie |

## Licencja

StageSync jest **source-available** na [Business Source License 1.1](LICENSE) (SPDX: `BUSL-1.1`).
Produkcyjne użycie jako własny host sceniczny jest dozwolone; Competing Offering wymaga osobnej licencji komercyjnej — szczegóły w `LICENSE`.
