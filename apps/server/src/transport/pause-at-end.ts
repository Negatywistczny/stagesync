/**
 * When transport plays past project end and setlist auto-advance is off
 * (or setlist disabled), pause and clamp playhead to end.
 *
 * Leaves the auto-advance-on case to `wireSetlistAutoAdvance` (#73).
 */

import { projectEndTicks, type Project } from "@stagesync/shared";
import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "./engine.js";

/** Re-check after every await — FOH Seek/Pause must win over stale I/O. */
function stillPastEnd(
  transport: TransportEngine,
  projectId: string,
  endTicks: number,
): boolean {
  const state = transport.getState();
  return (
    state.playing &&
    state.activeProjectId === projectId &&
    !transport.isLooping() &&
    state.positionTicks >= endTicks
  );
}

export function wirePauseAtSongEnd(
  transport: TransportEngine,
  stores: Stores,
): () => void {
  let inFlight = false;
  let endCache: { projectId: string; endTicks: number } | null = null;

  return transport.onChange((msg) => {
    if (inFlight || !msg.playing || transport.isLooping()) return;
    const projectId = msg.activeProjectId;
    if (!projectId) return;
    if (
      endCache?.projectId === projectId &&
      msg.positionTicks < endCache.endTicks
    ) {
      return;
    }

    inFlight = true;
    void (async () => {
      try {
        let endTicks =
          endCache?.projectId === projectId ? endCache.endTicks : null;
        let project: Project | null = null;
        if (endTicks == null) {
          project = await stores.getProject(projectId);
          endTicks = projectEndTicks(project);
          endCache = { projectId, endTicks };
        }
        if (!stillPastEnd(transport, projectId, endTicks)) return;

        const setlist = await stores.getSetlist();
        if (!stillPastEnd(transport, projectId, endTicks)) return;
        if (setlist.enabled && setlist.autoAdvance.enabled) {
          // Owned by wireSetlistAutoAdvance.
          return;
        }

        project ??= await stores.getProject(projectId);
        if (!stillPastEnd(transport, projectId, endTicks)) return;
        transport.pause();
        transport.seek(endTicks, project);
      } catch {
        /* next tick may retry */
      } finally {
        inFlight = false;
      }
    })();
  });
}
