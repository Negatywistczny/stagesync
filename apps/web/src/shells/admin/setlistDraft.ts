import {
  SETLIST_SONG_DURATION_ESTIMATE_MS,
  type LibraryProjectEntry,
  type SetlistItem,
  type SetlistView,
} from "@stagesync/shared";

export type DraftItem =
  | { type: "project"; projectId: string }
  | {
      type: "break";
      id: string;
      label: string;
      durationMinutes: number;
    };

export function newBreakId(): string {
  return crypto.randomUUID();
}

export function viewItemsToDraft(view: SetlistView): DraftItem[] {
  return view.items.map((item) =>
    item.type === "break"
      ? {
          type: "break" as const,
          id: item.id,
          label: item.label,
          durationMinutes: item.durationMinutes,
        }
      : { type: "project" as const, projectId: item.projectId },
  );
}

export function draftToSetlistItems(draft: DraftItem[]): SetlistItem[] {
  return draft.map((item) =>
    item.type === "break"
      ? {
          type: "break" as const,
          id: item.id,
          label: item.label,
          durationMinutes: item.durationMinutes,
        }
      : { type: "project" as const, projectId: item.projectId },
  );
}

export function projectDurationMs(
  entry: LibraryProjectEntry | undefined,
): number {
  if (entry?.durationMs != null && entry.durationMs > 0) {
    return entry.durationMs;
  }
  return SETLIST_SONG_DURATION_ESTIMATE_MS;
}

export function estimateTotalMs(
  draft: DraftItem[],
  byId: Map<string, LibraryProjectEntry>,
): number {
  let ms = 0;
  for (const item of draft) {
    if (item.type === "break") {
      ms += item.durationMinutes * 60 * 1000;
    } else {
      ms += projectDurationMs(byId.get(item.projectId));
    }
  }
  return ms;
}
