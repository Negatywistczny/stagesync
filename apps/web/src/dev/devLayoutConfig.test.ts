import { describe, expect, it } from "vitest";
import {
  buildDevPreviewSearch,
  buildDevPreviewUrl,
  devRoutePath,
  parseDevPreviewConfig,
} from "./devLayoutConfig.js";

describe("parseDevPreviewConfig", () => {
  it("parses valid params", () => {
    expect(parseDevPreviewConfig("?surface=console&route=client&session=1")).toEqual({
      surface: "console",
      route: "client",
      session: true,
    });
  });

  it("falls back to defaults for unknown values", () => {
    expect(parseDevPreviewConfig("?surface=nope&route=invalid")).toEqual({
      surface: "web",
      route: "admin",
      session: false,
    });
  });
});

describe("dev preview URL helpers", () => {
  it("builds stable search params", () => {
    expect(
      buildDevPreviewSearch({
        surface: "tauri",
        route: "timeline",
        session: true,
      }),
    ).toBe("?surface=tauri&route=timeline&session=1");
  });

  it("builds preview URL path", () => {
    expect(
      buildDevPreviewUrl({
        surface: "performer",
        route: "admin",
        session: false,
      }),
    ).toBe("/_dev/preview?surface=performer&route=admin");
  });
});

describe("devRoutePath", () => {
  it("maps route key to shell path", () => {
    expect(devRoutePath("admin")).toBe("/admin");
    expect(devRoutePath("timeline")).toBe("/timeline/dev-preview");
    expect(devRoutePath("client")).toBe("/client");
  });
});
