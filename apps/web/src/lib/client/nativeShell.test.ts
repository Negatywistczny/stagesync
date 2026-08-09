/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canChangeServer,
  getStageSyncNative,
  isAndroidUpdateSurface,
  isAndroidUserAgent,
  isImmersiveClientSurface,
  isNativeAndroidShell,
  requestNativeChangeServer,
} from "./nativeShell.js";

afterEach(() => {
  delete window.StageSyncNative;
  vi.unstubAllGlobals();
});

describe("nativeShell", () => {
  it("detects StageSyncNative bridge", () => {
    expect(isNativeAndroidShell()).toBe(false);
    window.StageSyncNative = { shellKind: () => "performer" };
    expect(isNativeAndroidShell()).toBe(true);
    expect(getStageSyncNative()?.shellKind?.()).toBe("performer");
  });

  it("treats Android UA as update surface even without bridge", () => {
    vi.stubGlobal("navigator", {
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    });
    expect(isAndroidUserAgent()).toBe(true);
    expect(isAndroidUpdateSurface()).toBe(true);
    expect(isNativeAndroidShell()).toBe(false);
  });

  it("treats native Android shell as immersive", () => {
    window.StageSyncNative = { shellKind: () => "console" };
    expect(isImmersiveClientSurface()).toBe(true);
  });

  it("treats Android UA as immersive without bridge", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36",
    });
    expect(isImmersiveClientSurface()).toBe(true);
  });

  it("treats mobile standalone PWA as immersive", () => {
    window.matchMedia = ((q: string) => ({
      matches:
        q.includes("display-mode: standalone") || q.includes("max-width: 768"),
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as typeof window.matchMedia;
    expect(isImmersiveClientSurface()).toBe(true);
  });

  it("does not treat desktop browser as immersive", () => {
    window.matchMedia = ((q: string) => ({
      matches: false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    })) as typeof window.matchMedia;
    expect(isImmersiveClientSurface()).toBe(false);
  });

  it("changeServer only when bridge exposes it", () => {
    expect(canChangeServer()).toBe(false);
    expect(requestNativeChangeServer()).toBe(false);
    const changeServer = vi.fn();
    window.StageSyncNative = { changeServer };
    expect(canChangeServer()).toBe(true);
    expect(requestNativeChangeServer()).toBe(true);
    expect(changeServer).toHaveBeenCalledOnce();
  });
});
