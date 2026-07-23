import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const pkgDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(pkgDir, "../..");

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      // Repo-root SF paths so Codecov can map monorepo files.
      reporter: ["text", ["lcov", { projectRoot: repoRoot }]],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      // Bootstrap / CLI are P2 for unit coverage (smoke + migrate dry-run in CI).
      exclude: [
        "**/*.test.ts",
        "src/index.ts",
        "src/cli/**",
        "src/midi/backend.ts", // types-only — no executable surface
      ],
    },
  },
});
