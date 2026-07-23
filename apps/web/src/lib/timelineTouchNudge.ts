/**
 * Tablet nudge bar — move / edge stretch for any selected timeline clip.
 * Semantics ported from v4 `applyClipNudgeMove` / `applyClipNudgeResize`
 * (ticks + existing lane edit helpers; not HTML clone).
 */

import {
  resolveMeterAt,
  ticksPerBar,
  type Project,
  type SnapMode,
} from "@stagesync/shared";
import {
  commitMoveAudioClip,
  commitResizeAudioClip,
} from "./audioLaneEdit.js";
import {
  commitMoveContentClip,
  commitResizeContentClip,
  type ContentLaneId,
} from "./contentLaneEdit.js";
import { commitMoveClip, commitResizeClip } from "./formaEdit.js";
import {
  applyCountdownLengthFromBoundary,
  countdownBars,
  MAX_COUNTDOWN_BARS,
  setCountdownBars,
} from "./formaInspector.js";
import { getSessionSnapMode } from "./timelineGesture.js";
import {
  isAudioSelectionLane,
  type ClipSelectionLane,
} from "./timelineSelection.js";
import { audioTrackIdFromLane } from "./timelineTracks.js";

export type NudgeAction =
  | "move-left"
  | "move-right"
  | "stretch-left-out"
  | "stretch-left-in"
  | "stretch-right-in"
  | "stretch-right-out";

/** One snap-grid unit at `atTicks` (bar / beat / subdivision / off→beat). */
export function nudgeStepTicks(
  project: Project,
  atTicks: number,
  mode: SnapMode = getSessionSnapMode(),
): number {
  const meter = resolveMeterAt(project, Math.max(0, atTicks));
  const beatTicks = Math.max(
    1,
    Math.round((project.ppq * 4) / Math.max(1, meter.denominator)),
  );
  if (mode === "bar") {
    return Math.max(1, ticksPerBar(meter, project.ppq));
  }
  if (mode === "beat" || mode === "off") {
    return beatTicks;
  }
  return Math.max(1, Math.round(beatTicks / mode.parts));
}

function contentLaneOf(lane: ClipSelectionLane): ContentLaneId | null {
  if (lane === "tekst" || lane === "akordy" || lane === "cue") return lane;
  return null;
}

function clipSpan(
  project: Project,
  lane: ClipSelectionLane,
  clipId: string,
): { startTicks: number; lengthTicks: number; kind?: string } | null {
  if (lane === "forma") {
    const c = project.forma.clips.find((x) => x.id === clipId);
    if (!c) return null;
    return {
      startTicks: c.startTicks,
      lengthTicks: c.lengthTicks,
      kind: c.kind,
    };
  }
  const contentLane = contentLaneOf(lane);
  if (contentLane) {
    const clips =
      contentLane === "tekst"
        ? project.tekst.clips
        : contentLane === "akordy"
          ? project.akordy.clips
          : project.cue.clips;
    const c = clips.find((x) => x.id === clipId);
    if (!c) return null;
    return { startTicks: c.startTicks, lengthTicks: c.lengthTicks };
  }
  if (isAudioSelectionLane(lane)) {
    const trackId = audioTrackIdFromLane(lane);
    const c = project.audioClips.find(
      (x) => x.id === clipId && x.trackId === trackId,
    );
    if (!c) return null;
    return { startTicks: c.startTicks, lengthTicks: c.lengthTicks };
  }
  return null;
}

/** Whether left-edge stretch buttons apply (Countdown uses length-only). */
export function nudgeShowsLeftEdge(
  project: Project,
  lane: ClipSelectionLane,
  clipId: string,
): boolean {
  const span = clipSpan(project, lane, clipId);
  if (!span) return false;
  return !(lane === "forma" && span.kind === "countdown");
}

