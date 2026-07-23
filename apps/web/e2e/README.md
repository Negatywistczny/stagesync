# Web E2E (Playwright)

Minimal browser smoke for Timeline shells (not Vitest mounts of `TimelineShell`).

## Forma drag / resize (P0)

- Spec: [`forma-drag.spec.ts`](./forma-drag.spec.ts)
- Flow: create seeded project via `/api/projects` → open `/timeline/:id` → assert Forma lane + Intro/Countdown clips → pointer drag move + right-edge resize → assert inspector tick readout.

## Run locally

From repo root (shared must be built for the server):

```bash
pnpm --filter @stagesync/shared build
pnpm --filter @stagesync/web test:e2e
```

First time (or after Playwright upgrade):

```bash
pnpm --filter @stagesync/web exec playwright install chromium
```

Uses an isolated `STAGESYNC_DATA_DIR` under the OS temp dir (override with env). Vite on `:3000` proxies `/api` to the server on `:4000`.

## CI

Job `playwright-smoke` in `.github/workflows/ci.yml`:

- Runs on push to `main`, `workflow_dispatch`, or PRs that touch `apps/web/src/**` / `apps/web/e2e/**` / Playwright config (docs-only PRs skip)
- Caches Playwright Chromium under `~/.cache/ms-playwright`
- Command: `pnpm --filter @stagesync/web test:e2e`
