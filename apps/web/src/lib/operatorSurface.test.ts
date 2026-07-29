/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isConsoleShell,
  isOperatorSurfaceRoute,
  isOsMenuDesktopShell,
  isPerformerShell,
  isWebBrowserSurface,
  shouldShowFullscreenControl,
  shouldShowOperatorNav,
  shouldUseMobileCompactChrome,
} from "./operatorSurface.js";
import { markOperatorSession, clearOperatorSession } from "./operatorSession.js";

vi.mock("./desktopBridge.js", () => ({
  isDesktopShell: vi.fn(() => false),
  tauriInvokeAvailable: vi.fn(() => false),
  hasExplicitTauriShellMarker: vi.fn(() => false),
}));

vi.mock("./nativeShell.js", () => ({
  getStageSyncNative: vi.fn(() => null),
}));

import {
  hasExplicitTauriShellMarker,
  isDesktopShell,
  tauriInvokeAvailable,
} from "./desktopBridge.js";
import { getStageSyncNative } from "./nativeShell.js";

afterEach(() => {
  clearOperatorSession();
  vi.mocked(isDesktopShell).mockReturnValue(false);
  vi.mocked(tauriInvokeAvailable).mockReturnValue(false);
  vi.mocked(hasExplicitTauriShellMarker).mockReturnValue(false);
  vi.mocked(getStageSyncNative).mockReturnValue(null);
  delete (globalThis as { __STAGESYNC_UI_TARGET__?: string }).__STAGESYNC_UI_TARGET__;
});

describe("isOperatorSurfaceRoute", () => {
  it("matches admin and timeline paths", () => {
    expect(isOperatorSurfaceRoute("/admin")).toBe(true);
    expect(isOperatorSurfaceRoute("/admin?section=host")).toBe(true);
    expect(isOperatorSurfaceRoute("/timeline/abc")).toBe(true);
    expect(isOperatorSurfaceRoute("/client")).toBe(false);
  });
});

describe("shouldShowFullscreenControl", () => {
  it("shows on web browser surface", () => {
    expect(isWebBrowserSurface()).toBe(true);
    expect(shouldShowFullscreenControl()).toBe(true);
  });

  it("hides on Tauri desktop", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.mocked(tauriInvokeAvailable).mockReturnValue(true);
    expect(shouldShowFullscreenControl()).toBe(false);
  });

  it("hides on console shell", () => {
    (globalThis as { __STAGESYNC_UI_TARGET__?: string }).__STAGESYNC_UI_TARGET__ =
      "console";
    expect(shouldShowFullscreenControl()).toBe(false);
  });

  it("hides on performer shell", () => {
    (globalThis as { __STAGESYNC_UI_TARGET__?: string }).__STAGESYNC_UI_TARGET__ =
      "performer";
    expect(shouldShowFullscreenControl()).toBe(false);
  });
});

describe("shouldShowOperatorNav", () => {
  it("shows on web admin and timeline", () => {
    expect(shouldShowOperatorNav("/admin")).toBe(true);
    expect(shouldShowOperatorNav("/timeline/p1")).toBe(true);
  });

  it("hides on performer shell", () => {
    (globalThis as { __STAGESYNC_UI_TARGET__?: string }).__STAGESYNC_UI_TARGET__ =
      "performer";
    expect(shouldShowOperatorNav("/admin")).toBe(false);
  });

  it("hides on Tauri desktop with invoke", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.mocked(tauriInvokeAvailable).mockReturnValue(true);
    expect(shouldShowOperatorNav("/admin")).toBe(false);
    expect(isOsMenuDesktopShell()).toBe(true);
    expect(shouldUseMobileCompactChrome()).toBe(false);
  });

  it("hides on Tauri desktop with explicit shell marker", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.mocked(hasExplicitTauriShellMarker).mockReturnValue(true);
    expect(shouldShowOperatorNav("/timeline/p1")).toBe(false);
    expect(shouldUseMobileCompactChrome()).toBe(false);
  });

  it("keeps phone compact chrome on web even when desktop hostname heuristic matches", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    expect(isOsMenuDesktopShell()).toBe(false);
    expect(shouldUseMobileCompactChrome()).toBe(true);
  });

  it("shows operator nav on console /client without web session", () => {
    (globalThis as { __STAGESYNC_UI_TARGET__?: string }).__STAGESYNC_UI_TARGET__ =
      "console";
    expect(isConsoleShell()).toBe(true);
    markOperatorSession();
    expect(shouldShowOperatorNav("/client")).toBe(true);
  });

  it("shows on web /client only with operator session", () => {
    expect(shouldShowOperatorNav("/client")).toBe(false);
    markOperatorSession();
    expect(isWebBrowserSurface()).toBe(true);
    expect(shouldShowOperatorNav("/client")).toBe(true);
  });

  it("shows on web admin and timeline without session", () => {
    expect(shouldShowOperatorNav("/admin")).toBe(true);
    expect(shouldShowOperatorNav("/timeline/p1")).toBe(true);
  });

  it("detects performer via native bridge", () => {
    vi.mocked(getStageSyncNative).mockReturnValue({
      shellKind: () => "performer",
    });
    expect(isPerformerShell()).toBe(true);
    expect(shouldShowOperatorNav("/admin")).toBe(false);
  });
});
