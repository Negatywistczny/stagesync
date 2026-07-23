# Web E2E (Playwright)

**Status:** CI job scaffolded (path-filter); Forma drag smoke not implemented yet.

- TODO: [docs/TODO.md](../../../docs/TODO.md) — Playwright Forma drag E2E
- CI: `.github/workflows/ci.yml` job `playwright-smoke` runs on push to `main`, or on PRs that touch `apps/web/src/**` (docs-only PRs skip)

When implementing: add `@playwright/test`, `playwright.config.ts`, and a real `forma-drag.spec.ts`; replace the CI stub step.
