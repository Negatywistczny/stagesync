import type { SetlistItem, SetlistView } from "@stagesync/shared";
import { mergeApiHeaders } from "../operatorPin.js";
import { readApiError } from "./readApiError.js";

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
