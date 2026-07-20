/**
 * Tap wokalu — queue non-empty tekst clips and set startTicks from transport.
 */

import { type Project, type TekstClip } from "@stagesync/shared";
import { contentFloorTicks } from "./formaCanvas.js";

export function vocalTapQueue(project: Project): TekstClip[] {
  const floor = contentFloorTicks(project.forma.clips);
  return [...project.tekst.clips]
    .filter((c) => c.text.trim().length > 0 && c.startTicks >= floor)
    .sort((a, b) => a.startTicks - b.startTicks);
}

/** Set clip startTicks (keep length); clamp to content floor. */
export function applyVocalTap(
  project: Project,
  clipId: string,
  atTicks: number,
): Project {
  const floor = contentFloorTicks(project.forma.clips);
  const start = Math.max(floor, Math.trunc(atTicks));
  const clips = project.tekst.clips.map((c) =>
    c.id === clipId ? { ...c, startTicks: start } : c,
  );
  return { ...project, tekst: { clips } };
}