function applyMove(
  project: Project,
  lane: ClipSelectionLane,
  clipId: string,
  dir: -1 | 1,
  mode: SnapMode,
): Project {
  const span = clipSpan(project, lane, clipId);
  if (!span) return project;

  // Forma Countdown: move nudge = length change (v4 body-drag parity).
  if (lane === "forma" && span.kind === "countdown") {
    const clip = project.forma.clips.find((c) => c.id === clipId);
    if (!clip || clip.kind !== "countdown") return project;
    const bars = countdownBars(project, clip);
    const nextBars = Math.max(
      1,
      Math.min(MAX_COUNTDOWN_BARS, bars + dir),
    );
    if (nextBars === bars) return project;
    return setCountdownBars(project, nextBars);
  }

  const step = nudgeStepTicks(project, span.startTicks, mode);
  const newStart = span.startTicks + dir * step;

  if (lane === "forma") {
    return commitMoveClip(project, clipId, newStart, mode);
  }
  const contentLane = contentLaneOf(lane);
  if (contentLane) {
    return commitMoveContentClip(project, contentLane, clipId, newStart, mode);
  }
  // Remaining selection lanes are audio-* (clipSpan already verified the clip).
  return commitMoveAudioClip(
    project,
    audioTrackIdFromLane(lane as Parameters<typeof audioTrackIdFromLane>[0]),
    clipId,
    newStart,
    mode,
  );
}

function applyStretch(
  project: Project,
  lane: ClipSelectionLane,
  clipId: string,
  edge: "start" | "end",
  /** +1 = edge moves later (right); −1 = earlier (left). */
  edgeDir: -1 | 1,
  mode: SnapMode,
): Project {
  const span = clipSpan(project, lane, clipId);
  if (!span) return project;

  if (lane === "forma" && span.kind === "countdown") {
    if (edge !== "end") return project;
    const end = span.startTicks + span.lengthTicks;
    const step = nudgeStepTicks(project, Math.max(0, end), "bar");
    return applyCountdownLengthFromBoundary(project, end + edgeDir * step);
  }

  const step = nudgeStepTicks(
    project,
    edge === "start" ? span.startTicks : span.startTicks + span.lengthTicks,
    mode,
  );
  const edgeTicks =
    edge === "start"
      ? span.startTicks + edgeDir * step
      : span.startTicks + span.lengthTicks + edgeDir * step;

  if (lane === "forma") {
    return commitResizeClip(project, clipId, edge, edgeTicks, mode);
  }
  const contentLane = contentLaneOf(lane);
  if (contentLane) {
    return commitResizeContentClip(
      project,
      contentLane,
      clipId,
      edge,
      edgeTicks,
      mode,
    );
  }
  // Remaining selection lanes are audio-* (clipSpan already verified the clip).
  return commitResizeAudioClip(
    project,
    audioTrackIdFromLane(lane as Parameters<typeof audioTrackIdFromLane>[0]),
    clipId,
    edge,
    edgeTicks,
    mode,
  );
}

/**
 * Apply one nudge action to the primary selected clip.
 *
 * Stretch map (v4):
 * - left-out  → start − step (extend left)
 * - left-in   → start + step (trim left)
 * - right-in  → end − step (trim right)
 * - right-out → end + step (extend right)
 */
export function applyTimelineNudge(
  project: Project,
  lane: ClipSelectionLane,
  clipId: string,
  action: NudgeAction,
  mode: SnapMode = getSessionSnapMode(),
): Project {
  switch (action) {
    case "move-left":
      return applyMove(project, lane, clipId, -1, mode);
    case "move-right":
      return applyMove(project, lane, clipId, 1, mode);
    case "stretch-left-out":
      return applyStretch(project, lane, clipId, "start", -1, mode);
    case "stretch-left-in":
      return applyStretch(project, lane, clipId, "start", 1, mode);
    case "stretch-right-in":
      return applyStretch(project, lane, clipId, "end", -1, mode);
    case "stretch-right-out":
      return applyStretch(project, lane, clipId, "end", 1, mode);
    default:
      return project;
  }
}

/** True when tablet nudge toolbar should show for this selection. */
export function shouldShowTouchNudge(
  tier: "desktop" | "tablet" | "mobile",
  lane: ClipSelectionLane | null,
  clipId: string | null,
  project: Project | null,
): boolean {
  if (tier !== "tablet" || !project || !lane || !clipId) return false;
  return clipSpan(project, lane, clipId) != null;
}
