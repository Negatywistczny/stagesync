/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canChangeServer,
  getStageSyncNative,
  isImmersiveClientSurface,
  isNativeAndroidShell,
  requestNativeChangeServer,
  shouldShowFullscreenControl,
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

  it("hides fullscreen on native Android shell", () => {
    window.StageSyncNative = { shellKind: () => "console" };
    expect(isImmersiveClientSurface()).toBe(true);
    expect(shouldShowFullscreenControl()).toBe(false);
  });

  it("hides fullscreen for mobile standalone PWA", () => {
    window.matchMedia = ((q: string) =>
      ({
        matches:
          q.includes("display-mode: standalone") ||
          q.includes("max-width: 768"),
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
        onchange: null,
      })) as typeof window.matchMedia;
    expect(shouldShowFullscreenControl()).toBe(false);
  });

  it("keeps fullscreen for desktop browser", () => {
    window.matchMedia = ((q: string) =>
      ({
        matches: false,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
        onchange: null,
      })) as typeof window.matchMedia;
    expect(shouldShowFullscreenControl()).toBe(true);
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
