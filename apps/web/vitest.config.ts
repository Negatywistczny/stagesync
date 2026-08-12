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
    reporters: process.env.CI
      ? [
          "default",
          "github-actions",
          ["junit", { outputFile: "test-results/junit.xml" }],
        ]
      : ["default"],
    coverage: {
      provider: "v8",
      // Repo-root SF paths so Codecov can map monorepo files.
      reporter: ["text", ["lcov", { projectRoot: repoRoot }]],
      reportsDirectory: "./coverage",
      // Local + Codecov flags: web-core (lib + transport) and web-ui (shells).
      // Shells (`src/shells/**`) → complemented by Playwright smoke in e2e/.
      // Targets: web-core ≥85%, web-ui ≥50% (see codecov.yml + docs/standards/TESTING.md).
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.ts",
        "**/*.test.tsx",
        "**/*.module.css",
        "**/node_modules/**",
      ],
    },
  },
});
