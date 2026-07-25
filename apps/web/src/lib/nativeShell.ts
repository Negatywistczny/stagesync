/**
 * Android WebView bridge (`StageSyncNative`) + immersive-shell helpers.
 * Desktop browser / Tauri keep fullscreen; native kiosk + mobile PWA hide it.
 */

import { MQ_MOBILE } from "./breakpoints.js";

export type StageSyncNativeBridge = {
  shellKind?: () => string;
  keepScreenOnNative?: () => boolean;
  /** Finish HostWebActivity → return to launcher host picker. */
  changeServer?: () => void;
};

declare global {
  interface Window {
    StageSyncNative?: StageSyncNativeBridge;
  }
}

export function getStageSyncNative(): StageSyncNativeBridge | null {
  if (typeof window === "undefined") return null;
  const bridge = window.StageSyncNative;
  return bridge && typeof bridge === "object" ? bridge : null;
}

export function isNativeAndroidShell(): boolean {
  return getStageSyncNative() != null;
}

function matchesMedia(query: string): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

/** True when OS / shell chrome is already immersive (no useful in-app fullscreen). */
export function isImmersiveClientSurface(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeAndroidShell()) return true;

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

/** Fullscreen control: keep for desktop browser / Tauri; hide on Android shells + mobile PWA. */
export function shouldShowFullscreenControl(): boolean {
  return !isImmersiveClientSurface();
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
