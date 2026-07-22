# StageSync

[![CI](https://img.shields.io/github/actions/workflow/status/Negatywistczny/stagesync/ci.yml?branch=main&label=CI)](https://github.com/Negatywistczny/stagesync/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/Negatywistczny/stagesync?include_prereleases&label=release)](https://github.com/Negatywistczny/stagesync/releases)
[![License](https://img.shields.io/github/license/Negatywistczny/stagesync)](LICENSE)
[![Version](https://img.shields.io/github/package-json/v/Negatywistczny/stagesync)](package.json)

**StageSync** — centralized stage transport, Timeline, and musician Client sync for live shows.

> Legacy 4.x: [STAGESYNC-APP-LEGACY](https://github.com/Negatywistyczny/STAGESYNC-APP-LEGACY). This repo is **v5**.

## Quick start

**Desktop (recommended):** download `.dmg` / `.msi` from [Releases](https://github.com/Negatywistczny/stagesync/releases), install, and run — the host sidecar starts locally. Details: [docs/DESKTOP.md](docs/DESKTOP.md).

**Docker / rack host:** see [docs/INSTALL.md](docs/INSTALL.md) (Compose, GHCR, ports, updates).

**From source (dev):** Node.js **20** + [pnpm](https://pnpm.io/) 9. Desktop builds from source also need **Rust** (Tauri).

```sh
git clone https://github.com/Negatywistczny/stagesync.git
cd stagesync && pnpm install && pnpm dev
```

`test` / `build` / `lint` and contribution rules → [CONTRIBUTING.md](CONTRIBUTING.md).

## Monorepo

| Path | Role |
| :--- | :--- |
| `apps/server` | API, persistence, transport SSOT |
| `apps/web` | Admin / Timeline / Client UI |
| `apps/desktop` | Tauri shell + Node sidecar |
| `packages/shared` | Zod schemas + pure time helpers |
| `packages/ui` | Design system (`--ss-*` tokens) |
| `data/` | Runtime templates (user projects gitignored) |

## Documentation

| Doc | |
| :--- | :--- |
| [INSTALL](docs/INSTALL.md) | Production Docker / GHCR |
| [DESKTOP](docs/DESKTOP.md) | Tauri installers & updater |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Monorepo map & SSOT |
| [docs/api](docs/api/) | REST surface |
| [ADR](docs/adr/) | Architecture decisions |
| [SECURITY](SECURITY.md) | Vulnerability reporting |
| [ROADMAP](docs/ROADMAP.md) / [TODO](docs/TODO.md) | Milestones & checklist |
| [CHANGELOG](CHANGELOG.md) | Release history |
| [UI](docs/ui/README.md) | Design system |
| [CONTRIBUTING](CONTRIBUTING.md) | Commits, PRs, branches |
