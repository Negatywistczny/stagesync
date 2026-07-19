# StageSync v5 — TODO

## Day-0 (done)

- [x] Monorepo reshape: Vite `apps/web`, Express `apps/server`, `packages/shared`, `packages/ui`
- [x] Data layout: `data/library`, `data/projects`, `data/logs` + template
- [x] Constitution + ADRs + README / CHANGELOG
- [x] Conventional Commits (commitlint + husky)
- [x] Vitest for shared time + UI Button

## Next

- [ ] Project / library CRUD API + persistence under `data/`
- [ ] Transport protocol (play / pause / seek) with server SSOT ticks
- [ ] Web client wired to transport + playhead smoothing
- [ ] MIDI I/O layer (server-side clock / devices)
- [ ] Legacy 4.x → v5 migrator
- [ ] Docker Compose for local stack
- [ ] CI (lint, test, build) on GitHub Actions
- [ ] Auth / multi-user (if product requires)
- [ ] Stable `5.0.0` release + hero name (see versioning rule)
