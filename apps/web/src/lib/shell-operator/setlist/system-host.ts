import { mergeApiHeaders } from "../operatorPin.js";
import { readApiError } from "./readApiError.js";

export type HostLogLine = {
  t: number;
  level: string;
  msg: string;
};

export async function fetchHostLogs(): Promise<HostLogLine[]> {
  const res = await fetch("/api/system/logs");
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as { lines: HostLogLine[] };
  return body.lines;
}

export async function clearHostLogs(): Promise<void> {
  const res = await fetch("/api/system/logs/clear", {
    method: "POST",
    headers: mergeApiHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}

/** Download diagnostics ZIP (logs + meta). Uses host token on LAN. */
export async function downloadDiagnosticsExport(): Promise<void> {
  const res = await fetch("/api/system/diagnostics/export", {
    cache: "no-store",
    headers: mergeApiHeaders(hostLifecycleHeaders()),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/i.exec(cd);
  const filename = match?.[1] ?? `stagesync-diagnostics-${Date.now()}.zip`;
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function postSystemRestart(): Promise<void> {
  const res = await fetch("/api/system/restart", {
    method: "POST",
    headers: hostLifecycleHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}

export async function postSystemShutdown(): Promise<void> {
  const res = await fetch("/api/system/shutdown", {
    method: "POST",
    headers: hostLifecycleHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}

function hostLifecycleHeaders(): HeadersInit {
  try {
    const token = localStorage.getItem("stagesync.hostToken")?.trim();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    /* ignore */
  }
  return {};
}

function hostMutatingHeaders(extra?: HeadersInit): HeadersInit {
  return mergeApiHeaders({
    ...hostLifecycleHeaders(),
    ...(extra ?? {}),
  });
}

export type ServerSettingsValues = {
  PORT: string;
  STAGESYNC_BIND_HOST: string;
  STAGESYNC_HOST_DISPLAY_NAME: string;
  STAGESYNC_DISABLE_MDNS: boolean;
  LOG_LEVEL: string;
  STAGESYNC_DISABLE_AUTO_UPDATE: boolean;
  STAGESYNC_UPDATE_CHANNEL: string;
  STAGESYNC_DATA_DIR: string;
  STAGESYNC_BACKUPS_DIR: string;
  STAGESYNC_ASSETS_DIR: string;
  STAGESYNC_SAFETY_ROLE: string;
  [key: string]: string | boolean;
};

export type ServerSettingsResponse = {
  values: ServerSettingsValues;
  envExists: boolean;
  secretsConfigured?: Record<string, boolean>;
  schema: Record<
    string,
    {
      section: string;
      type: string;
      label: string;
      hint: string | null;
      options: string[] | null;
      defaultValue: string | boolean | null;
      pathKind: "dir" | "file" | null;
      restartRequired: boolean;
      secret?: boolean;
    }
  >;
  restartRequired?: boolean;
  restartKeys?: string[];
  message?: string;
  resolved?: {
    dataDir: string | null;
    backupsDir: string | null;
    assetsHint: string | null;
  };
};

export async function fetchServerSettings(): Promise<ServerSettingsResponse> {
  const res = await fetch("/api/system/settings", {
    cache: "no-store",
    headers: hostLifecycleHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as ServerSettingsResponse;
}

export async function putServerSettings(
  values: Partial<ServerSettingsValues>,
): Promise<ServerSettingsResponse> {
  const res = await fetch("/api/system/settings", {
    method: "PUT",
    headers: hostMutatingHeaders({
      "content-type": "application/json",
    }),
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as ServerSettingsResponse;
}

export type BrowseResult = {
  path: string;
  envPath: string;
  parent: string | null;
  parentEnvPath: string | null;
  canSelectCurrent: boolean;
  entries: Array<{
    name: string;
    type: "dir" | "file";
    path: string;
    envPath: string;
    selectable: boolean;
  }>;
};

export async function browseServerPath(options: {
  path?: string;
  mode?: "dir" | "file";
  ext?: string;
}): Promise<BrowseResult> {
  const params = new URLSearchParams();
  params.set("mode", options.mode ?? "dir");
  if (options.path) params.set("path", options.path);
  if (options.ext) params.set("ext", options.ext);
  const res = await fetch(`/api/system/browse?${params}`, {
    cache: "no-store",
    headers: hostLifecycleHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as BrowseResult;
}

export type RestoreBackupItem = {
  source: string;
  targetPath: string;
  shadowed: string | null;
};

export type RestoreBackupResponse = {
  ok: true;
  bakPath?: string;
  targetPath?: string;
  shadowed?: string | null;
  restored?: RestoreBackupItem[];
  count?: number;
  message?: string;
};

/** POST /api/system/restore — destructive; requires confirm + operator PIN when configured. */
export async function postSystemRestore(
  pathOrPaths: string | string[],
): Promise<RestoreBackupResponse> {
  const body =
    typeof pathOrPaths === "string"
      ? { path: pathOrPaths, confirm: true as const }
      : { paths: pathOrPaths, confirm: true as const };
  const res = await fetch("/api/system/restore", {
    method: "POST",
    headers: hostMutatingHeaders({
      "content-type": "application/json",
    }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as RestoreBackupResponse;
}

export type HostUpdateStatus = {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  error?: string | null;
  /** Watchtower apply path — false for Desktop / Console / bare host without env. */
  applyAvailable?: boolean;
  updateMode?: "desktop" | "apk" | "docker" | "manual";
  /** Direct APK URL from `android-latest.json` (Admin Android check). */
  apkUrl?: string | null;
};

export async function fetchHostUpdateStatus(): Promise<HostUpdateStatus> {
  const res = await fetch("/api/system/update-status", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as HostUpdateStatus;
}

export async function postApplyHostUpdate(): Promise<void> {
  const res = await fetch("/api/system/apply-update", {
    method: "POST",
    headers: mergeApiHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ target: "host" }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}

export type SafetyNetStatus = {
  role: "master" | "spare";
  midiOutAllowed: boolean;
  /** True when promote paused a PLAYING transport (ADR 0017 §3). */
  transportPaused?: boolean;
};

export async function fetchSafetyNetStatus(): Promise<SafetyNetStatus> {
  const res = await fetch("/api/system/safety-net", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as SafetyNetStatus;
}

/** Manual Spare → Master promote (MIDI OUT on). */
export async function postSafetyNetPromote(): Promise<SafetyNetStatus> {
  const res = await fetch("/api/system/promote", {
    method: "POST",
    headers: mergeApiHeaders({ "content-type": "application/json" }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as SafetyNetStatus;
}
