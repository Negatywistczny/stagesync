import {
  UltrastarAccountPutBodySchema,
  UltrastarAccountPutResponseSchema,
  UltrastarAccountStatusSchema,
  UltrastarAccountTestBodySchema,
  UltrastarAccountTestResponseSchema,
  UltrastarFetchBodySchema,
  UltrastarFetchResponseSchema,
  UltrastarSearchBodySchema,
  UltrastarSearchResponseSchema,
  type UltrastarAccountPutResponse,
  type UltrastarAccountStatus,
  type UltrastarAccountTestResponse,
  type UltrastarFetchResponse,
  type UltrastarSearchResponse,
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

/** GET /api/import/ultrastar/account */
export async function fetchUltrastarAccount(): Promise<UltrastarAccountStatus> {
  const res = await fetch("/api/import/ultrastar/account", {
    cache: "no-store",
    headers: mergeApiHeaders(),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return UltrastarAccountStatusSchema.parse(await res.json());
}

/** PUT /api/import/ultrastar/account */
export async function putUltrastarAccount(
  user: string,
  pass?: string,
): Promise<UltrastarAccountPutResponse> {
  const body = UltrastarAccountPutBodySchema.parse({
    user,
    ...(pass !== undefined ? { pass } : {}),
  });
  const res = await fetch("/api/import/ultrastar/account", {
    method: "PUT",
    headers: mergeApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return UltrastarAccountPutResponseSchema.parse(await res.json());
}

/** POST /api/import/ultrastar/account/test */
export async function testUltrastarAccount(
  user?: string,
  pass?: string,
): Promise<UltrastarAccountTestResponse> {
  const body = UltrastarAccountTestBodySchema.parse({
    ...(user !== undefined ? { user } : {}),
    ...(pass !== undefined ? { pass } : {}),
  });
  const res = await fetch("/api/import/ultrastar/account/test", {
    method: "POST",
    headers: mergeApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return UltrastarAccountTestResponseSchema.parse(await res.json());
}

/** POST /api/import/ultrastar — fetch UltraStar .txt via host (USDB). */
export async function fetchUltrastarFromServer(
  url: string,
): Promise<UltrastarFetchResponse> {
  const body = UltrastarFetchBodySchema.parse({ url });
  const res = await fetch("/api/import/ultrastar", {
    method: "POST",
    headers: mergeApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return UltrastarFetchResponseSchema.parse(await res.json());
}

/** POST /api/import/ultrastar/search */
export async function searchUltrastarSongs(
  title: string,
  artist?: string,
): Promise<UltrastarSearchResponse> {
  const body = UltrastarSearchBodySchema.parse({
    title,
    ...(artist?.trim() ? { artist: artist.trim() } : {}),
  });
  const res = await fetch("/api/import/ultrastar/search", {
    method: "POST",
    headers: mergeApiHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await readApiError(res));
  }
  return UltrastarSearchResponseSchema.parse(await res.json());
}
