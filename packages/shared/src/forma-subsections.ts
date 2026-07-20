/**
 * Forma subsection defaults — v4 ChordPhrases `defaultSubsections4Bar` in ticks.
 * Storage: interior boundaries as offsets from clip.startTicks (exclude 0 / length).
 */

import { resolveMeterAt } from "./project-resolve.js";
import { ticksPerBar } from "./time.js";
import type { FormaClip, Project } from "./schema.js";

/** Sorted unique interior offsets in (0, lengthTicks). */
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
  ].sort((a, b) => a - b);
}

/** 4 musical bars in ticks at `atTicks` (meterMap-aware; v4 `subsectionMaxChunk`). */
export function subsectionMaxChunkTicks(
  project: Project,
  atTicks: number,
): number {
  const meter = resolveMeterAt(project, atTicks);
  return 4 * ticksPerBar(meter, project.ppq);
}

/**
 * v4 `defaultSubsections4Bar` as relative interior offsets.
 * Split every `maxChunkTicks` from clip start; last span may be shorter.
 * Sections ≤ one chunk → `[]` (single implicit band — same as v4 whole-section range).
 */
export function defaultSubsections4Bar(
  lengthTicks: number,
  maxChunkTicks: number,
): number[] {
  const len = Math.max(1, Math.floor(lengthTicks));
  const chunk = Math.max(1, Math.floor(maxChunkTicks));
  const out: number[] = [];
  for (let t = chunk; t < len; t += chunk) {
    out.push(t);
  }
  return out;
}

/** True when clip already has persisted interior boundaries. */
export function hasUsableFormaSubsections(
  clip: Pick<FormaClip, "subsections">,
): boolean {
  return (clip.subsections?.length ?? 0) > 0;
}

/**
 * Fill missing Forma subsections with v4 4-bar defaults.
 * - Countdown: never touched
 * - Existing non-empty `subsections`: preserved
 * - Empty / missing on `section`: recompute via `defaultSubsections4Bar`
 */
export function ensureFormaSubsections(project: Project): Project {
  let changed = false;
  const clips = project.forma.clips.map((clip) => {
    if (clip.kind === "countdown") return clip;
    if (hasUsableFormaSubsections(clip)) return clip;
    const maxChunk = subsectionMaxChunkTicks(project, clip.startTicks);
    const subsections = defaultSubsections4Bar(clip.lengthTicks, maxChunk);
    if (subsections.length === 0) return clip;
    changed = true;
    return { ...clip, subsections };
  });
  if (!changed) return project;
  return { ...project, forma: { clips } };
}
