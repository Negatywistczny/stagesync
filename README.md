# StageSync

StageSync **v5** — live performance timeline & sync (monorepo rewrite).

> Legacy **4.x** is archived as **[STAGESYNC-APP-LEGACY](https://github.com/kacper/STAGESYNC-APP-LEGACY)** (adjust org/URL if your fork differs). New work happens here.

## Requirements

- Node.js ≥ 20
- [pnpm](https://pnpm.io/) 9

## Quick start

```sh
git clone <this-repo-url> stagesync
cd stagesync
pnpm install
pnpm dev
```

| App | Dev URL | Role |
|-----|---------|------|
| Web | http://localhost:3000 | Vite + React client |
| Server | http://localhost:4000 | Express API / transport SSOT |

## SSOT

**Server is the source of truth** for transport and project state. The client may only smooth the playhead between server ticks.

## Workspace

- `apps/web` — Vite client  
- `apps/server` — Express server  
- `packages/shared` — Zod schemas & pure time  
- `packages/ui` — Button + `--ss-*` tokens  
- `data/` — library / projects / logs layout  

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/TODO.md](docs/TODO.md), and [CONTRIBUTING.md](CONTRIBUTING.md).

## Scripts

```sh
pnpm dev      # turbo dev (web + server)
pnpm test     # turbo test
pnpm build    # turbo build
pnpm lint     # turbo lint
```

Version: see `"version"` in root `package.json` (`5.0.0-alpha.1` at bootstrap).
