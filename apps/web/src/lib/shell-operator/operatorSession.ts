/** sessionStorage flag: operator reached Admin/Timeline in the web browser (LAN). */

import {
  hasExplicitTauriShellMarker,
  isDesktopShell,
  tauriInvokeAvailable,
} from "@lib/client/desktopBridge.js";
import { getActiveDevSurface } from "../../dev/devSurfaceState.js";
import { getStageSyncNative } from "@lib/client/nativeShell.js";

export const OPERATOR_SESSION_KEY = "stagesync.operatorSession";

/** Mirrors `isWebBrowserSurface` — kept local to avoid import cycles with operatorSurface. */
function usesOperatorSessionStorage(): boolean {
  const devSurface = getActiveDevSurface();
  if (devSurface === "tauri") return false;
  if (devSurface !== null && devSurface !== "web") return false;

  if (typeof __STAGESYNC_UI_TARGET__ !== "undefined") {
    if (__STAGESYNC_UI_TARGET__ === "performer" || __STAGESYNC_UI_TARGET__ === "console") {
      return false;
    }
  }

  const shellKind = getStageSyncNative()?.shellKind?.();
  if (shellKind === "performer" || shellKind === "console") return false;

  if (isDesktopShell()) {
    if (tauriInvokeAvailable() || hasExplicitTauriShellMarker()) return false;
  }

  return true;
}

export function markOperatorSession(): void {
  if (!usesOperatorSessionStorage()) return;
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(OPERATOR_SESSION_KEY, "1");
  } catch {
    /* private mode / quota */
  }
}

export function hasOperatorSession(): boolean {
  if (!usesOperatorSessionStorage()) return false;
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(OPERATOR_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export function clearOperatorSession(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(OPERATOR_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
