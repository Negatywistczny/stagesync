import {
  EDIT_HISTORY_EVENT,
  RETURN_TO_LAUNCHER_HREF,
  tauriInvoke,
  type DesktopNotificationPermission,
  type DesktopUpdateInfo,
  type EditHistoryDetail,
} from "./desktopTypes.js";
import {
  canUseDesktopUpdater,
  hasTauriWebViewMarker,
  isDesktopShell,
  tauriInvokeAvailable,
} from "./desktopShell.js";
import { getActiveDevSurface } from "../../../dev/devSurfaceState.js";

export function checkDesktopUpdate(): Promise<DesktopUpdateInfo> {
  if (!canUseDesktopUpdater()) {
    return Promise.reject(new Error("Not running in Tauri shell"));
  }
  return tauriInvoke<DesktopUpdateInfo>("check_desktop_update");
}

export function installDesktopUpdate(): Promise<void> {
  if (!canUseDesktopUpdater()) {
    return Promise.reject(new Error("Not running in Tauri shell"));
  }
  return tauriInvoke<void>("install_desktop_update");
}

export function syncNavTimelineProjectId(
  projectId: string | null,
): Promise<void> {
  if (!isDesktopShell()) return Promise.resolve();
  return tauriInvoke<void>("set_nav_timeline_project_id", {
    projectId,
  });
}

export function syncNavRecentProjects(
  projects: Array<{ id: string; name: string }>,
): Promise<void> {
  if (!isDesktopShell()) return Promise.resolve();
  return tauriInvoke<void>("set_nav_recent_projects", { projects });
}

export function syncEditHistoryState(
  canUndo: boolean,
  canRedo: boolean,
): Promise<void> {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function"
  ) {
    window.dispatchEvent(
      new CustomEvent(EDIT_HISTORY_EVENT, {
        detail: { canUndo, canRedo } satisfies EditHistoryDetail,
      }),
    );
  }
  if (!isDesktopShell()) return Promise.resolve();
  return tauriInvoke<void>("set_edit_history_state", { canUndo, canRedo });
}

export function openExternalUrl(url: string): Promise<void> {
  const raw = String(url ?? "").trim();
  if (!raw || raw.length > 2048) {
    return Promise.reject(new Error("Invalid external URL"));
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return Promise.reject(new Error("Invalid external URL"));
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return Promise.reject(new Error("External URL must be http(s)"));
  }
  const safe = parsed.toString();
  if (isDesktopShell() && tauriInvokeAvailable()) {
    return tauriInvoke<void>("open_external_url", { url: safe });
  }
  window.open(safe, "_blank", "noopener,noreferrer");
  return Promise.resolve();
}

export function prepareHostRestart(): Promise<void> {
  if (!tauriInvokeAvailable()) return Promise.resolve();
  return tauriInvoke<void>("prepare_host_restart", {}).catch(() => {});
}

export async function requestDesktopNotificationPermission(): Promise<DesktopNotificationPermission> {
  if (!tauriInvokeAvailable()) return "denied";
  try {
    const state = await tauriInvoke<string>(
      "plugin:notification|request_permission",
    );
    if (state === "granted" || state === "denied") return state;
    if (state === "prompt" || state === "prompt-with-rationale")
      return "default";
    return "granted";
  } catch {
    return "granted";
  }
}

export async function showDesktopNotification(opts: {
  title: string;
  body: string;
}): Promise<boolean> {
  if (!tauriInvokeAvailable()) return false;
  try {
    await tauriInvoke<void>("plugin:notification|notify", {
      options: { title: opts.title, body: opts.body },
    });
    return true;
  } catch {
    return false;
  }
}

function assignReturnToLauncherHref(): void {
  window.location.assign(RETURN_TO_LAUNCHER_HREF);
}

export function returnToLauncher(): Promise<void> {
  if (tauriInvokeAvailable()) {
    return tauriInvoke<void>("return_to_launcher", {}).catch(() => {
      assignReturnToLauncherHref();
    });
  }
  if (hasTauriWebViewMarker() || getActiveDevSurface() === "tauri") {
    assignReturnToLauncherHref();
    return Promise.resolve();
  }
  return Promise.reject(
    new Error("Powrót do Launchera niedostępny w tej sesji"),
  );
}
