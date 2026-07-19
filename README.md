# StageSync

StageSync **v5** — synchronizacja sceniczna / timeline (monorepo).

> Legacy **4.x:** [STAGESYNC-APP-LEGACY](https://github.com/Negatywistczny/STAGESYNC-APP-LEGACY). Rozwój v5: [stagesync](https://github.com/Negatywistczny/stagesync).

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

| Aplikacja | URL (dev) |
|-----------|-----------|
| Web | http://localhost:3000 |
| Server | http://localhost:4000 |

W dev Vite proxy’uje `/api` i `/ws` na serwer `:4000` (soft playhead między tickami WS).

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
| [TODO](docs/TODO.md) | Tylko przyszłe zadania |
| [CHANGELOG](CHANGELOG.md) | Historia zmian |
| [STANDARDS](docs/STANDARDS.md) | Linki do standardów zewnętrznych |
| [CONTRIBUTING](CONTRIBUTING.md) | Język docs + Conventional Commits |
