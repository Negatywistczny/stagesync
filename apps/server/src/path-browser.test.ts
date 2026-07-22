import { describe, expect, it } from "vitest";
import { isUnderAllowedRoot, listBrowseDirectory, toEnvPath } from "./path-browser.js";
import { REPO_ROOT } from "./storage/paths.js";
import { join } from "node:path";

describe("path-browser", () => {
  it("rejects paths outside allowed roots", () => {
    expect(isUnderAllowedRoot("/etc")).toBe(false);
    expect(() => listBrowseDirectory("/etc", { mode: "dir" })).toThrow(/dozwolonym/);
  });

  it("toEnvPath uses relative ./ for repo paths", () => {
    expect(toEnvPath(join(REPO_ROOT, "data"))).toMatch(/^\.\//);
  });
});
