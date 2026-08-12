import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const pkgDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(pkgDir, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@lib/audio": path.resolve(pkgDir, "src/lib/audio"),
      "@lib/timeline": path.resolve(pkgDir, "src/lib/timeline"),
      "@lib/timeline-edit": path.resolve(pkgDir, "src/lib/timeline-edit"),
      "@lib/client": path.resolve(pkgDir, "src/lib/client"),
      "@lib/shell-operator": path.resolve(pkgDir, "src/lib/shell-operator"),
      "@lib": path.resolve(pkgDir, "src/lib"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    // Playwright lives under e2e/ (*.spec.ts) — do not run under Vitest.
    exclude: ["**/node_modules/**", "**/dist/**", "e2e/**"],
    // GitHub Actions annotations for failed assertions (CI only).
    reporters: process.env.CI ? ["default", "github-actions"] : ["default"],
    coverage: {
      provider: "v8",
      // Repo-root SF paths so Codecov can map monorepo files.
      reporter: ["text", ["lcov", { projectRoot: repoRoot }]],
      reportsDirectory: "./coverage",
      // Local + Codecov `web` flag gate: lib + transport only.
      // Shells (`src/shells/**`) → Playwright smoke, not Vitest line %.
      // Target ≥65% lines (see codecov.yml + docs/STANDARDS.md). Thresholds
      // stay soft here until Phase 1 fills P0 lib gaps (~62% today).
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.module.css",
        "**/node_modules/**",
      ],
      // Uncomment when lib+transport ≥65% on main (Phase 1):
      // thresholds: { lines: 65, statements: 65, functions: 60, branches: 55 },
    },
  },
});
