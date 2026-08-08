/**
 * Android WebView bridge (`StageSyncNative`) + immersive-shell helpers.
 * Fullscreen control visibility lives in `operatorSurface` (web browser only).
 */

import { MQ_MOBILE } from "@lib/timeline/breakpoints.js";

export type StageSyncNativeBridge = {
  shellKind?: () => string;
  keepScreenOnNative?: () => boolean;
  /** Finish HostWebActivity → return to launcher host picker. */
  changeServer?: () => void;
  /** #810 — request POST_NOTIFICATIONS / system permission (contextual). */
  requestNotificationPermission?: () => void;
  /** #810 — granted | denied | default */
  notificationPermission?: () => string;
  /** #810 — local scenic notification (no cloud). */
  showLocalNotification?: (
    title: string,
    body: string,
    channel?: string,
  ) => void;
  /** #810 — FCM registration token when google-services present. */
  getFcmToken?: () => string | null;
};

declare global {
  interface Window {
    StageSyncNative?: StageSyncNativeBridge;
  }
}

function lookLikeNativeBridge(value: unknown): value is StageSyncNativeBridge {
  if (value == null || (typeof value !== "object" && typeof value !== "function")) {
    return false;
  }
  const bridge = value as StageSyncNativeBridge;
  // Android WebView injects a host object — prefer method presence over typeof===object.
  return (
    typeof bridge.shellKind === "function" ||
    typeof bridge.changeServer === "function" ||
    typeof bridge.keepScreenOnNative === "function" ||
    typeof value === "object"
  );
}

export function getStageSyncNative(): StageSyncNativeBridge | null {
  if (typeof window === "undefined") return null;
  try {
    const bridge = window.StageSyncNative;
    return lookLikeNativeBridge(bridge) ? bridge : null;
  } catch {
    // Some WebViews throw on property access before the interface is ready.
    return null;
  }
}

/** True when Console / Performer injected `StageSyncNative` into the WebView. */
export function isNativeAndroidShell(): boolean {
  return getStageSyncNative() != null;
}

/** Android UA (WebView or Chrome) — never treat as desktop installer surface. */
export function isAndroidUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent ?? "");
}

/**
 * Admin Host update copy: native bridge OR any Android UA.
 * Avoids “Desktop: pobierz instalator…” inside Console APK when bridge probe fails.
 */
export function isAndroidUpdateSurface(): boolean {
  return isNativeAndroidShell() || isAndroidUserAgent();
}

function matchesMedia(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

/** True when OS / shell chrome is already immersive (no useful in-app fullscreen). */
export function isImmersiveClientSurface(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeAndroidShell() || isAndroidUserAgent()) return true;

  const standalone =
    matchesMedia("(display-mode: standalone)") ||
    matchesMedia("(display-mode: fullscreen)") ||
    matchesMedia("(display-mode: minimal-ui)") ||
    Boolean(
      (navigator as Navigator & { standalone?: boolean }).standalone,
    );

  const mobileSurface =
    matchesMedia(MQ_MOBILE) || matchesMedia("(pointer: coarse)");

  return standalone && mobileSurface;
}

/** Returns true when the native host picker was requested. */
export function requestNativeChangeServer(): boolean {
  const native = getStageSyncNative();
  if (!native || typeof native.changeServer !== "function") return false;
  native.changeServer();
  return true;
}

export function canChangeServer(): boolean {
  const native = getStageSyncNative();
  return typeof native?.changeServer === "function";
}
