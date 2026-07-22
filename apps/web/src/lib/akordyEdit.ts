/**
 * Akordy lane edit — pencil click insert + symbol/delete (α8).
 */

import {
  insertSpanOverwrite,
  resolveMeterAt,
  ticksPerBar,
  type AkordClip,
  type Project,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";

function asFormaLike(clip: AkordClip) {
  return {
    id: clip.id,
    name: clip.symbol || "…",
    kind: "section" as const,
    startTicks: clip.startTicks,
    lengthTicks: clip.lengthTicks,
  };
}

export function pencilAkordyClick(
  project: Project,
  atTicks: number,
  symbol = "C",
): Project {
  const startTicks = snapEditTicks(project, atTicks);
  const meter = resolveMeterAt(project, startTicks);
  const barTicks = ticksPerBar(meter, project.ppq);
  const floor = contentFloorTicks(project.forma.clips);

  const newClip: AkordClip = {
    id: `akord-${crypto.randomUUID()}`,
    startTicks,
    lengthTicks: barTicks,
    symbol: (symbol.trim() || "C").slice(0, 64),
  };

  const synthetic = project.akordy.clips.map(asFormaLike);
  const placed = insertSpanOverwrite(synthetic, asFormaLike(newClip), {
    contentFloorTicks: floor,
  });

  const clips: AkordClip[] = placed
    .filter((c) => c.kind === "section")
    .map((c) => {
      if (c.id === newClip.id) return newClip;
      const parentId = c.id.endsWith("-r") ? c.id.replace(/(-r)+$/, "") : c.id;
      const prev =
        project.akordy.clips.find((t) => t.id === c.id) ??
        project.akordy.clips.find((t) => t.id === parentId);
      return {
        id: c.id,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        symbol: prev?.symbol ?? "C",
      };
    });

  return { ...project, akordy: { clips } };
}

export function deleteAkordyClip(project: Project, clipId: string): Project {
  const clips = project.akordy.clips.filter((c) => c.id !== clipId);
  if (clips.length === project.akordy.clips.length) return project;
  return { ...project, akordy: { clips } };
}

export function setAkordyClipSymbol(
  project: Project,
  clipId: string,
  symbol: string,
): Project {
  const next = (symbol.trim() || "C").slice(0, 64);
  const clips = project.akordy.clips.map((c) =>
    c.id === clipId ? { ...c, symbol: next } : c,
  );
  return { ...project, akordy: { clips } };
}

export function resolveAkordClipAt(
  project: Project,
  atTicks: number,
): AkordClip | null {
  for (const clip of project.akordy.clips) {
    if (
      atTicks >= clip.startTicks &&
      atTicks < clip.startTicks + clip.lengthTicks
    ) {
      return clip;
    }
  }
  return null;
}
