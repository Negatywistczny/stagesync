import {
  clearOperatorSession,
  markOperatorSession,
} from "@lib/shell-operator/operatorSession.js";
import { setStoredDeviceDisplayName } from "@lib/client/deviceNamePrefs.js";
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

function applyNativeShell(surface: DevSurface | null): void {
  if (typeof window === "undefined") return;
  const backup = backupNative();
  
  if (surface === null) {
    window.StageSyncNative = backup.native;
    return;
  }

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
  
  delete window.StageSyncNative;
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

function applyTauriMarkers(surface: DevSurface | null, backup: TauriBackup): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  
  if (surface === null) {
    if (backup.tauriShell === true) Reflect.set(w, "__STAGESYNC_TAURI_SHELL__", true);
    else Reflect.deleteProperty(w, "__STAGESYNC_TAURI_SHELL__");

    if (backup.shell !== undefined) Reflect.set(w, "__STAGESYNC_SHELL__", backup.shell);
    else Reflect.deleteProperty(w, "__STAGESYNC_SHELL__");

    if (backup.isTauri === true) Reflect.set(w, "isTauri", true);
    else Reflect.deleteProperty(w, "isTauri");

    if (backup.tauri !== undefined) Reflect.set(w, "__TAURI__", backup.tauri);
    else Reflect.deleteProperty(w, "__TAURI__");
    return;
  }

  if (surface === "tauri") {
    Reflect.set(w, "__STAGESYNC_TAURI_SHELL__", true);
    Reflect.set(w, "__STAGESYNC_SHELL__", "desktop");
    Reflect.set(w, "isTauri", true);
    Reflect.set(w, "__TAURI__", {
      core: {
        invoke: async () => undefined,
      },
    });
    return;
  }

  Reflect.deleteProperty(w, "__STAGESYNC_TAURI_SHELL__");
  Reflect.deleteProperty(w, "__STAGESYNC_SHELL__");
  Reflect.deleteProperty(w, "isTauri");
  Reflect.deleteProperty(w, "__TAURI__");
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

  if (normalized.surface === "web") {
    if (normalized.session) {
      markOperatorSession();
    } else {
      clearOperatorSession();
    }
  } else {
    clearOperatorSession();
  }

  return () => {
    setDevSurfaceOverride(null);
    applyNativeShell(null);
    applyTauriMarkers(null, tauriBackup);
    if (normalized.surface === "web" && normalized.session) {
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
