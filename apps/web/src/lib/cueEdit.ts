/**
 * Cue lane edit — pencil click insert + label/roles/priority/delete (v4 parity).
 */

import {
  insertSpanOverwrite,
  resolveMeterAt,
  ticksPerBar,
  type CueClip,
  type CueClipRole,
  type Project,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvas.js";

const CUE_ROLES: CueClipRole[] = ["karaoke", "grid", "score", "drums"];

function asFormaLike(clip: CueClip) {
  return {
    id: clip.id,
    name: clip.label || "…",
    kind: "section" as const,
    startTicks: clip.startTicks,
    lengthTicks: clip.lengthTicks,
  };
}

function mergeCueFields(
  base: CueClip,
  layout: { id: string; startTicks: number; lengthTicks: number },
): CueClip {
  return {
    ...base,
    id: layout.id,
    startTicks: layout.startTicks,
    lengthTicks: layout.lengthTicks,
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
    label: (label.trim() || "Cue").slice(0, 120),
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
      if (prev) {
        return mergeCueFields(prev, {
          id: c.id,
          startTicks: c.startTicks,
          lengthTicks: c.lengthTicks,
        });
      }
      return {
        id: c.id,
        startTicks: c.startTicks,
        lengthTicks: c.lengthTicks,
        label: "Cue",
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
  const next = (label.trim() || "Cue").slice(0, 120);
  const clips = project.cue.clips.map((c) =>
    c.id === clipId ? { ...c, label: next } : c,
  );
  return { ...project, cue: { clips } };
}

export function setCueClipRoles(
  project: Project,
  clipId: string,
  roles: CueClipRole[],
): Project {
  const normalized = CUE_ROLES.filter((r) => roles.includes(r));
  const clips = project.cue.clips.map((c) => {
    if (c.id !== clipId) return c;
    if (normalized.length === 0) {
      const { roles: _drop, ...rest } = c;
      void _drop;
      return rest;
    }
    return { ...c, roles: normalized };
  });
  return { ...project, cue: { clips } };
}

export function setCueClipPriority(
  project: Project,
  clipId: string,
  priority: "normal" | "alert",
): Project {
  const clips = project.cue.clips.map((c) => {
    if (c.id !== clipId) return c;
    if (priority === "normal") {
      const { priority: _drop, ...rest } = c;
      void _drop;
      return rest;
    }
    return { ...c, priority: "alert" as const };
  });
  return { ...project, cue: { clips } };
}

export { CUE_ROLES };
