/**
 * Push & local notifications (#810).
 * - Local scenic alerts (host disconnect) work without cloud.
 * - FCM / WebPush registration is opt-in via host config + native bridge.
 * - Desktop Tauri uses tauri-plugin-notification (not WebView Notification API).
 */

import type {
  PushChannel,
  PushPlatform,
  PushPublicConfig,
} from "@stagesync/shared";
import {
  hasExplicitTauriShellMarker,
  requestDesktopNotificationPermission,
  showDesktopNotification,
  tauriInvokeAvailable,
} from "./desktopBridge.js";
import { getStageSyncNative } from "./nativeShell.js";

const LS_ENABLED = "stagesync.pushEnabled";

export type StageSyncNativePushBridge = {
  requestNotificationPermission?: () => void | string | Promise<string>;
  notificationPermission?: () => string;
  showLocalNotification?: (
    title: string,
    body: string,
    channel?: string,
  ) => void;
  getFcmToken?: () => string | null;
};

function pushBridge(): StageSyncNativePushBridge | null {
  const native = getStageSyncNative() as StageSyncNativePushBridge | null;
  return native;
}

/** True when desktop Tauri should own notification permission (not WebView2). */
function isDesktopNotificationPath(): boolean {
  return tauriInvokeAvailable() || hasExplicitTauriShellMarker();
}

export function readPushEnabledPreference(): boolean {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem(LS_ENABLED) === "1";
}

export function setPushEnabledPreference(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  if (enabled) localStorage.setItem(LS_ENABLED, "1");
  else localStorage.removeItem(LS_ENABLED);
}

export function getWebNotificationPermission():
  NotificationPermission | "unsupported" {
  // WebView2 sticky-denies the Web Notification API; desktop uses the Tauri plugin.
  if (isDesktopNotificationPath()) {
    return readPushEnabledPreference() ? "granted" : "default";
  }
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

/** Request OS permission (web Notification API, Android bridge, or Tauri plugin). */
export async function requestNotificationPermission(): Promise<
  NotificationPermission | "unsupported" | "native-pending"
> {
  const bridge = pushBridge();
  if (bridge && typeof bridge.requestNotificationPermission === "function") {
    try {
      bridge.requestNotificationPermission();
    } catch {
      /* ignore */
    }
    const status = bridge.notificationPermission?.();
    if (status === "granted" || status === "denied" || status === "default") {
      return status;
    }
    return "native-pending";
  }

  if (tauriInvokeAvailable()) {
    return requestDesktopNotificationPermission();
  }
  // Explicit Tauri shell marker without IPC yet — StageSync toggle is consent.
  if (hasExplicitTauriShellMarker()) {
    return "granted";
  }

  if (typeof Notification === "undefined") return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showLocalNotification(opts: {
  title: string;
  body: string;
  channel?: PushChannel;
  path?: string;
}): void {
  if (!readPushEnabledPreference()) return;

  const bridge = pushBridge();
  if (bridge && typeof bridge.showLocalNotification === "function") {
    try {
      bridge.showLocalNotification(
        opts.title,
        opts.body,
        opts.channel ?? "critical_updates",
      );
      return;
    } catch {
      /* fall through */
    }
  }

  if (tauriInvokeAvailable()) {
    void showDesktopNotification({ title: opts.title, body: opts.body });
    return;
  }

  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && !document.hidden) return;

  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      tag: opts.channel ?? "critical_updates",
      data: opts.path ? { path: opts.path } : undefined,
    });
    n.onclick = () => {
      window.focus();
      if (opts.path) {
        window.location.assign(opts.path);
      }
      n.close();
    };
  } catch {
    /* permission revoked mid-flight */
  }
}

/** Notify once per disconnect when the page is backgrounded. */
let lastScenicDisconnectAt = 0;

export function maybeNotifyHostDisconnect(status: string): void {
  if (status === "connected" || status === "connecting") return;
  if (typeof document !== "undefined" && !document.hidden) return;
  const now = Date.now();
  if (now - lastScenicDisconnectAt < 30_000) return;
  lastScenicDisconnectAt = now;
  showLocalNotification({
    title: "StageSync",
    body: "Utracono połączenie z hostem.",
    channel: "critical_updates",
    path: "/client",
  });
}

export function detectPushPlatform(): PushPlatform {
  const kind = getStageSyncNative()?.shellKind?.();
  if (kind === "performer") return "android-performer";
  if (kind === "console") return "android-console";
  // Tauri desktop shell — treat as desktop for token fan-out.
  if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
    return "desktop";
  }
  return "web";
}

export async function fetchPushPublicConfig(
  apiBase = "",
): Promise<PushPublicConfig> {
  const res = await fetch(`${apiBase}/api/push/config`);
  if (!res.ok) return { fcmAvailable: false };
  return (await res.json()) as PushPublicConfig;
}

export async function registerPushTokenWithHost(opts: {
  token: string;
  platform?: PushPlatform;
  deviceLabel?: string;
  apiBase?: string;
}): Promise<boolean> {
  const res = await fetch(`${opts.apiBase ?? ""}/api/push/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: opts.token,
      platform: opts.platform ?? detectPushPlatform(),
      ...(opts.deviceLabel ? { deviceLabel: opts.deviceLabel } : {}),
    }),
  });
  return res.ok;
}

/** Try native FCM token, else Web Push subscription endpoint when VAPID present. */
export async function syncPushRegistration(apiBase = ""): Promise<boolean> {
  if (!readPushEnabledPreference()) return false;

  const bridge = pushBridge();
  const nativeToken = bridge?.getFcmToken?.();
  if (typeof nativeToken === "string" && nativeToken.length >= 8) {
    return registerPushTokenWithHost({ token: nativeToken, apiBase });
  }

  const config = await fetchPushPublicConfig(apiBase);
  if (!config.vapidPublicKey) return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.vapidPublicKey),
      }));
    const json = sub.toJSON();
    const endpoint = json.endpoint;
    if (!endpoint || endpoint.length < 8) return false;
    // Store endpoint as opaque token; full subscription JSON in deviceLabel for later send.
    return registerPushTokenWithHost({
      token: endpoint,
      platform: "web",
      deviceLabel: JSON.stringify(json).slice(0, 120),
      apiBase,
    });
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
