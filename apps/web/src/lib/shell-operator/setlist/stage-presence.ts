import { mergeApiHeaders } from "../operatorPin.js";
import { readApiError } from "./readApiError.js";

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
