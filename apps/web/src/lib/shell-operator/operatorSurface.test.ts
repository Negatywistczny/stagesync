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

vi.mock("@lib/client/desktopBridge.js", () => ({
  isDesktopShell: vi.fn(() => false),
  tauriInvokeAvailable: vi.fn(() => false),
  isRealTauriWebView: vi.fn(() => false),
}));

vi.mock("@lib/client/nativeShell.js", () => ({
  getStageSyncNative: vi.fn(() => null),
}));

import {
  isDesktopShell,
  isRealTauriWebView,
  tauriInvokeAvailable,
} from "@lib/client/desktopBridge.js";
import { getStageSyncNative } from "@lib/client/nativeShell.js";

afterEach(() => {
  clearOperatorSession();
  vi.mocked(isDesktopShell).mockReturnValue(false);
  vi.mocked(tauriInvokeAvailable).mockReturnValue(false);
  vi.mocked(isRealTauriWebView).mockReturnValue(false);
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
    vi.mocked(isRealTauriWebView).mockReturnValue(true);
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

  it("allows OperatorNav + phone compact chrome on Tauri (viewport gates compact UI)", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.mocked(tauriInvokeAvailable).mockReturnValue(true);
    vi.mocked(isRealTauriWebView).mockReturnValue(true);
    expect(isOsMenuDesktopShell()).toBe(true);
    expect(shouldShowOperatorNav("/admin")).toBe(true);
    expect(shouldShowOperatorNav("/timeline/p1")).toBe(true);
    expect(shouldUseMobileCompactChrome()).toBe(true);
    expect(shouldShowFullscreenControl()).toBe(false);
  });

  it("allows OperatorNav on Tauri with WebView marker", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.mocked(isRealTauriWebView).mockReturnValue(true);
    expect(shouldShowOperatorNav("/timeline/p1")).toBe(true);
    expect(shouldUseMobileCompactChrome()).toBe(true);
  });

  it("keeps phone compact chrome on web even when desktop hostname heuristic matches", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    expect(isOsMenuDesktopShell()).toBe(false);
    expect(shouldUseMobileCompactChrome()).toBe(true);
  });

  it("shows OperatorNav on Tauri /client (booth shell)", () => {
    vi.mocked(isDesktopShell).mockReturnValue(true);
    vi.mocked(tauriInvokeAvailable).mockReturnValue(true);
    vi.mocked(isRealTauriWebView).mockReturnValue(true);
    expect(isOsMenuDesktopShell()).toBe(true);
    expect(isWebBrowserSurface()).toBe(false);
    expect(shouldShowOperatorNav("/client")).toBe(true);
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
