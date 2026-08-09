import { afterEach, describe, expect, it, vi } from "vitest";

const mem = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => {
    mem.set(k, v);
  },
  removeItem: (k: string) => {
    mem.delete(k);
  },
  clear: () => mem.clear(),
});

vi.stubGlobal("window", {
  StageSyncNative: undefined as unknown,
});

import {
  detectPushPlatform,
  getWebNotificationPermission,
  readPushEnabledPreference,
  requestNotificationPermission,
  setPushEnabledPreference,
} from "./pushNotifications.js";

describe("pushNotifications (#810)", () => {
  afterEach(() => {
    mem.clear();
    (window as { StageSyncNative?: unknown }).StageSyncNative = undefined;
    vi.unstubAllGlobals();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
      removeItem: (k: string) => {
        mem.delete(k);
      },
      clear: () => mem.clear(),
    });
    vi.stubGlobal("window", {
      StageSyncNative: undefined as unknown,
    });
  });

  it("persists enabled preference", () => {
    expect(readPushEnabledPreference()).toBe(false);
    setPushEnabledPreference(true);
    expect(readPushEnabledPreference()).toBe(true);
    setPushEnabledPreference(false);
    expect(readPushEnabledPreference()).toBe(false);
  });

  it("detects web platform by default", () => {
    expect(detectPushPlatform()).toBe("web");
  });

  it("detects android-performer from StageSyncNative bridge", () => {
    (
      window as { StageSyncNative?: { shellKind: () => string } }
    ).StageSyncNative = { shellKind: () => "performer" };
    expect(detectPushPlatform()).toBe("android-performer");
  });

  it("on Tauri ignores sticky WebView denied and grants via plugin invoke", async () => {
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === "plugin:notification|request_permission") return "granted";
      throw new Error(`unexpected ${cmd}`);
    });
    vi.stubGlobal("window", {
      StageSyncNative: undefined,
      __TAURI__: { core: { invoke } },
      Notification: {
        permission: "denied",
        requestPermission: vi.fn(async () => "denied"),
      },
    });
    expect(getWebNotificationPermission()).toBe("default");
    await expect(requestNotificationPermission()).resolves.toBe("granted");
    expect(invoke).toHaveBeenCalledWith(
      "plugin:notification|request_permission",
      undefined,
    );
  });
});
