# StageSync

StageSync **v5** — synchronizacja sceniczna / timeline (przepisanie na monorepo).

> Legacy **4.x** jest zarchiwizowane jako **[STAGESYNC-APP-LEGACY](https://github.com/Negatywistczny/STAGESYNC-APP-LEGACY)**. Nowy rozwój odbywa się tutaj: **[stagesync](https://github.com/Negatywistczny/stagesync)**.

## Język dokumentacji

- **Polski:** docs produktowe, ADR, README, CHANGELOG, reguły agenta (`.cursor/rules`)
- **Angielski:** Conventional Commits, identyfikatory w kodzie, nazwy paczek/API

## Wymagania

- Node.js ≥ 20
- [pnpm](https://pnpm.io/) 9

## Szybki start

```sh
git clone https://github.com/Negatywistczny/stagesync.git
cd stagesync
pnpm install
pnpm dev
```

| Aplikacja | URL (dev) | Rola |
|-----------|-----------|------|
| Web | http://localhost:3000 | Klient Vite + React |
| Server | http://localhost:4000 | API Express / transport SSOT |

## SSOT

**Serwer jest źródłem prawdy** dla transportu i stanu projektu. Klient może jedynie wygładzać playhead **między tickami serwera**.

## Workspace

- `apps/web` — klient Vite
- `apps/server` — serwer Express
- `packages/shared` — schematy Zod i czysty czas
- `packages/ui` — `Button` + tokeny `--ss-*`
- `data/` — układ library / projects / logs

Zobacz [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/TODO.md](docs/TODO.md) i [CONTRIBUTING.md](CONTRIBUTING.md).

## Skrypty

```sh
pnpm dev      # turbo dev (web + server)
pnpm test     # turbo test
pnpm build    # turbo build
pnpm lint     # turbo lint
```

Wersja: pole `"version"` w root `package.json` (bootstrap: `5.0.0-alpha.1`).
