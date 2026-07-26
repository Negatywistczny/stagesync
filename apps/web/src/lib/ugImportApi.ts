import {
  UgFetchBodySchema,
  UgFetchResponseSchema,
  UgSearchBodySchema,
  UgSearchResponseSchema,
  type UgFetchResponse,
  type UgSearchResponse,
} from "@stagesync/shared";
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

/** POST /api/import/ultimate-guitar — fetch + clean tab content via host. */
export async function fetchUgTabFromServer(
  url: string,
): Promise<UgFetchResponse> {
  const body = UgFetchBodySchema.parse({ url });
  const res = await fetch("/api/import/ultimate-guitar", {
    method: "POST",
    headers: mergeApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return UgFetchResponseSchema.parse(await res.json());
}

/** POST /api/import/ultimate-guitar/search */
export async function searchUgTabs(
  title: string,
  artist?: string,
): Promise<UgSearchResponse> {
  const body = UgSearchBodySchema.parse({
    title,
    ...(artist?.trim() ? { artist: artist.trim() } : {}),
  });
  const res = await fetch("/api/import/ultimate-guitar/search", {
    method: "POST",
    headers: mergeApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return UgSearchResponseSchema.parse(await res.json());
}
