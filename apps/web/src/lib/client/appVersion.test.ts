import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { APP_VERSION } from "./appVersion.js";
import {
  DOCS_INSTALL_URL,
  DOCS_ISSUES_URL,
  DOCS_RELEASES_URL,
} from "./docsLinks.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

describe("appVersion + docsLinks", () => {
  it("exposes SemVer app version string", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("matches root package.json version", () => {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as { version: string };
    expect(APP_VERSION).toBe(pkg.version);
  });

  it("docs links use https GitHub hosts", () => {
    expect(DOCS_INSTALL_URL.startsWith("https://github.com/")).toBe(true);
    expect(DOCS_RELEASES_URL.startsWith("https://github.com/")).toBe(true);
    expect(DOCS_ISSUES_URL.startsWith("https://github.com/")).toBe(true);
  });

  it("points docs links at the GitHub stagesync repo", () => {
    expect(DOCS_INSTALL_URL).toContain("docs/INSTALL.md");
    expect(DOCS_RELEASES_URL).toContain("/releases");
    expect(DOCS_ISSUES_URL).toContain("/issues");
  });
});
