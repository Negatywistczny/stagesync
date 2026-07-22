/**
 * Cue lane edit — pencil click insert + label/delete (α8).
 */

import {
  insertSpanOverwrite,
  resolveMeterAt,
  ticksPerBar,
  type CueClip,
  type Project,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";

function asFormaLike(clip: CueClip) {
  return {
    id: clip.id,
    name: clip.label || "…",
    kind: "section" as const,
    startTicks: clip.startTicks,
    lengthTicks: clip.lengthTicks,
  };
}

export function pencilCueClick(
  project: Project,
  atTicks: number,
  label = "Cue",
): Project {
  const startTicks = snapEditTicks(project, atTicks);
  const meter = resolveMeterAt(project, startTicks);
  const barTicks = ticksPerBar(meter, project.ppq);
  const floor = contentFloorTicks(project.forma.clips);

  const newClip: CueClip = {
    id: `cue-${crypto.randomUUID()}`,
    startTicks,
    lengthTicks: barTicks,
    label: label.trim() || "Cue",
  };

  const synthetic = project.cue.clips.map(asFormaLike);
  const placed = insertSpanOverwrite(synthetic, asFormaLike(newClip), {
    contentFloorTicks: floor,
  });

  const clips: CueClip[] = placed
    .filter((c) => c.kind === "section")
    .map((c) => {
      if (c.id === newClip.id) return newClip;
      const parentId = c.id.endsWith("-r") ? c.id.replace(/(-r)+$/, "") : c.id;
      const prev =
        project.cue.clips.find((t) => t.id === c.id) ??
        project.cue.clips.find((t) => t.id === parentId);
      return {
        id: c.id,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        label: prev?.label ?? "Cue",
      };
    });

  return { ...project, cue: { clips } };
}

export function deleteCueClip(project: Project, clipId: string): Project {
  const clips = project.cue.clips.filter((c) => c.id !== clipId);
  if (clips.length === project.cue.clips.length) return project;
  return { ...project, cue: { clips } };
}

export function setCueClipLabel(
  project: Project,
  clipId: string,
  label: string,
): Project {
  const next = label.trim() || "Cue";
  const clips = project.cue.clips.map((c) =>
    c.id === clipId ? { ...c, label: next } : c,
  );
  return { ...project, cue: { clips } };
}
