/**
 * Pure score ↔ transport wiring for OSMD Client pane (testable without OSMD DOM).
 */

import {
  songBarToScoreBar,
  ticksFromScoreBar,
  type Project,
} from "@stagesync/shared";
import { logicBarFromTicks } from "./scoreBarEdit.js";

export const SCORE_ZOOM_MIN = 50;
export const SCORE_ZOOM_MAX = 200;
export const SCORE_ZOOM_STEP = 10;
export const SCORE_ZOOM_DEFAULT = 100;

/** Transport ticks → MusicXML measure (1-based). */
export function scoreBarFromDisplayTicks(
  project: Project,
  displayTicks: number,
): number {
  const logicBar = logicBarFromTicks(project, displayTicks);
  return Math.max(1, songBarToScoreBar(logicBar, project.scoreBarMap));
}

/** Clicked MusicXML measure → seek ticks (near current playhead for repeats). */
export function seekTicksFromScoreBar(
  project: Project,
  scoreBar: number,
  displayTicks: number,
): number {
  const nearSongBar = logicBarFromTicks(project, displayTicks);
  return ticksFromScoreBar(project, scoreBar, { nearSongBar });
}

export function clampScoreZoom(percent: number): number {
  if (!Number.isFinite(percent)) return SCORE_ZOOM_DEFAULT;
  return Math.max(
    SCORE_ZOOM_MIN,
    Math.min(SCORE_ZOOM_MAX, Math.round(percent)),
  );
}
