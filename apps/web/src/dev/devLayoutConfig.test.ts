import { describe, expect, it } from "vitest";
import {
  buildDevPreviewSearch,
  buildDevPreviewUrl,
  devPreviewShowsOperatorSession,
  devRoutePath,
  normalizeDevPreviewConfig,
  parseDevPreviewConfig,
} from "./devLayoutConfig.js";

describe("parseDevPreviewConfig", () => {
  it("parses valid params", () => {
    expect(parseDevPreviewConfig("?surface=console&route=client&session=1")).toEqual({
      surface: "console",
      route: "client",
      session: false,
    });
  });

  it("falls back to defaults for unknown values", () => {
    expect(parseDevPreviewConfig("?surface=nope&route=invalid")).toEqual({
      surface: "web",
      route: "admin",
      session: false,
    });
  });

  it("keeps session only for web surface", () => {
    expect(parseDevPreviewConfig("?surface=web&route=client&session=1")).toEqual({
      surface: "web",
      route: "client",
      session: true,
    });
  });
});

describe("normalizeDevPreviewConfig", () => {
  it("forces performer to client without session", () => {
    expect(
      normalizeDevPreviewConfig({
        surface: "performer",
        route: "admin",
        session: true,
      }),
    ).toEqual({
      surface: "performer",
      route: "client",
      session: false,
    });
  });

  it("drops session for non-web surfaces", () => {
    expect(
      normalizeDevPreviewConfig({
        surface: "tauri",
        route: "client",
        session: true,
      }),
    ).toEqual({
      surface: "tauri",
      route: "client",
      session: false,
    });
  });
});

describe("devPreviewShowsOperatorSession", () => {
  it("is web-only", () => {
    expect(devPreviewShowsOperatorSession("web")).toBe(true);
    expect(devPreviewShowsOperatorSession("tauri")).toBe(false);
    expect(devPreviewShowsOperatorSession("console")).toBe(false);
    expect(devPreviewShowsOperatorSession("performer")).toBe(false);
  });
});

describe("dev preview URL helpers", () => {
  it("builds stable search params without session on tauri", () => {
    expect(
      buildDevPreviewSearch({
        surface: "tauri",
        route: "timeline",
        session: true,
      }),
    ).toBe("?surface=tauri&route=timeline");
  });

  it("builds preview URL path for performer", () => {
    expect(
      buildDevPreviewUrl({
        surface: "performer",
        route: "admin",
        session: false,
      }),
    ).toBe("/_dev/preview?surface=performer&route=client");
  });
});

describe("devRoutePath", () => {
  it("maps route key to shell path", () => {
    expect(devRoutePath("admin")).toBe("/admin");
    expect(devRoutePath("timeline")).toBe("/timeline/dev-preview");
    expect(devRoutePath("client")).toBe("/client");
  });
});
