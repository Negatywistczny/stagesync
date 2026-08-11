/**
 * Forma edit tick snapping.
 */

import { type Project, type SnapMode } from "@stagesync/shared";
import { snapEditTicks } from "../formaCanvas.js";

export function snapEditTicksWithMode(
  project: Project,
  atTicks: number,
  mode: SnapMode,
): number {
  return snapEditTicks(project, atTicks, mode);
}
