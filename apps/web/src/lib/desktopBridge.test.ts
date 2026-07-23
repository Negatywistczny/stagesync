import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canReturnToLauncher,
  checkDesktopUpdate,
  formatUnknownError,
  installDesktopUpdate,
  isDesktopShell,
  openExternalUrl,
  returnToLauncher,
  syncEditHistoryState,
  syncNavRecentProjects,
  syncNavTimelineProjectId,
  tauriInvokeAvailable,
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

describe("openExternalUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens a new tab in a plain browser", async () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    vi.stubGlobal("document", { querySelector: () => null });

    await openExternalUrl("https://example.com/docs");

    expect(open).toHaveBeenCalledWith(
      "https://example.com/docs",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("falls back to window.open when :4000 looks like desktop but Tauri invoke is missing", async () => {
    const open = vi.fn();
    // Same false-positive as browser → http://127.0.0.1:4000 (server without shell inject).
    vi.stubGlobal("window", {
      location: { hostname: "127.0.0.1", port: "4000" },
      open,
    });
    vi.stubGlobal("document", { querySelector: () => null });

    expect(isDesktopShell()).toBe(true);
    await openExternalUrl("https://github.com/Negatywistczny/stagesync/issues");

    expect(open).toHaveBeenCalledWith(
      "https://github.com/Negatywistczny/stagesync/issues",
      "_blank",
      "noopener,noreferrer",
    );
  });

  it("invokes Tauri when desktop shell has invoke", async () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    const open = vi.fn();
    vi.stubGlobal("window", {
      __STAGESYNC_SHELL__: "desktop",
      __TAURI__: { core: { invoke } },
      open,
    });
    vi.stubGlobal("document", { querySelector: () => null });

    await openExternalUrl("https://github.com/Negatywistczny/stagesync/blob/main/docs/INSTALL.md");

    expect(invoke).toHaveBeenCalledWith("open_external_url", {
      url: "https://github.com/Negatywistczny/stagesync/blob/main/docs/INSTALL.md",
    });
    expect(open).not.toHaveBeenCalled();
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

describe("desktop update + nav sync + Tauri paths", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checkDesktopUpdate / installDesktopUpdate require shell", async () => {
    vi.stubGlobal("window", {});
    await expect(checkDesktopUpdate()).rejects.toThrow(/Tauri shell/i);
    await expect(installDesktopUpdate()).rejects.toThrow(/Tauri shell/i);
  });

  it("checkDesktopUpdate invokes IPC", async () => {
    const invoke = vi.fn().mockResolvedValue({
      available: true,
      version: "5.0.2",
      current: "5.0.1",
      notes: null,
    });
    vi.stubGlobal("window", {
      __STAGESYNC_SHELL__: "desktop",
      __TAURI__: { core: { invoke } },
    });
    const info = await checkDesktopUpdate();
    expect(invoke).toHaveBeenCalledWith("check_desktop_update", undefined);
    expect(info.available).toBe(true);
  });

  it("sync nav / edit history no-op off desktop and invoke on desktop", async () => {
    vi.stubGlobal("window", {});
    await expect(syncNavTimelineProjectId("p1")).resolves.toBeUndefined();
    await expect(syncNavRecentProjects([])).resolves.toBeUndefined();
    await expect(syncEditHistoryState(true, false)).resolves.toBeUndefined();

    const invoke = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("window", {
      __STAGESYNC_SHELL__: "desktop",
      __TAURI__: { core: { invoke } },
    });
    await syncNavTimelineProjectId("p1");
    await syncNavRecentProjects([{ id: "p1", name: "A" }]);
    await syncEditHistoryState(true, true);
    expect(invoke).toHaveBeenCalledWith("set_nav_timeline_project_id", {
      projectId: "p1",
    });
    expect(invoke).toHaveBeenCalledWith("set_nav_recent_projects", {
      projects: [{ id: "p1", name: "A" }],
    });
    expect(invoke).toHaveBeenCalledWith("set_edit_history_state", {
      canUndo: true,
      canRedo: true,
    });
  });

  it("openExternalUrl validates URL", async () => {
    vi.stubGlobal("window", { open: vi.fn() });
    await expect(openExternalUrl("")).rejects.toThrow(/Invalid/);
    await expect(openExternalUrl("ftp://x")).rejects.toThrow(/http/);
    await expect(openExternalUrl("not a url")).rejects.toThrow(/Invalid/);
  });

  it("toggleAppFullscreen uses native plugin then falls back", async () => {
    const invoke = vi
      .fn()
      .mockRejectedValueOnce(new Error("plugin fail"))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal("window", {
      __STAGESYNC_SHELL__: "desktop",
      __TAURI__: { core: { invoke } },
      navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0)" },
    });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0)" });
    await toggleAppFullscreen();
    expect(invoke).toHaveBeenCalledWith("plugin:window|is_fullscreen", {
      label: "main",
    });
  });

  it("toggleAppFullscreen uses mac maximize API when available", async () => {
    const toggleMaximize = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
    });
    vi.stubGlobal("window", {
      __STAGESYNC_SHELL__: "desktop",
      __TAURI__: {
        core: { invoke: vi.fn() },
        window: {
          getCurrentWindow: () => ({ toggleMaximize }),
        },
      },
    });
    await toggleAppFullscreen();
    expect(toggleMaximize).toHaveBeenCalledOnce();
  });

  it("toggleAppFullscreen throws when all native paths fail", async () => {
    const invoke = vi.fn().mockRejectedValue(new Error("nope"));
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0)" });
    vi.stubGlobal("window", {
      __STAGESYNC_SHELL__: "desktop",
      __TAURI__: { core: { invoke } },
    });
    await expect(toggleAppFullscreen()).rejects.toThrow(/Desktop fullscreen failed/);
  });

  it("detects desktop via meta tag and __TAURI_INTERNALS__", () => {
    vi.stubGlobal("document", {
      querySelector: () => ({ getAttribute: () => "desktop" }),
    });
    vi.stubGlobal("window", {});
    expect(isDesktopShell()).toBe(true);

    vi.stubGlobal("document", { querySelector: () => null });
    const invoke = vi.fn();
    vi.stubGlobal("window", {
      __TAURI_INTERNALS__: { invoke },
    });
    expect(isDesktopShell()).toBe(true);
    expect(tauriInvokeAvailable()).toBe(true);
  });

  it("formatUnknownError covers object / json / long message", () => {
    expect(formatUnknownError({ message: "  " })).toMatch(/\{|Unknown/);
    expect(formatUnknownError({ foo: 1 })).toContain("foo");
    expect(formatUnknownError("x".repeat(600)).length).toBe(500);
  });

  it("returnToLauncher rejects without IPC and invokes when present", async () => {
    vi.stubGlobal("window", {
      location: { hostname: "127.0.0.1", port: "4000" },
    });
    expect(canReturnToLauncher()).toBe(false);
    await expect(returnToLauncher()).rejects.toThrow(/Launchera/i);

    const invoke = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("window", {
      __STAGESYNC_SHELL__: "desktop",
      __TAURI__: { core: { invoke } },
    });
    expect(canReturnToLauncher()).toBe(true);
    await returnToLauncher();
    expect(invoke).toHaveBeenCalledWith("return_to_launcher", {});
  });
});
