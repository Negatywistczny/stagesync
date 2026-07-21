import { afterEach, describe, expect, it, vi } from "vitest";
import { isDesktopShell } from "./desktopBridge.js";

describe("isDesktopShell", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when sidecar injects __STAGESYNC_SHELL__", () => {
    vi.stubGlobal("window", { __STAGESYNC_SHELL__: "desktop" });
    expect(isDesktopShell()).toBe(true);
  });

  it("returns true on localhost sidecar port without inject script", () => {
    vi.stubGlobal("window", {
      location: { hostname: "127.0.0.1", port: "4000" },
    });
    expect(isDesktopShell()).toBe(true);
  });

  it("returns true when window.isTauri is set", () => {
    vi.stubGlobal("window", { isTauri: true });
    expect(isDesktopShell()).toBe(true);
  });

  it("returns false in a plain browser context", () => {
    vi.stubGlobal("window", {});
    expect(isDesktopShell()).toBe(false);
  });
});
