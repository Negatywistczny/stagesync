/**
 * Client chord grid — resolve akordy.clips at display ticks (α8).
 * Countdown digits are synthetic overlays (not stored in project.json).
 */

import type { AkordClip, Project } from "@stagesync/shared";
import { syntheticCountdownDisplayFromProject } from "@stagesync/shared";
import { resolveAkordClipAt } from "./akordyEdit.js";

/** Persisted Akordy + synthetic CD digit symbols when playhead in/near CD. */
export function mergeAkordyWithCountdownDigits(
  project: Project,
  displayTicks: number,
): AkordClip[] {
  const cd = project.forma.clips.find((c) => c.kind === "countdown");
  const cdEnd = cd != null ? cd.startTicks + cd.lengthTicks : 0;
  const includeDigits = displayTicks < cdEnd;
  const synth = includeDigits
    ? syntheticCountdownDisplayFromProject(project).akordy
    : [];
  const real = project.akordy.clips.filter(
    (c) =>
      !/^cd-chord-/i.test(c.id) &&
      !(c.startTicks < 0 && /^\d+$/.test(c.symbol)),
  );
  return [...synth, ...real].sort(
    (a, b) =>
      a.startTicks - b.startTicks || a.id.localeCompare(b.id),
  );
}

function resolveMergedAkordAt(
  clips: AkordClip[],
  atTicks: number,
): AkordClip | null {
  for (const clip of clips) {
    if (
      atTicks >= clip.startTicks &&
      atTicks < clip.startTicks + clip.lengthTicks
    ) {
      return clip;
    }
  }
  return null;
}

export function buildGridLiveContext(
  project: Project | null,
  displayTicks: number,
): {
  current: AkordClip | null;
  upcoming: AkordClip[];
  emptyReason: string | null;
} {
  if (!project) {
    return {
      current: null,
      upcoming: [],
      emptyReason: "Oczekiwanie na utwór…",
    };
  }
  const clips = mergeAkordyWithCountdownDigits(project, displayTicks);
  if (clips.length === 0) {
    return {
      current: null,
      upcoming: [],
      emptyReason: "Brak akordów — dodaj clipy na lane Akordy w Timeline.",
    };
  }
  const current =
    resolveMergedAkordAt(clips, displayTicks) ??
    resolveAkordClipAt(project, displayTicks);
  const upcoming = clips
    .filter((c) => c.startTicks > displayTicks)
    .slice(0, 2);
  return { current, upcoming, emptyReason: null };
}
