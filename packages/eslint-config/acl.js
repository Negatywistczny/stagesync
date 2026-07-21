/**
 * Monorepo ACL — import boundaries (constitution).
 * Apply from each package's eslint.config (cwd = package root).
 */

/** @type {import("eslint").Linter.Config[]} */
export const webAcl = [
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@stagesync/server",
              message:
                "UI must not import the server package (SSOT stays on apps/server).",
            },
          ],
          patterns: [
            {
              group: ["**/apps/server/**", "@stagesync/server/**"],
              message: "UI must not reach into apps/server.",
            },
          ],
        },
      ],
    },
  },
];

/** @type {import("eslint").Linter.Config[]} */
export const sharedAcl = [
  {
    files: ["src/**/*.{js,ts}"],
    ignores: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "fs",
              message: "shared must stay pure — no Node fs.",
            },
            {
              name: "node:fs",
              message: "shared must stay pure — no Node fs.",
            },
            {
              name: "node:fs/promises",
              message: "shared must stay pure — no Node fs.",
            },
            {
              name: "path",
              message: "shared must stay pure — no Node path.",
            },
            {
              name: "node:path",
              message: "shared must stay pure — no Node path.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "window",
          message: "shared must stay pure — no DOM globals.",
        },
        {
          name: "document",
          message: "shared must stay pure — no DOM globals.",
        },
        {
          name: "navigator",
          message: "shared must stay pure — no DOM globals.",
        },
      ],
    },
  },
];
