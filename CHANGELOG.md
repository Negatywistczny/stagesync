# Changelog

All notable changes to StageSync **5.x** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- (none yet beyond alpha.1 bootstrap)

## [5.0.0-alpha.1] - 2026-07-19

### Added

- Monorepo bootstrap: Turborepo + pnpm workspaces
- `apps/web` — Vite + React client (port 3000)
- `apps/server` — Express API scaffold (port 4000)
- `packages/shared` — Zod schemas and pure time helpers
- `packages/ui` — canonical `Button` (7 states) and `--ss-*` design tokens
- `data/` layout: `library/`, `projects/`, `logs/` + library template
- Constitution, ADRs (storage layout, timebase SSOT), architecture & TODO docs
- Conventional Commits via commitlint + husky

[Unreleased]: https://github.com/kacper/stagesync/compare/v5.0.0-alpha.1...HEAD
[5.0.0-alpha.1]: https://github.com/kacper/stagesync/releases/tag/v5.0.0-alpha.1
