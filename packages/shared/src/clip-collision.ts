/**
 * No-overlap clip geometry for Timeline lanes ([ADR 0008](../../docs/adr/0008-timeline-clip-editing.md)).
 *
 * Pure functions — no DOM / clock. Countdown clips are immutable.
 * Section (content) clips never start before `contentFloorTicks` (default 0).
 */

import type { FormaClip } from "./schema.js";

export type ClipEdge = "start" | "end";

export type CollisionOpts = {
  /** Floor for non-countdown startTicks (default 0 — end of Countdown / song start). */
  contentFloorTicks?: number;
  /** Minimum positive length after resize (default 1). */
  minLengthTicks?: number;
};

function contentFloor(opts?: CollisionOpts): number {
  return opts?.contentFloorTicks ?? 0;
}

function minLength(opts?: CollisionOpts): number {
  return opts?.minLengthTicks ?? 1;
}

function clipEnd(clip: Pick<FormaClip, "startTicks" | "lengthTicks">): number {
  return clip.startTicks + clip.lengthTicks;
}

function isCountdown(clip: FormaClip): boolean {
  return clip.kind === "countdown";
}

/** Drop subsection offsets at/after lengthTicks (after resize / overwrite). */
export function clampFormaSubsections(clip: FormaClip): FormaClip {
  const subs = clip.subsections;
  if (!subs?.length) return clip;
  const next = subs.filter((s) => s > 0 && s < clip.lengthTicks);
  if (next.length === subs.length) return clip;
  if (next.length === 0) {
    const { subsections: _drop, ...rest } = clip;
    void _drop;
    return rest;
  }
  return { ...clip, subsections: next };
}

function sortClips(clips: FormaClip[]): FormaClip[] {
  return [...clips].sort((a, b) => a.startTicks - b.startTicks);
}

/**
 * Place `placed` into the lane: trim/split overlapping non-countdown neighbors.
 * Countdown is never modified. `placed` replaces any prior clip with the same id.
 */
export function placeClipNoOverlap(
  clips: FormaClip[],
  placed: FormaClip,
): FormaClip[] {
  const start = placed.startTicks;
  const end = clipEnd(placed);
  if (placed.lengthTicks < 1 || end <= start) {
    return clips;
  }

  const kept: FormaClip[] = [];
  for (const clip of clips) {
    if (clip.id === placed.id) continue;
    if (isCountdown(clip)) {
      kept.push(clip);
      continue;
    }

    const cEnd = clipEnd(clip);
    if (cEnd <= start || clip.startTicks >= end) {
      kept.push(clip);
      continue;
    }

    const keepLeft = clip.startTicks < start;
    const keepRight = cEnd > end;

    if (keepLeft) {
      kept.push(
        clampFormaSubsections({
          ...clip,
          lengthTicks: start - clip.startTicks,
        }),
      );
    }

    if (keepRight) {
      const offset = end - clip.startTicks;
      const remapped = (clip.subsections ?? [])
        .map((s) => s - offset)
        .filter((s) => s > 0);
      kept.push(
        clampFormaSubsections({
          ...clip,
          // Split: left keeps id; right gets a fresh suffix. Trim-from-left: same id.
          id: keepLeft ? `${clip.id}-r` : clip.id,
          startTicks: end,
          lengthTicks: cEnd - end,
          subsections: remapped.length ? remapped : undefined,
        }),
      );
    }
  }

  return sortClips([...kept, clampFormaSubsections(placed)]);
}

/**
 * Delete a clip by id. Countdown is rejected (unchanged list). Gaps remain.
 */
export function deleteClip(clips: FormaClip[], id: string): FormaClip[] {
  const target = clips.find((c) => c.id === id);
  if (!target || isCountdown(target)) return clips;
  return clips.filter((c) => c.id !== id);
}

/**
 * Move clip to `newStartTicks` (length preserved). Auto-trims neighbors.
 * Countdown → no-op. Section start clamped to content floor.
 */
