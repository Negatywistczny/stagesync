import {
  DEFAULT_SNAP_MODE,
  insertSpanOverwrite,
  resolveMeterAt,
  ticksPerBar,
  type FormaClip,
  type Project,
  type SnapMode,
} from "@stagesync/shared";
import { contentFloorTicks, snapEditTicks } from "./formaCanvasMath.js";

/**
 * Forma pencil click: 1 bar at snapped barline, overwrite occupied span.
 * Countdown span is protected; clicks before content floor clamp to floor.
 */
export function pencilFormaClick(
  project: Project,
  atTicks: number,
  sectionName: string,
  mode: SnapMode = DEFAULT_SNAP_MODE,
): Project {
  const startTicks = snapEditTicks(project, atTicks, mode);
  const meter = resolveMeterAt(project, startTicks);
  const barTicks = ticksPerBar(meter, project.ppq);

  const newSection: FormaClip = {
    id: `forma-${crypto.randomUUID()}`,
    name: sectionName,
    kind: "section",
    startTicks,
    lengthTicks: barTicks,
  };

  const floor = contentFloorTicks(project.forma.clips);
  const clips = insertSpanOverwrite(project.forma.clips, newSection, {
    contentFloorTicks: floor,
  });
  if (clips === project.forma.clips) return project;
  return { ...project, forma: { clips } };
}

/** @deprecated use pencilFormaClick */
export function addPencilSection(
  project: Project,
  atTicks: number,
  sectionName: string,
): Project {
  return pencilFormaClick(project, atTicks, sectionName);
}
