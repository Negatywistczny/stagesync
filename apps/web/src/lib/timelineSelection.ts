/**
 * Timeline Forma/content/audio multi-select helpers (v4 selectedIds / primaryId).
 * Pure — no DOM. Maps keep their own multi-select in TimelineShell.
 * Selection may span lanes (v4 marquee / Cmd+click); move/copy stay same-lane.
 */

import type { AudioLaneId } from "./timelineTracks.js";
import { isAudioLaneId } from "./timelineTracks.js";

export type ClipSelectionLane =
  | "forma"
  | "tekst"
  | "akordy"
  | "cue"
  | AudioLaneId;

export function isAudioSelectionLane(
  lane: ClipSelectionLane | null | undefined,
): lane is AudioLaneId {
  return lane != null && isAudioLaneId(lane);
}

export type SelectedClip = {
  id: string;
  lane: ClipSelectionLane;
};

export type ClipSelection = {
  items: SelectedClip[];
  primaryId: string | null;
};

export const EMPTY_CLIP_SELECTION: ClipSelection = {
  items: [],
  primaryId: null,
};

/** Tiny drag below this (px) = click empty → clear + locator (v4 finishMarquee). */
export const MARQUEE_CLICK_THRESHOLD_PX = 4;

export type TimedClip = { id: string; startTicks: number };

export function selectedIds(sel: ClipSelection): string[] {
  return sel.items.map((i) => i.id);
}

export function primaryLane(sel: ClipSelection): ClipSelectionLane | null {
  if (!sel.items.length) return null;
  const primary = sel.primaryId
    ? sel.items.find((i) => i.id === sel.primaryId)
    : null;
  return primary?.lane ?? sel.items[sel.items.length - 1]!.lane;
}

export function isClipSelected(
  sel: ClipSelection,
  id: string,
  lane: ClipSelectionLane,
): boolean {
  return sel.items.some((i) => i.id === id && i.lane === lane);
}

export function idsOnLane(
  sel: ClipSelection,
  lane: ClipSelectionLane,
): string[] {
  return sel.items.filter((i) => i.lane === lane).map((i) => i.id);
}

export function setSelection(
  items: SelectedClip[],
  primaryId: string | null,
): ClipSelection {
  const list: SelectedClip[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (!it.id || !it.lane) continue;
    const key = `${it.lane}:${it.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push({ id: it.id, lane: it.lane });
    if (list.length >= 256) break;
  }
  const primary =
    primaryId && list.some((i) => i.id === primaryId)
      ? primaryId
      : list.length
        ? list[list.length - 1]!.id
        : null;
  return { items: list, primaryId: primary };
}

export function selectSingle(
  clipId: string,
  lane: ClipSelectionLane,
): ClipSelection {
  return setSelection([{ id: clipId, lane }], clipId);
}

export function clearSelection(): ClipSelection {
  return EMPTY_CLIP_SELECTION;
}

/**
 * Cmd/Ctrl+click toggle. Cross-lane adds (v4 selectedIds Set); same id+lane removes.
 */
export function toggleSelected(
  current: ClipSelection,
  clipId: string,
  lane: ClipSelectionLane,
): ClipSelection {
  if (!clipId) return current;
  if (isClipSelected(current, clipId, lane)) {
    const nextItems = current.items.filter(
      (i) => !(i.id === clipId && i.lane === lane),
    );
    if (!nextItems.length) return clearSelection();
    const primary =
      current.primaryId === clipId
        ? nextItems[nextItems.length - 1]!.id
        : current.primaryId && nextItems.some((i) => i.id === current.primaryId)
          ? current.primaryId
          : nextItems[nextItems.length - 1]!.id;
    return setSelection(nextItems, primary);
  }
  return setSelection(
    [...current.items, { id: clipId, lane }],
    clipId,
  );
}

/**
 * Shift+click range on the same lane, ordered by startTicks then id (layout order).
 * Different lane / no anchor → selectSingle.
 */
export function selectRangeTo(
  current: ClipSelection,
  clipId: string,
  lane: ClipSelectionLane,
  laneClips: TimedClip[],
): ClipSelection {
  const target = laneClips.find((c) => c.id === clipId);
  if (!target) return selectSingle(clipId, lane);

  const anchorId = current.primaryId;
  const anchorLane = primaryLane(current);
  if (anchorLane !== lane || !anchorId) {
    return selectSingle(clipId, lane);
  }
  const ordered = [...laneClips].sort(
    (a, b) =>
      a.startTicks - b.startTicks || String(a.id).localeCompare(String(b.id)),
  );
  const i0 = ordered.findIndex((c) => c.id === anchorId);
  const i1 = ordered.findIndex((c) => c.id === clipId);
  if (i0 < 0 || i1 < 0) return selectSingle(clipId, lane);
  const lo = Math.min(i0, i1);
  const hi = Math.max(i0, i1);
  const rangeItems = ordered
    .slice(lo, hi + 1)
    .map((c) => ({ id: c.id, lane }));
  // Keep other-lane selections; replace this lane's range membership.
  const other = current.items.filter((i) => i.lane !== lane);
  return setSelection([...other, ...rangeItems], clipId);
}

/** True when every selected id on `lane` matches and primary is on that lane. */
export function selectionSameLane(
  selection: ClipSelection,
  lane: ClipSelectionLane,
): boolean {
  const onLane = idsOnLane(selection, lane);
  return (
    onLane.length > 0 &&
    selection.primaryId != null &&
    onLane.includes(selection.primaryId) &&
    primaryLane(selection) === lane
  );
}

/**
 * Move gesture ids: selected clips on the drag lane (multi); otherwise just the dragged clip.
 * Cross-lane selection does not pull other lanes into the move (same Δ per lane would need separate commits).
 */
export function resolveMoveIds(
  selection: ClipSelection,
  dragClipId: string,
  lane: ClipSelectionLane,
): string[] {
  const onLane = idsOnLane(selection, lane);
  if (onLane.includes(dragClipId) && onLane.length > 1) {
    return [...onLane];
  }
  return [dragClipId];
}

export function isMultiSelectClick(e: {
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}): boolean {
  return Boolean(e.metaKey || e.ctrlKey) && !e.altKey;
}

export type DomRectLike = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export function rectsIntersect(a: DomRectLike, b: DomRectLike): boolean {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

/**
 * Hit-test clips against marquee box — keep all lanes (v4 finishMarquee).
 */
export function marqueeSelectFromHits(
  hits: { id: string; lane: ClipSelectionLane }[],
): ClipSelection {
  if (!hits.length) return clearSelection();
  const items = hits.map((h) => ({ id: h.id, lane: h.lane }));
  const last = hits[hits.length - 1]!;
  return setSelection(items, last.id);
}

export function isMarqueeClick(dxPx: number, dyPx: number): boolean {
  return (
    Math.abs(dxPx) < MARQUEE_CLICK_THRESHOLD_PX &&
    Math.abs(dyPx) < MARQUEE_CLICK_THRESHOLD_PX
  );
}
