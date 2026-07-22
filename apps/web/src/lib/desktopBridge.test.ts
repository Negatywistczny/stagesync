import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatUnknownError,
  isDesktopShell,
  toggleAppFullscreen,
} from "./desktopBridge.js";

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

describe("toggleAppFullscreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses HTML Fullscreen API in a plain browser", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      querySelector: () => null,
      fullscreenElement: null,
      documentElement: { requestFullscreen },
      exitFullscreen,
    });

    await toggleAppFullscreen();

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it("uses HTML Fullscreen when :4000 looks like desktop but Tauri invoke is missing", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    // Same false-positive as browser → http://127.0.0.1:4000 (server without shell inject).
    vi.stubGlobal("window", {
      location: { hostname: "127.0.0.1", port: "4000" },
    });
    vi.stubGlobal("document", {
      querySelector: () => null,
      fullscreenElement: null,
      documentElement: { requestFullscreen },
      exitFullscreen,
    });

    expect(isDesktopShell()).toBe(true);
    await toggleAppFullscreen();

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(exitFullscreen).not.toHaveBeenCalled();
  });

  it("exits HTML fullscreen when already active", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      querySelector: () => null,
      fullscreenElement: {},
      documentElement: { requestFullscreen },
      exitFullscreen,
    });

    await toggleAppFullscreen();

    expect(exitFullscreen).toHaveBeenCalledOnce();
    expect(requestFullscreen).not.toHaveBeenCalled();
  });
});

describe("formatUnknownError", () => {
  it("reads Error.message", () => {
    expect(formatUnknownError(new Error("boom"))).toBe("boom");
  });

  it("reads bare string rejections (Tauri Result Err)", () => {
    expect(formatUnknownError("updater endpoint failed")).toBe(
      "updater endpoint failed",
    );
  });

  it("reads { message } objects without casting to Error", () => {
    expect(formatUnknownError({ message: "no update url" })).toBe("no update url");
  });

  it("does not render literal undefined", () => {
    expect(formatUnknownError(undefined)).toBe("Unknown error");
  });
});
