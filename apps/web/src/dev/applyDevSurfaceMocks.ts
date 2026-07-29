import {
  clearOperatorSession,
  markOperatorSession,
} from "../lib/operatorSession.js";
import { setStoredDeviceDisplayName } from "../lib/deviceNamePrefs.js";
import type { DevSurface } from "./devSurfaceTypes.js";
import {
  getDevPreviewConfig,
  normalizeDevPreviewConfig,
  type DevPreviewConfig,
} from "./devPreviewConfig.js";
import { setDevSurfaceOverride } from "./devSurfaceState.js";

const DEV_NATIVE_KEY = "__stagesync_dev_native__";

type DevNativeBackup = {
  native?: Window["StageSyncNative"];
};

type TauriBackup = {
  tauriShell?: boolean;
  shell?: string;
  isTauri?: boolean;
  tauri?: unknown;
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

function readTauriBackup(): TauriBackup {
  if (typeof window === "undefined") return {};
  const w = window as unknown as Record<string, unknown>;
  return {
    tauriShell: w["__STAGESYNC_TAURI_SHELL__"] === true ? true : undefined,
    shell: typeof w["__STAGESYNC_SHELL__"] === "string" ? w["__STAGESYNC_SHELL__"] : undefined,
    isTauri: w["isTauri"] === true ? true : undefined,
    tauri: w["__TAURI__"],
  };
}

function applyTauriMarkers(surface: DevSurface, backup: TauriBackup): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (surface === "tauri") {
    w["__STAGESYNC_TAURI_SHELL__"] = true;
    w["__STAGESYNC_SHELL__"] = "desktop";
    w["isTauri"] = true;
    w["__TAURI__"] = {
      core: {
        invoke: async () => undefined,
      },
    };
    return;
  }

  if (backup.tauriShell === true) {
    w["__STAGESYNC_TAURI_SHELL__"] = true;
  } else {
    delete w["__STAGESYNC_TAURI_SHELL__"];
  }

  if (backup.shell !== undefined) {
    w["__STAGESYNC_SHELL__"] = backup.shell;
  } else if (w["__STAGESYNC_SHELL__"] === "desktop") {
    delete w["__STAGESYNC_SHELL__"];
  }

  if (backup.isTauri === true) {
    w["isTauri"] = true;
  } else if (w["isTauri"] === true) {
    delete w["isTauri"];
  }

  if (backup.tauri !== undefined) {
    w["__TAURI__"] = backup.tauri;
  } else {
    delete w["__TAURI__"];
  }
}

export function applyDevSurfaceMocks(config: DevPreviewConfig): () => void {
  if (!import.meta.env.DEV) return () => {};

  const normalized = normalizeDevPreviewConfig(config);
  const tauriBackup = readTauriBackup();

  setDevSurfaceOverride(normalized.surface);
  applyNativeShell(normalized.surface);
  applyTauriMarkers(normalized.surface, tauriBackup);

  try {
    setStoredDeviceDisplayName("Dev Preview");
  } catch {
    /* ignore quota / private mode */
  }

  if (normalized.session) {
    markOperatorSession();
  } else {
    clearOperatorSession();
  }

  return () => {
    setDevSurfaceOverride(null);
    applyNativeShell("web");
    applyTauriMarkers("web", tauriBackup);
    if (normalized.session) {
      clearOperatorSession();
    }
  };
}

/** Apply mocks when preview iframe loads (idempotent). */
export function bootDevPreviewMocks(): void {
  const config = getDevPreviewConfig();
  if (!config) return;
  applyDevSurfaceMocks(config);
}
