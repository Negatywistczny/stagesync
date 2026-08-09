/** Open unified song-import wizard from Admin / Desktop menu / Timeline. */

export const SONG_IMPORT_EVENT = "stagesync:song-import";

export type SongImportEventDetail = {
  /** When true, create a new library song. When false/omit, overwrite current draft if available. */
  asNew?: boolean;
};

export function openSongImport(detail: SongImportEventDetail = {}): void {
  window.dispatchEvent(new CustomEvent(SONG_IMPORT_EVENT, { detail }));
}

export function parseSongImportDetail(ev: Event): SongImportEventDetail | null {
  if (!(ev instanceof CustomEvent)) return null;
  const d = ev.detail;
  if (d == null || typeof d !== "object") return {};
  const asNew =
    "asNew" in d && typeof (d as { asNew?: unknown }).asNew === "boolean"
      ? (d as { asNew: boolean }).asNew
      : undefined;
  return asNew === undefined ? {} : { asNew };
}
