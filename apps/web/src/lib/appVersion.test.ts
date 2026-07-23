import { describe, expect, it } from "vitest";
import { APP_VERSION } from "./appVersion.js";
import {
  DOCS_INSTALL_URL,
  DOCS_ISSUES_URL,
  DOCS_RELEASES_URL,
} from "./docsLinks.js";

describe("appVersion + docsLinks", () => {
  it("exposes SemVer app version string", () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("points docs links at the GitHub stagesync repo", () => {
    expect(DOCS_INSTALL_URL).toContain("docs/INSTALL.md");
    expect(DOCS_RELEASES_URL).toContain("/releases");
    expect(DOCS_ISSUES_URL).toContain("/issues");
  });
});
