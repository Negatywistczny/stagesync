import type { SetlistView } from "@stagesync/shared";

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
  projectIds: string[];
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
}): Promise<void> {
  const res = await fetch("/api/stage/message", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
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
