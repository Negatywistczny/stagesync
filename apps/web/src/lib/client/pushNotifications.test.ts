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
  fetchPushPublicConfig,
  getWebNotificationPermission,
  maybeNotifyHostDisconnect,
  readPushEnabledPreference,
  registerPushTokenWithHost,
  requestNotificationPermission,
  setPushEnabledPreference,
  showLocalNotification,
  syncPushRegistration,
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

  it("detects android-console from StageSyncNative bridge", () => {
    (
      window as { StageSyncNative?: { shellKind: () => string } }
    ).StageSyncNative = { shellKind: () => "console" };
    expect(detectPushPlatform()).toBe("android-console");
  });

  it("showLocalNotification no-ops when preference disabled", () => {
    setPushEnabledPreference(false);
    const show = vi.fn();
    (
      window as {
        StageSyncNative?: { showLocalNotification: typeof show };
      }
    ).StageSyncNative = { showLocalNotification: show };
    showLocalNotification({ title: "T", body: "B" });
    expect(show).not.toHaveBeenCalled();
  });

  it("showLocalNotification uses native bridge when enabled", () => {
    setPushEnabledPreference(true);
    const show = vi.fn();
    (
      window as {
        StageSyncNative?: { showLocalNotification: typeof show };
      }
    ).StageSyncNative = { showLocalNotification: show };
    showLocalNotification({
      title: "T",
      body: "B",
      channel: "critical_updates",
    });
    expect(show).toHaveBeenCalledWith("T", "B", "critical_updates");
  });

  it("maybeNotifyHostDisconnect skips connected status", () => {
    setPushEnabledPreference(true);
    const show = vi.fn();
    (
      window as {
        StageSyncNative?: { showLocalNotification: typeof show };
      }
    ).StageSyncNative = { showLocalNotification: show };
    vi.stubGlobal("document", { hidden: true });
    maybeNotifyHostDisconnect("connected");
    expect(show).not.toHaveBeenCalled();
  });

  it("maybeNotifyHostDisconnect notifies once when backgrounded", () => {
    setPushEnabledPreference(true);
    const show = vi.fn();
    (
      window as {
        StageSyncNative?: { showLocalNotification: typeof show };
      }
    ).StageSyncNative = { showLocalNotification: show };
    vi.stubGlobal("document", { hidden: true });
    maybeNotifyHostDisconnect("disconnected");
    expect(show).toHaveBeenCalled();
  });

  it("fetchPushPublicConfig returns fcmAvailable false on HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 500 })),
    );
    await expect(fetchPushPublicConfig("/api-base")).resolves.toEqual({
      fcmAvailable: false,
    });
  });

  it("registerPushTokenWithHost posts token payload", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      registerPushTokenWithHost({
        token: "tok-12345678",
        platform: "web",
        apiBase: "",
      }),
    ).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/tokens",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("syncPushRegistration returns false when preference off", async () => {
    setPushEnabledPreference(false);
    await expect(syncPushRegistration()).resolves.toBe(false);
  });
});
