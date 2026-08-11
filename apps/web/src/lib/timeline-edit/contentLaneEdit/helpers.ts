/**
 * Shared content-lane helpers (Forma-shaped mapping).
 */

import { type FormaClip, type Project } from "@stagesync/shared";

export type ContentLaneId = "tekst" | "akordy" | "cue";

export function defaultPencilLabel(lane: ContentLaneId): string {
  if (lane === "tekst") return "…";
  if (lane === "akordy") return "C";
  return "Cue";
}

function labelOf(project: Project, lane: ContentLaneId, id: string): string {
  if (lane === "tekst") {
    return project.tekst.clips.find((c) => c.id === id)?.text || "…";
  }
  if (lane === "akordy") {
    return project.akordy.clips.find((c) => c.id === id)?.symbol || "…";
  }
  return project.cue.clips.find((c) => c.id === id)?.label || "…";
}

/** Map content clips → Forma-shaped list for shared collision. */
export function contentAsForma(
  project: Project,
  lane: ContentLaneId,
): FormaClip[] {
  const clips =
    lane === "tekst"
      ? project.tekst.clips
      : lane === "akordy"
        ? project.akordy.clips
        : project.cue.clips;
  return clips.map((c) => ({
    id: c.id,
    name: labelOf(project, lane, c.id),
    kind: "section" as const,
    startTicks: c.startTicks,
    lengthTicks: c.lengthTicks,
  }));
}

/**
 * `placeClipNoOverlap` may mint `${id}-r` or `${id}-r-N` for the right remnant.
 * Resolve payload from the parent id so seeds / symbols are not lost.
 */
export function resolveSplitParentId(id: string): string {
  let cur = id;
  for (;;) {
    const m = /^(.*)-r(?:-\d+)?$/.exec(cur);
    if (!m) return cur;
    cur = m[1]!;
  }
}
