import { describe, expect, it } from "vitest";
import { buildDevRoutes, isDevOnlyPath } from "./devRoutes.js";

describe("buildDevRoutes", () => {
  it("returns no routes when disabled", () => {
    expect(buildDevRoutes(false)).toEqual([]);
  });

  it("returns layouts and preview routes when enabled", () => {
    const routes = buildDevRoutes(true);
    expect(routes).toHaveLength(2);
    expect(routes[0]?.path).toBe("/_dev/layouts");
    expect(routes[1]?.path).toBe("/_dev/preview");
  });
});

describe("isDevOnlyPath", () => {
  it("matches dev-only pages", () => {
    expect(isDevOnlyPath("/_dev/layouts")).toBe(true);
    expect(isDevOnlyPath("/_dev/preview")).toBe(true);
  });

  it("rejects non-dev pages", () => {
    expect(isDevOnlyPath("/admin")).toBe(false);
    expect(isDevOnlyPath("/timeline/demo")).toBe(false);
  });
});
