import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * Isolated data dir so e2e never touches the developer's `data/` tree.
 * CI can override via STAGESYNC_DATA_DIR.
 */
const dataDir =
  process.env.STAGESYNC_DATA_DIR ??
  join(tmpdir(), `ss-e2e-${process.pid}`);

for (const sub of ["library", "projects", "logs"] as const) {
  mkdirSync(join(dataDir, sub), { recursive: true });
}

const webOrigin = "http://127.0.0.1:3000";
const apiOrigin = "http://127.0.0.1:4000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: webOrigin,
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
    locale: "pl-PL",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm exec tsx src/index.ts",
      cwd: "../server",
      url: `${apiOrigin}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: "4000",
        STAGESYNC_BIND_HOST: "127.0.0.1",
        STAGESYNC_DATA_DIR: dataDir,
      },
    },
    {
      command: "pnpm exec vite --host 127.0.0.1 --port 3000 --strictPort",
      cwd: ".",
      url: webOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
