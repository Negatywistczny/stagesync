/**
 * When transport plays past project end and setlist auto-advance is off
 * (or setlist disabled), pause and clamp playhead to end.
 *
 * Leaves the auto-advance-on case to `wireSetlistAutoAdvance` (#73).
 */

import { projectEndTicks, type Project } from "@stagesync/shared";
import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "./engine.js";

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
        if (msg.positionTicks < endTicks) return;

        const state = transport.getState();
        if (!state.playing || state.activeProjectId !== projectId) return;
        if (transport.isLooping()) return;

        const setlist = await stores.getSetlist();
        if (setlist.enabled && setlist.autoAdvance.enabled) {
          // Owned by wireSetlistAutoAdvance when that lands.
          return;
        }

        project ??= await stores.getProject(projectId);
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
