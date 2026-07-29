import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { clearOperatorSession, markOperatorSession } from "../lib/operatorSession.js";
import { AdminShell } from "../shells/AdminShell.js";
import { ClientShell } from "../shells/ClientShell.js";
import { TimelineShell } from "../shells/TimelineShell.js";
import { parseDevPreviewConfig } from "./devLayoutConfig.js";

type MutableWindow = Window &
  typeof globalThis & {
    __STAGESYNC_UI_TARGET__?: "full" | "performer" | "console";
    __STAGESYNC_TAURI_SHELL__?: boolean;
    __STAGESYNC_SHELL__?: string;
    __TAURI__?: { core?: { invoke?: (...args: unknown[]) => Promise<unknown> } };
    StageSyncNative?: { shellKind?: () => string };
  };

function applyDevSurfaceMocks(surface: "web" | "tauri" | "console" | "performer"): () => void {
  const w = window as MutableWindow;
  const prev = {
    uiTarget: w.__STAGESYNC_UI_TARGET__,
    tauriShell: w.__STAGESYNC_TAURI_SHELL__,
    shell: w.__STAGESYNC_SHELL__,
    tauri: w.__TAURI__,
    native: w.StageSyncNative,
  };

  delete w.__STAGESYNC_UI_TARGET__;
  delete w.__STAGESYNC_TAURI_SHELL__;
  delete w.__STAGESYNC_SHELL__;
  delete w.__TAURI__;
  w.StageSyncNative = undefined;

  if (surface === "performer") {
    w.__STAGESYNC_UI_TARGET__ = "performer";
  } else if (surface === "console") {
    w.__STAGESYNC_UI_TARGET__ = "console";
  } else if (surface === "tauri") {
    w.__STAGESYNC_TAURI_SHELL__ = true;
    w.__STAGESYNC_SHELL__ = "desktop";
    w.__TAURI__ = {
      core: {
        invoke: async () => undefined,
      },
    };
  } else {
    w.__STAGESYNC_UI_TARGET__ = "full";
  }

  return () => {
    w.__STAGESYNC_UI_TARGET__ = prev.uiTarget;
    w.__STAGESYNC_TAURI_SHELL__ = prev.tauriShell;
    w.__STAGESYNC_SHELL__ = prev.shell;
    w.__TAURI__ = prev.tauri;
    w.StageSyncNative = prev.native;
  };
}

export function DevPreviewApp() {
  const location = useLocation();
  const config = parseDevPreviewConfig(location.search);

  useEffect(() => {
    if (config.session) {
      markOperatorSession();
    } else {
      clearOperatorSession();
    }
  }, [config.session]);

  useEffect(() => {
    return applyDevSurfaceMocks(config.surface);
  }, [config.surface]);

  if (config.route === "timeline") {
    return <TimelineShell />;
  }
  if (config.route === "client") {
    return <ClientShell />;
  }
  return <AdminShell />;
}
