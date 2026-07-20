/**
 * Timeline Forma/content multi-select helpers (v4 selectedIds / primaryId).
 * Pure — no DOM. Maps keep their own multi-select in TimelineShell.
 */

export type ClipSelectionLane = "forma" | "tekst" | "akordy" | "cue";

export type ClipSelection = {
  lane: ClipSelectionLane | null;
  /** Ordered for stable UI; treat as a set for membership. */
  selectedIds: string[];
  primaryId: string | null;
};

export const EMPTY_CLIP_SELECTION: ClipSelection = {
  lane: null,
  selectedIds: [],
  primaryId: null,
};

/** Tiny drag below this (px) = click empty → clear + locator (v4 finishMarquee). */
export const MARQUEE_CLICK_THRESHOLD_PX = 4;

export type TimedClip = { id: string; startTicks: number };

export function setSelection(
  ids: string[],
  primaryId: string | null,
  lane: ClipSelectionLane,
): ClipSelection {
  const list = ids.filter(Boolean);
  const primary =
    primaryId && list.includes(primaryId)
      ? primaryId
      : list.length
        ? list[list.length - 1]!
        : null;
  return { lane, selectedIds: list, primaryId: primary };
}

export function selectSingle(
  clipId: string,
  lane: ClipSelectionLane,
): ClipSelection {
  return setSelection([clipId], clipId, lane);
}

export function clearSelection(): ClipSelection {
  return EMPTY_CLIP_SELECTION;
}

/**
 * Cmd/Ctrl+click toggle. Cross-lane or empty → replace with single.
 * Same-lane: add/remove; primary follows v4 (last added, or last remaining).
 */
export function toggleSelected(
  current: ClipSelection,
  clipId: string,
  lane: ClipSelectionLane,
): ClipSelection {
  if (!clipId) return current;
  if (current.lane !== lane) {
    return selectSingle(clipId, lane);
  }
  if (current.selectedIds.includes(clipId)) {
    const nextIds = current.selectedIds.filter((id) => id !== clipId);
    if (!nextIds.length) return clearSelection();
    const primary =
      current.primaryId === clipId
        ? nextIds[nextIds.length - 1]!
        : current.primaryId && nextIds.includes(current.primaryId)
          ? current.primaryId
          : nextIds[nextIds.length - 1]!;
    return setSelection(nextIds, primary, lane);
  }
  return setSelection([...current.selectedIds, clipId], clipId, lane);
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
  if (current.lane !== lane || !anchorId) {
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
  return setSelection(
    ordered.slice(lo, hi + 1).map((c) => c.id),
    clipId,
    lane,
  );
}

/** True when every selected id resolves and shares the same lane (caller filters kind). */
export function selectionSameLane(
  selection: ClipSelection,
  lane: ClipSelectionLane,
): boolean {
  return (
    selection.lane === lane &&
    selection.selectedIds.length > 0 &&
    selection.primaryId != null &&
    selection.selectedIds.includes(selection.primaryId)
  );
}

/**
 * Move gesture ids: if primary is in a multi same-lane set → all selectedIds;
 * otherwise just the dragged clip.
 */
export function resolveMoveIds(
  selection: ClipSelection,
  dragClipId: string,
  lane: ClipSelectionLane,
): string[] {
  if (
    selectionSameLane(selection, lane) &&
    selection.selectedIds.includes(dragClipId) &&
    selection.selectedIds.length > 1
  ) {
    return [...selection.selectedIds];
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
 * Hit-test clips against marquee box. Prefer a single lane when hits span lanes
 * (v4 allows mixed kinds but paste/copy require same kind — we keep first lane
 * by primary = last hit in that lane).
 */
export function marqueeSelectFromHits(
  hits: { id: string; lane: ClipSelectionLane }[],
): ClipSelection {
  if (!hits.length) return clearSelection();
  const lane = hits[hits.length - 1]!.lane;
  const ids = hits.filter((h) => h.lane === lane).map((h) => h.id);
  const unique = [...new Set(ids)];
  return setSelection(unique, unique[unique.length - 1]!, lane);
}

export function isMarqueeClick(dxPx: number, dyPx: number): boolean {
  return (
    Math.abs(dxPx) < MARQUEE_CLICK_THRESHOLD_PX &&
    Math.abs(dyPx) < MARQUEE_CLICK_THRESHOLD_PX
  );
}
