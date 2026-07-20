# StageSync

[![CI](https://github.com/Negatywistyczny/stagesync/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/Negatywistyczny/stagesync/actions/workflows/continuous-integration.yml)

StageSync **v5** — synchronizacja sceniczna / timeline (monorepo).

> Legacy **4.x:** [STAGESYNC-APP-LEGACY](https://github.com/Negatywistczny/STAGESYNC-APP-LEGACY). Rozwój v5: [stagesync](https://github.com/Negatywistczny/stagesync).

## Wymagania

- Node.js 20 (`nvm use` / [`.nvmrc`](.nvmrc); `engines`: `>=20 <21`)
- [pnpm](https://pnpm.io/) 9

## Szybki start

```sh
git clone https://github.com/Negatywistczny/stagesync.git
cd stagesync
pnpm install
# opcjonalnie: cp .env.example .env  (PORT, STAGESYNC_DATA_DIR)
pnpm dev
```

| Aplikacja | URL (dev) |
|-----------|-----------|
| Web | http://localhost:3000 |
| Server | http://localhost:4000 |

Ścieżki web: `/` Client · `/admin` · `/timeline` (nowy layout + inventarz v4; black/amber).

W dev Vite proxy’uje `/api` i `/ws` na serwer `:4000` (soft playhead między tickami WS; `TransportProvider` żyje ponad routerem).

Produkcja: aktualizacja przez **Docker** (bump tagu obrazu, `data/` na volume) — bez git-apply z Admina ([ADR 0004](docs/adr/0004-updates-docker.md)).

```sh
pnpm dev      # web + server
pnpm test
pnpm build
pnpm lint
```

Wersja: `"version"` w root `package.json`.

## Dokumentacja

| Plik | Zawartość |
|------|-----------|
| [ARCHITECTURE](docs/ARCHITECTURE.md) | Mapa monorepo, SSOT, legacy |
| [ROADMAP](ROADMAP.md) | Kierunek długoterminowy |
| [TODO](docs/TODO.md) | Tylko przyszłe zadania |
| [CHANGELOG](CHANGELOG.md) | Historia zmian |
| [docs/ui/](docs/ui/README.md) | Design system (kolory, Button) |
| [STANDARDS](docs/STANDARDS.md) | Linki do standardów zewnętrznych |
| [CONTRIBUTING](CONTRIBUTING.md) | Język docs + Conventional Commits |
