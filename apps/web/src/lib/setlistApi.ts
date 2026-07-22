import type { SetlistItem, SetlistView } from "@stagesync/shared";

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
    headers: { "content-type": "application/json" },
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
    headers: { "content-type": "application/json" },
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
    headers: { "content-type": "application/json" },
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
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  const body = (await res.json()) as { messages: SessionStageMessage[] };
  return body.messages;
}

export async function clearStageMessages(): Promise<void> {
  const res = await fetch("/api/stage/messages", { method: "DELETE" });
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
    headers: { "content-type": "application/json" },
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
  const res = await fetch("/api/system/logs/clear", { method: "POST" });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}

/** Download diagnostics ZIP (logs + meta). Uses host token on LAN. */
export async function downloadDiagnosticsExport(): Promise<void> {
  const res = await fetch("/api/system/diagnostics/export", {
    cache: "no-store",
    headers: hostLifecycleHeaders(),
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

export async function fetchNetworkInfo(): Promise<NetworkInfo> {
  const res = await fetch("/api/system/network", { cache: "no-store" });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return (await res.json()) as NetworkInfo;
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
}): Promise<MidiHostStatus> {
  const res = await fetch("/api/midi/config", {
    method: "PUT",
    headers: { "content-type": "application/json" },
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


export type ServerSettingsValues = {
  PORT: string;
  STAGESYNC_BIND_HOST: string;
  STAGESYNC_DISABLE_MDNS: boolean;
  LOG_LEVEL: string;
  STAGESYNC_DISABLE_AUTO_UPDATE: boolean;
  STAGESYNC_UPDATE_CHANNEL: string;
  STAGESYNC_DATA_DIR: string;
  STAGESYNC_BACKUPS_DIR: string;
  STAGESYNC_ASSETS_DIR: string;
  [key: string]: string | boolean;
};

export type ServerSettingsResponse = {
  values: ServerSettingsValues;
  envExists: boolean;
  schema: Record<string, {
    section: string;
    type: string;
    label: string;
    hint: string | null;
    options: string[] | null;
    defaultValue: string | boolean | null;
    pathKind: "dir" | "file" | null;
    restartRequired: boolean;
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
    headers: {
      "content-type": "application/json",
      ...hostLifecycleHeaders(),
    },
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

export type HostUpdateStatus = {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  error?: string | null;
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ target: "host" }),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
}
