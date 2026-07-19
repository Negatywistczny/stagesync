import {
  TransportStateSchema,
  type TransportPlayBody,
  type TransportState,
} from "@stagesync/shared";

async function parseState(res: Response): Promise<TransportState> {
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
  return TransportStateSchema.parse(await res.json());
}

export async function getTransport(): Promise<TransportState> {
  const res = await fetch("/api/transport");
  return parseState(res);
}

export async function playTransport(
  body: TransportPlayBody = {},
): Promise<TransportState> {
  const res = await fetch("/api/transport/play", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseState(res);
}

export async function pauseTransport(): Promise<TransportState> {
  const res = await fetch("/api/transport/pause", { method: "POST" });
  return parseState(res);
}

export async function seekTransport(
  positionTicks: number,
): Promise<TransportState> {
  const res = await fetch("/api/transport/seek", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ positionTicks }),
  });
  return parseState(res);
}
