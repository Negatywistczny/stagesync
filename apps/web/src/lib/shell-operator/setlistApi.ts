import type { SetlistItem, SetlistView } from "@stagesync/shared";
import { mergeApiHeaders } from "./operatorPin.js";

async function readApiError(res: Response): Promise<string> {
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: string };
    if (body.error) message = body.error;
  } catch {
    /* ignore */
  }
  return message.slice(0, 500);
}

export async function fetchSetlist(): Promise<SetlistView> {
  const res = await fetch("/api/setlist");
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as SetlistView;
}

export async function putSetlist(body: {
  enabled: boolean;
  items?: SetlistItem[];
  projectIds?: string[];
  timeBudgetMinutes?: number;
}): Promise<SetlistView> {
  const res = await fetch("/api/setlist", {
    method: "PUT",
    headers: mergeApiHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as SetlistView;
}

export async function patchSetlistAutoAdvance(
  enabled: boolean,
): Promise<SetlistView> {
  const res = await fetch("/api/setlist/auto-advance", {
    method: "PATCH",
    headers: mergeApiHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as SetlistView;
}

export async function sendStageMessage(body: {
  text: string;
  ttlMs?: number;
  roles?: Array<"karaoke" | "grid" | "score" | "drums">;
  priority?: "normal" | "alert";
}): Promise<SessionStageMessage[]> {
  const res = await fetch("/api/stage/message", {
    method: "POST",
    headers: mergeApiHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const payload = (await res.json()) as { messages?: SessionStageMessage[] };
  return payload.messages ?? [];
}

export type SessionStageMessage = {
  id: string;
  text: string;
  roles?: Array<"karaoke" | "grid" | "score" | "drums">;
  ttlMs: number;
  sentAtMs: number;
  priority?: "normal" | "alert";
  expiresAt?: string;
};

export async function fetchStageMessages(): Promise<SessionStageMessage[]> {
  const res = await fetch("/api/stage/messages");
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as { messages: SessionStageMessage[] };
  return body.messages;
}

export async function dismissStageMessage(
  id: string,
): Promise<SessionStageMessage[]> {
  const res = await fetch(`/api/stage/messages/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: mergeApiHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as { messages: SessionStageMessage[] };
  return body.messages;
}

export async function clearStageMessages(): Promise<void> {
  const res = await fetch("/api/stage/messages", {
    method: "DELETE",
    headers: mergeApiHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}

export type PresenceClient = {
  id: string;
  displayName: string | null;
  roles: string[];
  latencyMs: number | null;
  connectedAt: number;
  updatedAt: number;
};

export async function fetchStageClients(): Promise<PresenceClient[]> {
  const res = await fetch("/api/stage/clients");
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as { clients: PresenceClient[] };
  return body.clients;
}

export type LiveDeskSettingsDto = {
  transpositionSemitones: number;
  syncLeadMs: number;
  clientEditEnabled: boolean;
};

export async function fetchLiveDesk(): Promise<LiveDeskSettingsDto> {
  const res = await fetch("/api/live-desk");
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as LiveDeskSettingsDto;
}

export async function patchLiveDesk(
  body: Partial<LiveDeskSettingsDto>,
): Promise<LiveDeskSettingsDto> {
  const res = await fetch("/api/live-desk", {
    method: "PATCH",
    headers: mergeApiHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as LiveDeskSettingsDto;
}

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

export type NetworkInfo = {
  port: number;
  hostname: string;
  lanAddresses: string[];
  urls: string[];
  version: string;
  /** Absolute host data root when reported by the server. */
  dataDir?: string;
  /** When true, host advertises via mDNS — Admin may show `http://{host}.local:{port}`. */
  mdnsEnabled?: boolean;
};

/**
 * Join URL for QR / default copy: first non-loopback LAN IPv4 from the host,
 * else first listed URL (localhost fallback when no LAN).
 */
export function pickPrimaryJoinUrl(info: NetworkInfo): string | null {
  const lan = info.lanAddresses[0];
  if (lan) return `http://${lan}:${info.port}`;
  const nonLoopback = info.urls.find((u) => {
    try {
      const host = new URL(u).hostname.toLowerCase();
      return host !== "localhost" && host !== "127.0.0.1" && host !== "::1";
    } catch {
      return false;
    }
  });
  return nonLoopback ?? info.urls[0] ?? null;
}

/**
 * Read-only mDNS join URL for Admin Host. Fail soft: omit when mDNS is off,
 * hostname unknown/localhost, or field missing — never invent a device name.
 */
export function mdnsJoinUrl(info: NetworkInfo): string | null {
  if (info.mdnsEnabled !== true) return null;
  const host = info.hostname.trim().replace(/\.local\.?$/i, "");
  if (!host || host.toLowerCase() === "localhost" || host === "127.0.0.1") {
    return null;
  }
  return `http://${host}.local:${info.port}`;
}

/** URL list for Admin: LAN / listed URLs plus mDNS row when not already present. */
export function networkDisplayUrls(info: NetworkInfo): string[] {
  const mdns = mdnsJoinUrl(info);
  if (!mdns || info.urls.includes(mdns)) return info.urls;
  const localhostIdx = info.urls.findIndex((u) => {
    try {
      const host = new URL(u).hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "::1";
    } catch {
      return /localhost|127\.0\.0\.1/i.test(u);
    }
  });
  if (localhostIdx < 0) return [...info.urls, mdns];
  return [
    ...info.urls.slice(0, localhostIdx),
    mdns,
    ...info.urls.slice(localhostIdx),
  ];
}

export async function fetchNetworkInfo(): Promise<NetworkInfo> {
  const res = await fetch("/api/system/network", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as NetworkInfo;
}

export type ApkDownloadKind = "performer" | "console";

const APK_FILENAMES: Record<ApkDownloadKind, string> = {
  performer: "stagesync-performer.apk",
  console: "stagesync-console.apk",
};

/** Absolute URL for sideload APK on the current host origin. */
export function apkDownloadUrl(
  origin: string,
  kind: ApkDownloadKind,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/downloads/${APK_FILENAMES[kind]}`;
}

/**
 * Build Performer / Console APK download URLs from a join URL (same host).
 * Returns null when joinUrl cannot be parsed.
 */
export function apkDownloadUrlsFromJoin(
  joinUrl: string,
): { performer: string; console: string } | null {
  try {
    const origin = new URL(joinUrl).origin;
    return {
      performer: apkDownloadUrl(origin, "performer"),
      console: apkDownloadUrl(origin, "console"),
    };
  } catch {
    return null;
  }
}

/**
 * Same-origin URL for APK HEAD probes.
 *
 * Admin often runs on `http://localhost:4000` while QR/join URLs use the LAN IP.
 * Fetching the absolute LAN `/downloads/*.apk` from localhost is cross-origin and
 * fails without CORS — falsely looking like a missing APK. Always probe the path
 * on the page origin; the host serves the same artifact.
 */
export function apkSameOriginProbeUrl(url: string): string {
  try {
    const base =
      typeof window !== "undefined" && window.location?.href
        ? window.location.href
        : "http://127.0.0.1/";
    const parsed = new URL(url, base);
    if (parsed.pathname.startsWith("/downloads/")) {
      return parsed.pathname;
    }
  } catch {
    /* keep input */
  }
  return url;
}

/** HEAD probe — true only when host has a non-empty APK artifact. */
export async function probeApkAvailable(url: string): Promise<boolean> {
  const probeUrl = apkSameOriginProbeUrl(url);
  try {
    const res = await fetch(probeUrl, { method: "HEAD", cache: "no-store" });
    if (res.ok) return true;
    // Some proxies strip HEAD — fall back to ranged GET size check is overkill;
    // treat non-OK as unavailable (honest empty-state).
    return false;
  } catch {
    return false;
  }
}

export type MidiPortInfo = {
  id: string;
  name: string;
  direction: "input" | "output";
};

export type MidiHostStatus = {
  available: boolean;
  backend: "native" | "mock" | "none";
  config: {
    inputId: string | null;
    outputId: string | null;
    clockOutEnabled: boolean;
    /** null = Omni; 0–15 = single channel (API 0-based). */
    inputChannel: number | null;
    /** 0–15 Program Change OUT (API 0-based). */
    outputChannel: number;
  };
  inputs: MidiPortInfo[];
  outputs: MidiPortInfo[];
  rates: {
    clockPerSec: number;
    sppPerSec: number;
    pcPerSec: number;
    beatToWsPerSec: number;
  };
  clockOutActive: boolean;
  lastError: string | null;
};

export async function fetchMidiHostStatus(): Promise<MidiHostStatus> {
  const res = await fetch("/api/midi", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as MidiHostStatus;
}

export async function putMidiHostConfig(body: {
  inputId?: string | null;
  outputId?: string | null;
  clockOutEnabled?: boolean;
  inputChannel?: number | null;
  outputChannel?: number;
}): Promise<MidiHostStatus> {
  const res = await fetch("/api/midi/config", {
    method: "PUT",
    headers: mergeApiHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as MidiHostStatus;
}

export type MidiPanicResult = {
  ok: true;
  sent: boolean;
  channels: number;
  status: MidiHostStatus;
};

/** Host MIDI Panic / MUTE ALL (All Notes Off + Reset Controllers). */
export async function postMidiPanic(): Promise<MidiPanicResult> {
  const res = await fetch("/api/midi/panic", {
    method: "POST",
    headers: { "content-type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as MidiPanicResult;
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
  schema: Record<string, {
    section: string;
    type: string;
    label: string;
    hint: string | null;
    options: string[] | null;
    defaultValue: string | boolean | null;
    pathKind: "dir" | "file" | null;
    restartRequired: boolean;
    secret?: boolean;
  }>;
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
