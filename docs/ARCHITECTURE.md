# StageSync v5 — Architecture

## Overview

pnpm + Turborepo monorepo:

| Package / app | Stack | Responsibility |
|---------------|-------|----------------|
| `apps/server` | Express (Node 20+) | API, persistence, **transport SSOT** |
| `apps/web` | Vite + React | Client UI; playhead smooth between ticks only |
| `packages/shared` | TypeScript + Zod | Pure schemas & time |
| `packages/ui` | React | Design-system (`Button`, `--ss-*` tokens) |
| `data/` | JSON / dirs | Library, `projects/<id>/`, logs |

**SSOT:** server owns authoritative time and project state; client may only smooth the playhead between server ticks.

## ADRs

- [0001 — Storage layout](./adr/0001-storage-layout.md)
- [0002 — Timebase SSOT](./adr/0002-timebase-ssot.md)

## Agent / product rules

- [`.cursor/rules/constitution.mdc`](../.cursor/rules/constitution.mdc)
- [`.cursor/rules/versioning.mdc`](../.cursor/rules/versioning.mdc)

## Legacy

StageSync **4.x** lives in a separate archive repo: **STAGESYNC-APP-LEGACY**. Do not mix 4.x hotfix work into this v5 tree. A future migrator will import legacy projects into `data/projects/<id>/`.
