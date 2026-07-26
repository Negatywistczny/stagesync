/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
} from "./screenWakeLock.js";

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe("screenWakeLock", () => {
  it("returns null when Wake Lock API and video fallback are unavailable", async () => {
    vi.stubGlobal("navigator", {});
    await expect(requestScreenWakeLock()).resolves.toBeNull();
  });

  it("requests and releases a sentinel", async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const sentinel = { release } as unknown as WakeLockSentinel;
    const request = vi.fn().mockResolvedValue(sentinel);
    vi.stubGlobal("navigator", {
      wakeLock: { request },
    });
    await expect(requestScreenWakeLock()).resolves.toBe(sentinel);
    expect(request).toHaveBeenCalledWith("screen");
    await releaseScreenWakeLock(sentinel);
    expect(release).toHaveBeenCalled();
  });

  it("falls back to silent video when Wake Lock request fails", async () => {
    vi.stubGlobal("navigator", {
      wakeLock: {
        request: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    const play = vi.fn().mockResolvedValue(undefined);
    const captureStream = vi.fn().mockReturnValue({} as MediaStream);
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      fillStyle: "",
      fillRect: vi.fn(),
    }) as unknown as typeof original;
    Object.defineProperty(HTMLCanvasElement.prototype, "captureStream", {
      configurable: true,
      value: captureStream,
    });
    const playSpy = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementation(play);

    const handle = await requestScreenWakeLock();
    expect(handle).not.toBeNull();
    expect(captureStream).toHaveBeenCalled();
    await releaseScreenWakeLock(handle);
    playSpy.mockRestore();
    HTMLCanvasElement.prototype.getContext = original;
    Reflect.deleteProperty(HTMLCanvasElement.prototype, "captureStream");
  });

  it("releaseScreenWakeLock no-ops on null and swallows release errors", async () => {
    await expect(releaseScreenWakeLock(null)).resolves.toBeUndefined();
    const release = vi.fn().mockRejectedValue(new Error("already released"));
    await expect(
      releaseScreenWakeLock({ release } as unknown as WakeLockSentinel),
    ).resolves.toBeUndefined();
    expect(release).toHaveBeenCalledOnce();
  });
});
