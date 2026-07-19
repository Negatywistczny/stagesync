# StageSync v5 — TODO

## Day-0 (zrobione)

- [x] Reshape monorepo: Vite `apps/web`, Express `apps/server`, `packages/shared`, `packages/ui`
- [x] Układ danych: `data/library`, `data/projects`, `data/logs` + szablon
- [x] Konstytucja + ADR + README / CHANGELOG
- [x] Conventional Commits (commitlint + husky)
- [x] Vitest dla shared time + UI Button
- [x] Dokumentacja produktowa po polsku

## Następne

- [ ] CRUD API projektów / biblioteki + persystencja w `data/`
- [ ] Protokół transportu (play / pause / seek) z tickami SSOT na serwerze
- [ ] Klient web podłączony do transportu + wygładzanie playhead
- [ ] Warstwa MIDI I/O (clock / urządzenia po stronie serwera)
- [ ] Migrator legacy 4.x → v5
- [ ] Docker Compose pod lokalny stack
- [ ] CI (lint, test, build) w GitHub Actions
- [ ] Auth / multi-user (jeśli produkt tego wymaga)
- [ ] Stabilne wydanie `5.0.0` + nazwa hero (zob. reguła versioning)