export function moveClipNoOverlap(
  clips: FormaClip[],
  id: string,
  newStartTicks: number,
  opts?: CollisionOpts,
): FormaClip[] {
  const target = clips.find((c) => c.id === id);
  if (!target || isCountdown(target)) return clips;

  const floor = contentFloor(opts);
  let start = Math.max(floor, Math.trunc(newStartTicks));
  if (!Number.isFinite(start)) return clips;

  const placed: FormaClip = {
    ...target,
    startTicks: start,
    lengthTicks: target.lengthTicks,
  };

  // Reject intrusion into countdown span (beyond floor clamp).
  const countdown = clips.find(isCountdown);
  if (countdown) {
    const cdEnd = clipEnd(countdown);
    if (placed.startTicks < cdEnd && clipEnd(placed) > countdown.startTicks) {
      start = Math.max(floor, cdEnd);
      placed.startTicks = start;
    }
  }

  return placeClipNoOverlap(clips, placed);
}

/**
 * TE-23: after moving the first post-Countdown section to the right, fill the
 * empty span (Countdown end → section start) with a new "Intro" section.
 * No-op when gap is missing / too small / moved clip is not first section.
 */
export function insertGapSectionAfterCountdown(
  clips: FormaClip[],
  movedId: string,
  opts?: CollisionOpts,
): FormaClip[] {
  const countdown = clips.find(isCountdown);
  if (!countdown) return clips;
  const cdEnd = clipEnd(countdown);
  const sections = sortClips(clips.filter((c) => !isCountdown(c)));
  const first = sections[0];
  if (!first || first.id !== movedId) return clips;
  if (first.startTicks <= cdEnd) return clips;

  const gapLen = first.startTicks - cdEnd;
  if (gapLen < minLength(opts)) return clips;

  // Avoid duplicate if a section already occupies the gap start.
  if (sections.some((c) => c.startTicks === cdEnd)) return clips;

  const gap: FormaClip = {
    id: `forma-gap-${cdEnd}-${gapLen}`,
    name: "Intro",
    kind: "section",
    startTicks: cdEnd,
    lengthTicks: gapLen,
  };
  return sortClips([...clips, gap]);
}

/**
 * Rigid multi-move (v4 moveIds + same Δ): translate selected clips together,
 * then place into non-selected neighbors (cover-trim). Movers do not trim each other.
 * Countdown ids in `moveIds` are ignored.
 */
export function moveClipsRigidDelta(
  clips: FormaClip[],
  moveIds: string[],
  deltaTicks: number,
  opts?: CollisionOpts,
): FormaClip[] {
  const idSet = new Set(moveIds.filter(Boolean));
  if (!idSet.size || !Number.isFinite(deltaTicks) || deltaTicks === 0) {
    return clips;
  }
  const floor = contentFloor(opts);
  const delta = Math.trunc(deltaTicks);

  const movers: FormaClip[] = [];
  const nonMovers: FormaClip[] = [];
  for (const clip of clips) {
    if (!idSet.has(clip.id) || isCountdown(clip)) {
      nonMovers.push(clip);
      continue;
    }
    movers.push({
      ...clip,
      startTicks: Math.max(floor, clip.startTicks + delta),
    });
  }
  if (!movers.length) return clips;

  let result = nonMovers;
  for (const m of sortClips(movers)) {
    const countdown = result.find(isCountdown);
    let placed = m;
    if (countdown) {
      const cdEnd = clipEnd(countdown);
      if (placed.startTicks < cdEnd && clipEnd(placed) > countdown.startTicks) {
        placed = { ...placed, startTicks: Math.max(floor, cdEnd) };
      }
    }
    result = placeClipNoOverlap(result, placed);
  }
  return sortClips(result);
}

/**
 * Move a section and all later sections by the same Δ (v4 TE-24 cascade).
 * Countdown never moves. Empty / unknown id → no-op.
 */
export function moveSectionsFromId(
  clips: FormaClip[],
  id: string,
  newStartTicks: number,
  opts?: CollisionOpts,
): FormaClip[] {
  const target = clips.find((c) => c.id === id);
  if (!target || isCountdown(target)) return clips;

  const floor = contentFloor(opts);
  const desired = Math.max(floor, Math.trunc(newStartTicks));
  if (!Number.isFinite(desired)) return clips;
  const delta = desired - target.startTicks;
  if (delta === 0) return clips;

  const moveIds = clips
    .filter((c) => !isCountdown(c) && c.startTicks >= target.startTicks)
    .map((c) => c.id);
  return moveClipsRigidDelta(clips, moveIds, delta, opts);
}

