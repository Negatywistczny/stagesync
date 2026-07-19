# Changelog

Wszystkie istotne zmiany w StageSync **5.x** są dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/),
projekt stosuje [Semantic Versioning](https://semver.org/lang/pl/).

## [Unreleased]

### Dodano

- Shelle UI (Admin / Client / Timeline): `react-router` (`/`, `/admin`,
  `/timeline`), CSS Modules + tokeny Booth (`--ss-*`), wspólny
  `TransportProvider` nad routerem (WS + soft-clock rAF bez reconnect przy
  nawigacji); IA = parity funkcji v4 (placeholdery) + Audio 0…N w Timeline;
  Admin — `GET /api/library` + pulpit; Client — welcome / 4 role; aktualizacje
  bez git-apply ([ADR 0004](docs/adr/0004-updates-docker.md)).
- Klient web: panel transportu (Play / Pause / Seek), WebSocket + soft playhead
  (`getDisplayTicks` w shared, rAF z `frameTime`), Vite proxy `/api` i `/ws`,
  `Button loading` na czas komend REST.
- Transport SSOT na serwerze: `GET|POST /api/transport` (play / pause / seek),
  WebSocket `/ws/transport` (~25 Hz); pozycja z anchor + elapsed (bez driftu
  `+=` na timerze); schematy Zod w shared.
- Kanon timebase w `@stagesync/shared`: integer ticks + `DEFAULT_PPQ` (960),
  helpery `ticksToBbt` / `bbtToTicks`, `toDisplayBar` / `fromDisplayBar`
  (oraz `quartersToTicks` / `ticksToQuarters` pod migrator); usunięty
  przejściowy float `absBeat`.
- CRUD API projektów / biblioteki z persystencją w `data/` (`GET /api/library`,
  `POST|GET|PUT|DELETE /api/projects`) — Zod na krawędziach, seed z
  `library.template.json`, override `STAGESYNC_DATA_DIR` pod testy.
- Dokumentacja produktowa i reguły agenta po polsku (commity i kod pozostają EN).
- [docs/STANDARDS.md](docs/STANDARDS.md) — linki do zewnętrznych standardów (bez vendoringu).
- [`.editorconfig`](.editorconfig) — spójny styl edytora (jak legacy).
- Workflow gałęzi (trunk-based): docs/chore na `main`; feature z TODO → `feat/*` + PR
  ([CONTRIBUTING.md](CONTRIBUTING.md)).
- [ADR 0003](docs/adr/0003-ui-direction-booth.md) — Booth = skin/tokeny; IA = v4.
- [ADR 0004](docs/adr/0004-updates-docker.md) — aktualizacje przez Docker (bez git-apply).

### Zmieniono

- [ADR 0002](docs/adr/0002-timebase-ssot.md) — kanon timebase: integer ticks + PPQ;
  BBT tylko jako widok (float `absBeat` usunięty w shared).
- [ADR 0003](docs/adr/0003-ui-direction-booth.md) — Booth nie dyktuje layoutu labu;
  IA shelli = parity v4 + Audio 0…N.
- Podział dokumentacji bez dublowania (README = start, TODO = tylko przyszłość,
  ARCHITECTURE = mapa + monorepo, historia = CHANGELOG); usunięte odhaczone day-0 z TODO.

### Naprawiono

### Usunięto

## [5.0.0-alpha.1] - 2026-07-19

### Dodano

- Bootstrap monorepo: Turborepo + pnpm workspaces
- `apps/web` — klient Vite + React (port 3000)
- `apps/server` — szkielet API Express (port 4000)
- `packages/shared` — schematy Zod i czyste helpery czasu
- `packages/ui` — kanoniczny `Button` (7 stanów) i tokeny `--ss-*`
- Układ `data/`: `library/`, `projects/`, `logs/` + szablon biblioteki
- Konstytucja, ADR (storage, timebase SSOT), architektura i TODO
- Conventional Commits przez commitlint + husky

[Unreleased]: https://github.com/Negatywistczny/stagesync/compare/v5.0.0-alpha.1...HEAD
[5.0.0-alpha.1]: https://github.com/Negatywistczny/stagesync/releases/tag/v5.0.0-alpha.1
