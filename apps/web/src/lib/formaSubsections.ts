/**
 * Forma subsection ranges — v4 ChordPhrases port (ticks, relative offsets).
 * Storage: interior boundaries as offsets from clip.startTicks (exclude 0 / length).
 */

import {
  resolveMeterAt,
  ticksPerBar,
  type FormaClip,
  type Project,
} from "@stagesync/shared";

export type SubsectionRange = {
  /** 0-based band index within the clip. */
  index: number;
  /** Offset from clip.startTicks. */
  startRel: number;
  lengthRel: number;
};

/** 4 musical bars in ticks at `atTicks` (meterMap-aware). */
export function subsectionMaxChunkTicks(
  project: Project,
  atTicks: number,
): number {
  const meter = resolveMeterAt(project, atTicks);
  return 4 * ticksPerBar(meter, project.ppq);
}

/** Sorted unique interior offsets in (0, lengthTicks). Cap at 64. */
export function normalizeSubsectionOffsets(
  offsets: readonly number[],
  lengthTicks: number,
): number[] {
  const len = Math.max(1, Math.floor(lengthTicks));
  return [
    ...new Set(
      offsets
        .map((t) => Math.round(Number(t)))
        .filter((t) => Number.isFinite(t) && t > 0 && t < len),
    ),
  ]
    .sort((a, b) => a - b)
    .slice(0, 64);
}

/** Band ranges covering [0, lengthTicks), including implicit start at 0. */
export function subsectionRanges(
  offsets: readonly number[] | undefined,
  lengthTicks: number,
): SubsectionRange[] {
  const len = Math.max(1, Math.floor(lengthTicks));
  const starts = [0, ...normalizeSubsectionOffsets(offsets ?? [], len)];
  const out: SubsectionRange[] = [];
  for (let i = 0; i < starts.length; i++) {
    const startRel = starts[i]!;
    const endRel = i + 1 < starts.length ? starts[i + 1]! : len;
    out.push({
      index: i,
      startRel,
      lengthRel: Math.max(1, endRel - startRel),
    });
  }
  return out;
}

function interior4BarStartsFromLeft(
  spanStart: number,
  spanEnd: number,
  maxChunk: number,
): number[] {
  const chunk = Math.max(1, Math.floor(maxChunk));
  const out: number[] = [];
  for (let t = spanStart + chunk; t < spanEnd; t += chunk) {
    out.push(t);
    if (out.length >= 64) break;
  }
  return out;
}

function interior4BarStartsFromRight(
  spanStart: number,
  spanEnd: number,
  maxChunk: number,
): number[] {
  const chunk = Math.max(1, Math.floor(maxChunk));
  const out: number[] = [];
  for (let t = spanEnd - chunk; t > spanStart; t -= chunk) {
    out.push(t);
    if (out.length >= 64) break;
  }
  return out.sort((a, b) => a - b);
}

/**
 * Ensure no subsection span exceeds `maxChunk` — fill missing splits from the left
 * (v4 `fill4BarGapsFromLeft`).
 */
export function fill4BarGapsFromLeft(
  offsets: readonly number[],
  lengthTicks: number,
  maxChunk: number,
): number[] {
  const ranges = subsectionRanges(offsets, lengthTicks);
  const all = new Set<number>();
  for (const range of ranges) {
    if (range.startRel > 0) all.add(range.startRel);
    for (const t of interior4BarStartsFromLeft(
      range.startRel,
      range.startRel + range.lengthRel,
      maxChunk,
    )) {
      all.add(t);
    }
  }
  return normalizeSubsectionOffsets([...all], lengthTicks);
}

/**
 * Move interior boundary at band index ≥ 1 (v4 `moveSubsectionBoundary`).
 * - Drag right: left span grows → extra 4-bar splits from the left.
 * - Drag left: right span grows → extra 4-bar splits from the right.
 * - At neighbor / section edge: boundary removed (merge) + refill.
 */
export function moveSubsectionBoundary(
  offsets: readonly number[],
  lengthTicks: number,
  boundarySubIdx: number,
  newRelTicks: number,
  maxChunk: number,
): number[] | null {
  const ranges = subsectionRanges(offsets, lengthTicks);
  const idx = Math.round(Number(boundarySubIdx));
  if (!Number.isFinite(idx) || idx < 1 || idx >= ranges.length) return null;

  const oldRel = ranges[idx]!.startRel;
  const prevStart = ranges[idx - 1]!.startRel;
  const nextStart =
    idx + 1 < ranges.length ? ranges[idx + 1]!.startRel : lengthTicks;

  let cut = Math.round(Number(newRelTicks));
  if (!Number.isFinite(cut)) return null;
  cut = Math.max(prevStart, Math.min(cut, nextStart));

  if (cut <= prevStart || cut >= nextStart) {
    const starts = ranges
      .map((r) => r.startRel)
      .filter((_, i) => i !== idx)
      .filter((s) => s > 0);
    return fill4BarGapsFromLeft(starts, lengthTicks, maxChunk);
  }

  if (cut === oldRel) {
    return normalizeSubsectionOffsets(offsets, lengthTicks);
  }

  let starts = ranges.map((r) => r.startRel);
  starts[idx] = cut;

  if (cut > oldRel) {
    const extra = interior4BarStartsFromLeft(prevStart, cut, maxChunk);
    starts = [...new Set([...starts, ...extra])].sort((a, b) => a - b);
  } else {
    const extra = interior4BarStartsFromRight(cut, nextStart, maxChunk);
    starts = [...new Set([...starts, ...extra])].sort((a, b) => a - b);
  }

  return normalizeSubsectionOffsets(
    starts.filter((s) => s > 0),
    lengthTicks,
  );
}

/** Apply moved/filled subsection list onto a Forma section clip. */
export function withFormaSubsections(
  clip: FormaClip,
  offsets: number[] | null | undefined,
): FormaClip {
  if (clip.kind === "countdown") return clip;
  if (!offsets?.length) {
    if (!clip.subsections?.length) return clip;
    const { subsections: _drop, ...rest } = clip;
    void _drop;
    return rest;
  }
  return { ...clip, subsections: offsets };
}

export function subsectionMaxChunkForClip(
  project: Project,
  clip: Pick<FormaClip, "startTicks">,
): number {
  return subsectionMaxChunkTicks(project, clip.startTicks);
}
