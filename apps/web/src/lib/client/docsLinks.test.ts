import { describe, expect, it } from "vitest";
import {
  DOCS_INSTALL_URL,
  DOCS_ISSUES_URL,
  DOCS_RELEASES_URL,
} from "./docsLinks.js";

describe("docsLinks", () => {
  it("points at canonical GitHub docs surfaces", () => {
    expect(DOCS_INSTALL_URL).toBe(
      "https://github.com/kacperczeczot/stagesync/blob/main/docs/guides/INSTALL.md",
    );
    expect(DOCS_RELEASES_URL).toBe(
      "https://github.com/kacperczeczot/stagesync/releases",
    );
    expect(DOCS_ISSUES_URL).toBe(
      "https://github.com/kacperczeczot/stagesync/issues",
    );
  });
});
