/**
 * Session Undo/Redo for Timeline draft (α8).
 * Snapshots only on commit — not on pointermove preview.
 * Each entry keeps clip selection (TE-26 / v4 selectionSnapshot).
 */

import type { Project } from "@stagesync/shared";
import {
  EMPTY_CLIP_SELECTION,
  type ClipSelection,
} from "./timelineSelection.js";

const DEFAULT_MAX = 50;

export type DraftHistoryEntry = {
  project: Project;
  clipSelection: ClipSelection;
};

export type DraftHistory = {
  past: DraftHistoryEntry[];
  present: DraftHistoryEntry;
  future: DraftHistoryEntry[];
};

export function createDraftHistory(
  present: Project,
  clipSelection: ClipSelection = EMPTY_CLIP_SELECTION,
): DraftHistory {
  return {
    past: [],
    present: { project: present, clipSelection },
    future: [],
  };
}

export function pushDraftHistory(
  history: DraftHistory,
  next: Project,
  clipSelection: ClipSelection = EMPTY_CLIP_SELECTION,
  maxDepth: number = DEFAULT_MAX,
): DraftHistory {
  if (next === history.present.project) return history;
  const past = [...history.past, history.present];
  while (past.length > maxDepth) past.shift();
  return {
    past,
    present: { project: next, clipSelection },
    future: [],
  };
}

export function canUndo(history: DraftHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: DraftHistory): boolean {
  return history.future.length > 0;
}

export function undoDraft(history: DraftHistory): DraftHistory {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1]!;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoDraft(history: DraftHistory): DraftHistory {
  if (history.future.length === 0) return history;
  const next = history.future[0]!;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

/** After Discard — clear stacks; present = saved snapshot. */
export function resetDraftHistory(saved: Project): DraftHistory {
  return createDraftHistory(saved);
}

/**
 * After Save — dirty cleared by caller via saved===draft;
 * keep Undo/Redo stacks but align present project to saved server snapshot.
 */
export function syncPresentAfterSave(
  history: DraftHistory,
  saved: Project,
): DraftHistory {
  return {
    ...history,
    present: { ...history.present, project: saved },
  };
}
