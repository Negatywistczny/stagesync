import { afterEach, describe, expect, it, vi } from "vitest";
import {
  releaseScreenWakeLock,
  requestScreenWakeLock,
} from "./screenWakeLock.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("screenWakeLock", () => {
  it("returns null when Wake Lock API is missing", async () => {
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

  it("swallows request failures", async () => {
    vi.stubGlobal("navigator", {
      wakeLock: {
        request: vi.fn().mockRejectedValue(new Error("denied")),
      },
    });
    await expect(requestScreenWakeLock()).resolves.toBeNull();
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
