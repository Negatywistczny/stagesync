import {
  TransportLoadBodySchema,
  TransportLoopBodySchema,
  TransportPlayBodySchema,
  TransportSeekBodySchema,
  TransportTickMessageSchema,
  type TransportLoopBody,
  type TransportPlayBody,
  type TransportState,
} from "@stagesync/shared";
import { transportStateFromTick } from "../lib/timelineLocator.js";

export type TransportCommandResult = {
  state: TransportState;
  serverTimeMs: number;
};

async function parseTick(res: Response): Promise<TransportCommandResult> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  const msg = TransportTickMessageSchema.parse(await res.json());
  return {
    state: transportStateFromTick(msg),
    serverTimeMs: msg.serverTimeMs,
  };
}

export async function getTransport(): Promise<TransportCommandResult> {
  const res = await fetch("/api/transport");
  return parseTick(res);
}

export async function playTransport(
  body: TransportPlayBody = {},
): Promise<TransportCommandResult> {
  const parsed = TransportPlayBodySchema.parse(body);
  const res = await fetch("/api/transport/play", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(parsed),
  });
  return parseTick(res);
}

export async function loadTransport(
  projectId: string,
): Promise<TransportCommandResult> {
  const body = TransportLoadBodySchema.parse({ projectId });
  const res = await fetch("/api/transport/load", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseTick(res);
}

export async function pauseTransport(): Promise<TransportCommandResult> {
  const res = await fetch("/api/transport/pause", { method: "POST" });
  return parseTick(res);
}

export async function stopTransport(): Promise<TransportCommandResult> {
  const res = await fetch("/api/transport/stop", { method: "POST" });
  return parseTick(res);
}

export async function seekTransport(
  positionTicks: number,
): Promise<TransportCommandResult> {
  const body = TransportSeekBodySchema.parse({ positionTicks });
  const res = await fetch("/api/transport/seek", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseTick(res);
}

export async function setTransportLoop(
  body: TransportLoopBody,
): Promise<TransportCommandResult> {
  const parsed = TransportLoopBodySchema.parse(body);
  const res = await fetch("/api/transport/loop", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(parsed),
  });
  return parseTick(res);
}
