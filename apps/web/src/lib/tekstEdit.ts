/**
 * Tekst lane MVP — pencil click insert + rename/delete (α7 should).
 */

import {
  insertSpanOverwrite,
  resolveMeterAt,
  ticksPerBar,
  type Project,
  type TekstClip,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";

/** Adapt Tekst clips to FormaClip-shaped insert helper (kind section). */
function asFormaLike(clip: TekstClip) {
  return {
    id: clip.id,
    name: clip.text || "…",
    kind: "section" as const,
    startTicks: clip.startTicks,
    lengthTicks: clip.lengthTicks,
  };
}

export function pencilTekstClick(
  project: Project,
  atTicks: number,
  text = "",
): Project {
  const startTicks = snapEditTicks(project, atTicks);
  const meter = resolveMeterAt(project, startTicks);
  const barTicks = ticksPerBar(meter, project.ppq);
  const floor = contentFloorTicks(project.forma.clips);

  const newClip: TekstClip = {
    id: `tekst-${crypto.randomUUID()}`,
    startTicks,
    lengthTicks: barTicks,
    text,
  };

  // Reuse no-overlap insert on a synthetic Forma-shaped list, then map back.
  const synthetic = [
    ...project.tekst.clips.map(asFormaLike),
    // Countdown-like floor guard via opts only — no CD in tekst lane
  ];
  const placed = insertSpanOverwrite(synthetic, asFormaLike(newClip), {
    contentFloorTicks: floor,
  });

  const clips: TekstClip[] = placed
    .filter((c) => c.kind === "section")
    .map((c) => {
      if (c.id === newClip.id) return newClip;
      const prev = project.tekst.clips.find((t) => t.id === c.id);
      return {
        id: c.id,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        text: prev?.text ?? "",
      };
    });

  return { ...project, tekst: { clips } };
}

export function deleteTekstClip(project: Project, clipId: string): Project {
  const clips = project.tekst.clips.filter((c) => c.id !== clipId);
  if (clips.length === project.tekst.clips.length) return project;
  return { ...project, tekst: { clips } };
}

export function setTekstClipText(
  project: Project,
  clipId: string,
  text: string,
): Project {
  const clips = project.tekst.clips.map((c) =>
    c.id === clipId ? { ...c, text } : c,
  );
  return { ...project, tekst: { clips } };
}

export function resolveTekstClipAt(
  project: Project,
  atTicks: number,
): TekstClip | null {
  for (const clip of project.tekst.clips) {
    if (
      atTicks >= clip.startTicks &&
      atTicks < clip.startTicks + clip.lengthTicks
    ) {
      return clip;
    }
  }
  return null;
}
