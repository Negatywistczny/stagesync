import { describe, expect, it } from "vitest";
import { buildDevRoutes, isDevOnlyPath, isDevPreviewPath } from "./devRoutes.js";

describe("buildDevRoutes", () => {
  it("returns no routes when disabled", () => {
    expect(buildDevRoutes(false)).toEqual([]);
  });

  it("returns layouts route when enabled (preview bypasses main router)", () => {
    const routes = buildDevRoutes(true);
    expect(routes).toHaveLength(1);
    expect(routes[0]?.path).toBe("/_dev/layouts");
  });
});

describe("isDevPreviewPath", () => {
  it("matches preview iframe entry only", () => {
    expect(isDevPreviewPath("/_dev/preview")).toBe(true);
    expect(isDevPreviewPath("/_dev/layouts")).toBe(false);
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