/**
 * Resize clip edge to `newEdgeTicks`. Auto-trims neighbors at contact.
 * Countdown → no-op. Start edge clamped to content floor; min length enforced.
 */
export function resizeClipNoOverlap(
  clips: FormaClip[],
  id: string,
  edge: ClipEdge,
  newEdgeTicks: number,
  opts?: CollisionOpts,
): FormaClip[] {
  const target = clips.find((c) => c.id === id);
  if (!target || isCountdown(target)) return clips;

  const floor = contentFloor(opts);
  const minLen = minLength(opts);
  const edgeTicks = Math.trunc(newEdgeTicks);
  if (!Number.isFinite(edgeTicks)) return clips;

  let start = target.startTicks;
  let end = clipEnd(target);

  if (edge === "start") {
    start = Math.max(floor, edgeTicks);
    if (end - start < minLen) {
      start = end - minLen;
      if (start < floor) return clips;
    }
  } else {
    end = edgeTicks;
    if (end - start < minLen) {
      end = start + minLen;
    }
  }

  const countdown = clips.find(isCountdown);
  if (countdown) {
    const cdEnd = clipEnd(countdown);
    if (start < cdEnd && end > countdown.startTicks) {
      if (edge === "start") {
        start = Math.max(floor, cdEnd);
        if (end - start < minLen) return clips;
      } else {
        end = Math.min(end, countdown.startTicks);
        if (end - start < minLen) return clips;
      }
    }
  }

  const placed: FormaClip = {
    ...target,
    startTicks: start,
    lengthTicks: end - start,
  };
  if (placed.lengthTicks < minLen) return clips;

  return placeClipNoOverlap(clips, placed);
}

/**
 * Insert / overwrite a span with `newClip` (pencil path). Countdown protected.
 * `newClip.startTicks` clamped to content floor; overlapping sections trimmed/split.
 */
export function insertSpanOverwrite(
  clips: FormaClip[],
  newClip: FormaClip,
  opts?: CollisionOpts,
): FormaClip[] {
  if (isCountdown(newClip)) return clips;

  const floor = contentFloor(opts);
  const start = Math.max(floor, newClip.startTicks);
  const length = newClip.lengthTicks;
  if (length < 1) return clips;

  const countdown = clips.find(isCountdown);
  if (countdown) {
    const cdEnd = clipEnd(countdown);
    const end = start + length;
    if (start < cdEnd && end > countdown.startTicks) {
      return clips;
    }
  }

  const placed: FormaClip = {
    ...newClip,
    kind: "section",
    startTicks: start,
    lengthTicks: length,
  };
  return placeClipNoOverlap(clips, placed);
}

export type SplitClipOpts = CollisionOpts & {
  /** Id for the right half (default `${id}-r`). */
  rightId?: string;
};

/**
 * Split section clip `id` at `atTicks` (exclusive left / inclusive right start).
 * Rejects countdown, edges that would yield length &lt; minLength, and hits outside clip.
 */
export function splitClipAt(
  clips: FormaClip[],
  id: string,
  atTicks: number,
  opts?: SplitClipOpts,
): FormaClip[] {
  const target = clips.find((c) => c.id === id);
  if (!target || isCountdown(target)) return clips;

  const minLen = minLength(opts);
  const at = Math.trunc(atTicks);
  if (!Number.isFinite(at)) return clips;

  const end = clipEnd(target);
  if (at <= target.startTicks || at >= end) return clips;

  const leftLen = at - target.startTicks;
  const rightLen = end - at;
  if (leftLen < minLen || rightLen < minLen) return clips;

  const left: FormaClip = {
    ...target,
    lengthTicks: leftLen,
  };
  const right: FormaClip = {
    ...target,
    id: opts?.rightId ?? `${target.id}-r`,
    startTicks: at,
    lengthTicks: rightLen,
  };

  const without = clips.filter((c) => c.id !== id);
  return sortClips([...without, left, right]);
}
