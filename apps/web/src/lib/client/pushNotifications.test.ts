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

  it("syncPushRegistration posts native FCM token when preference ON", async () => {
    setPushEnabledPreference(true);
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    (
      window as {
        StageSyncNative?: { getFcmToken: () => string };
      }
    ).StageSyncNative = { getFcmToken: () => "fcm-token-abcdefgh" };
    await expect(syncPushRegistration("")).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/tokens",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse(
      ((fetchMock.mock.calls as any[])[0][1] as { body: string }).body,
    ) as { token: string };
    expect(body.token).toBe("fcm-token-abcdefgh");
  });

  it("syncPushRegistration returns false when no FCM and config lacks vapid", async () => {
    setPushEnabledPreference(true);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ fcmAvailable: false }, { status: 200 }),
      ),
    );
    await expect(syncPushRegistration()).resolves.toBe(false);
  });

  it("syncPushRegistration Web Push subscribes and posts endpoint", async () => {
    setPushEnabledPreference(true);
    const subscription = {
      toJSON: () => ({
        endpoint: "https://push.example/endpoint-abcdef",
        keys: { p256dh: "a", auth: "b" },
      }),
    };
    const pushManager = {
      getSubscription: vi.fn(async () => null),
      subscribe: vi.fn(async () => subscription),
    };
    vi.stubGlobal("navigator", {
      serviceWorker: {
        ready: Promise.resolve({ pushManager }),
      },
    });
    vi.stubGlobal("window", {
      StageSyncNative: undefined,
      PushManager: function PushManager() {},
    });
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url).includes("/api/push/config")) {
        return Response.json({
          fcmAvailable: false,
          vapidPublicKey: "dGVzdC1rZXktMTIzNDU2",
        });
      }
      return new Response(null, { status: 204 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(syncPushRegistration("")).resolves.toBe(true);
    expect(pushManager.subscribe).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/push/tokens",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("requestNotificationPermission uses native bridge status", async () => {
    (
      window as {
        StageSyncNative?: {
          requestNotificationPermission: () => void;
          notificationPermission: () => string;
        };
      }
    ).StageSyncNative = {
      requestNotificationPermission: vi.fn(),
      notificationPermission: () => "granted",
    };
    await expect(requestNotificationPermission()).resolves.toBe("granted");
  });

  it("requestNotificationPermission returns unsupported when Notification undefined", async () => {
    vi.stubGlobal("window", { StageSyncNative: undefined });
    // Ensure no Notification global
    vi.stubGlobal("Notification", undefined);
    await expect(requestNotificationPermission()).resolves.toBe("unsupported");
  });

  it("showLocalNotification uses Web Notification API when backgrounded", () => {
    setPushEnabledPreference(true);
    const instances: Array<{
      onclick: (() => void) | null;
      close: () => void;
    }> = [];
    const NotificationMock = vi.fn(function (
      this: { onclick: (() => void) | null; close: () => void },
      title: string,
      opts?: NotificationOptions,
    ) {
      void title;
      void opts;
      this.onclick = null;
      this.close = vi.fn();
      instances.push(this);
    }) as unknown as typeof Notification;
    Object.defineProperty(NotificationMock, "permission", {
      value: "granted",
      configurable: true,
    });
    vi.stubGlobal("Notification", NotificationMock);
    vi.stubGlobal("document", { hidden: true });
    vi.stubGlobal("window", {
      StageSyncNative: undefined,
      focus: vi.fn(),
      location: { assign: vi.fn() },
    });

    showLocalNotification({
      title: "Host",
      body: "offline",
      channel: "critical_updates",
      path: "/client",
    });
    expect(NotificationMock).toHaveBeenCalledWith(
      "Host",
      expect.objectContaining({ body: "offline", tag: "critical_updates" }),
    );
    expect(instances).toHaveLength(1);
  });

  it("detectPushPlatform returns desktop when __TAURI_INTERNALS__ present", () => {
    vi.stubGlobal("window", {
      StageSyncNative: undefined,
      __TAURI_INTERNALS__: { invoke: vi.fn() },
    });
    expect(detectPushPlatform()).toBe("desktop");
  });

  it("getWebNotificationPermission grants via Tauri shell marker when preference on", () => {
    setPushEnabledPreference(true);
    vi.stubGlobal("window", {
      StageSyncNative: undefined,
      __STAGESYNC_TAURI_SHELL__: true,
    });
    expect(getWebNotificationPermission()).toBe("granted");
  });

  it("maybeNotifyHostDisconnect skips when document is visible", () => {
    setPushEnabledPreference(true);
    const show = vi.fn();
    (
      window as {
        StageSyncNative?: { showLocalNotification: typeof show };
      }
    ).StageSyncNative = { showLocalNotification: show };
    vi.stubGlobal("document", { hidden: false });
    maybeNotifyHostDisconnect("disconnected");
    expect(show).not.toHaveBeenCalled();
  });

  it("maybeNotifyHostDisconnect rate-limits second call within 30s", () => {
    // Advance past any prior notify timestamp stored in module state.
    const base = Date.now() + 120_000;
    vi.useFakeTimers();
    vi.setSystemTime(base);
    setPushEnabledPreference(true);
    const show = vi.fn();
    (
      window as {
        StageSyncNative?: { showLocalNotification: typeof show };
      }
    ).StageSyncNative = { showLocalNotification: show };
    vi.stubGlobal("document", { hidden: true });

    maybeNotifyHostDisconnect("disconnected");
    expect(show).toHaveBeenCalledTimes(1);

    maybeNotifyHostDisconnect("disconnected");
    expect(show).toHaveBeenCalledTimes(1);

    vi.setSystemTime(base + 31_000);
    maybeNotifyHostDisconnect("disconnected");
    expect(show).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
