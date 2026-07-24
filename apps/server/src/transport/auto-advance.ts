/**
 * When setlist auto-advance is on and transport reaches project end (not looping),
 * load the next song and Stop@home (Countdown). Pure wiring — SSOT stays on transport.
 */

import {
  projectEndTicks,
  resolveSetlistNext,
  type Project,
} from "@stagesync/shared";
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

export function wireSetlistAutoAdvance(
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
        if (!setlist.enabled || !setlist.autoAdvance.enabled) return;

        const library = await stores.getLibrary();
        if (!stillPastEnd(transport, projectId, endTicks)) return;

        const next = resolveSetlistNext(setlist, library, projectId);
        if (!next) {
          project ??= await stores.getProject(projectId);
          if (!stillPastEnd(transport, projectId, endTicks)) return;
          transport.stop(project);
          return;
        }

        const nextProject = await stores.getProject(next.id);
        if (!stillPastEnd(transport, projectId, endTicks)) return;

        endCache = {
          projectId: next.id,
          endTicks: projectEndTicks(nextProject),
        };
        transport.loadProject(next.id, nextProject);
        transport.stop(nextProject);
      } catch {
        /* next tick may retry */
      } finally {
        inFlight = false;
      }
    })();
  });
}
