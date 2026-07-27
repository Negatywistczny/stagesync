import {
  clearOperatorSession,
  markOperatorSession,
} from "../lib/operatorSession.js";
import { setStoredDeviceDisplayName } from "../lib/deviceNamePrefs.js";
import type { DevSurface } from "./devSurfaceTypes.js";
import {
  getDevPreviewConfig,
  type DevPreviewConfig,
} from "./devPreviewConfig.js";
import { setDevSurfaceOverride } from "./devSurfaceState.js";

const DEV_NATIVE_KEY = "__stagesync_dev_native__";

type DevNativeBackup = {
  native?: Window["StageSyncNative"];
};

function backupNative(): DevNativeBackup {
  if (typeof window === "undefined") return {};
  const w = window as Window & { [DEV_NATIVE_KEY]?: DevNativeBackup };
  if (!w[DEV_NATIVE_KEY]) {
    w[DEV_NATIVE_KEY] = { native: window.StageSyncNative };
  }
  return w[DEV_NATIVE_KEY]!;
}

function applyNativeShell(surface: DevSurface): void {
  if (typeof window === "undefined") return;
  const backup = backupNative();
  if (surface === "console") {
    window.StageSyncNative = {
      shellKind: () => "console",
    };
    return;
  }
  if (surface === "performer") {
    window.StageSyncNative = {
      shellKind: () => "performer",
    };
    return;
  }
  window.StageSyncNative = backup.native;
}

function applyTauriMarkers(surface: DevSurface): void {
  if (typeof window === "undefined") return;
  const w = window as Window & Record<string, unknown>;
  if (surface === "tauri") {
    w["__STAGESYNC_TAURI_SHELL__"] = true;
    w["__STAGESYNC_SHELL__"] = "desktop";
    w["isTauri"] = true;
    return;
  }
  delete w["__STAGESYNC_TAURI_SHELL__"];
  if (w["__STAGESYNC_SHELL__"] === "desktop") delete w["__STAGESYNC_SHELL__"];
  if (w["isTauri"] === true) delete w["isTauri"];
}

export function applyDevSurfaceMocks(config: DevPreviewConfig): void {
  if (!import.meta.env.DEV) return;

  setDevSurfaceOverride(config.surface);
  applyNativeShell(config.surface);
  applyTauriMarkers(config.surface);

  try {
    setStoredDeviceDisplayName("Dev Preview");
  } catch {
    /* ignore quota / private mode */
  }

  if (config.session) {
    markOperatorSession();
  } else {
    clearOperatorSession();
  }
}

/** Apply mocks when preview iframe loads (idempotent). */
export function bootDevPreviewMocks(): void {
  const config = getDevPreviewConfig();
  if (!config) return;
  applyDevSurfaceMocks(config);
}
