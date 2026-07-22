/**
 * Session Undo/Redo for Timeline draft (α8).
 * Snapshots only on commit — not on pointermove preview.
 */

import type { Project } from "@stagesync/shared";

const DEFAULT_MAX = 50;

export type DraftHistory = {
  past: Project[];
  present: Project;
  future: Project[];
};

export function createDraftHistory(present: Project): DraftHistory {
  return { past: [], present, future: [] };
}

export function pushDraftHistory(
  history: DraftHistory,
  next: Project,
  maxDepth: number = DEFAULT_MAX,
): DraftHistory {
  if (next === history.present) return history;
  const past = [...history.past, history.present];
  while (past.length > maxDepth) past.shift();
  return { past, present: next, future: [] };
}

export function canUndo(history: DraftHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: DraftHistory): boolean {
  return history.future.length > 0;
}

export function undoDraft(
  history: DraftHistory,
  maxDepth: number = DEFAULT_MAX,
): DraftHistory {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1]!;
  const future = [history.present, ...history.future];
  while (future.length > maxDepth) future.pop();
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future,
  };
}

export function redoDraft(
  history: DraftHistory,
  maxDepth: number = DEFAULT_MAX,
): DraftHistory {
  if (history.future.length === 0) return history;
  const next = history.future[0]!;
  const past = [...history.past, history.present];
  while (past.length > maxDepth) past.shift();
  return {
    past,
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
 * keep Undo/Redo stacks but align present to saved server snapshot.
 */
export function syncPresentAfterSave(
  history: DraftHistory,
  saved: Project,
): DraftHistory {
  return { ...history, present: saved };
}
