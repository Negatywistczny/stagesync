# StageSync v5 — Architektura

## Przegląd

Monorepo pnpm + Turborepo:

| Paczka / app | Stack | Odpowiedzialność |
|--------------|-------|------------------|
| `apps/server` | Express (Node 20+) | API, persystencja, **transport SSOT** |
| `apps/web` | Vite + React | UI klienta; wygładzanie playhead tylko między tickami |
| `packages/shared` | TypeScript + Zod | Czyste schematy i czas |
| `packages/ui` | React | Design system (`Button`, tokeny `--ss-*`) |
| `data/` | JSON / katalogi | Biblioteka, `projects/<id>/`, logi |

**SSOT:** serwer jest właścicielem autorytatywnego czasu i stanu projektu; klient może jedynie wygładzać playhead między tickami serwera.

## ADR

- [0001 — Układ storage](./adr/0001-storage-layout.md)
- [0002 — Timebase SSOT](./adr/0002-timebase-ssot.md)

## Reguły agenta / produktu

- [`.cursor/rules/constitution.mdc`](../.cursor/rules/constitution.mdc)
- [`.cursor/rules/versioning.mdc`](../.cursor/rules/versioning.mdc)

## Legacy

StageSync **4.x** żyje w osobnym, zarchiwizowanym repo: **STAGESYNC-APP-LEGACY**. Nie mieszaj hotfixów 4.x w tym drzewie v5. Przyszły migrator zaimportuje projekty legacy do `data/projects/<id>/`.
