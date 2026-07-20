/**
 * Client chord grid — resolve akordy.clips at display ticks (α8).
 */

import type { AkordClip, Project } from "@stagesync/shared";
import { resolveAkordClipAt } from "./akordyEdit.js";

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
  const clips = [...project.akordy.clips].sort(
    (a, b) => a.startTicks - b.startTicks,
  );
  if (clips.length === 0) {
    return {
      current: null,
      upcoming: [],
      emptyReason: "Brak akordów — dodaj clipy na lane Akordy w Timeline.",
    };
  }
  const current = resolveAkordClipAt(project, displayTicks);
  const upcoming = clips
    .filter((c) => c.startTicks > displayTicks)
    .slice(0, 2);
  return { current, upcoming, emptyReason: null };
}
