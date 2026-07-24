/**
 * When active project changes, send MIDI Program Change OUT for midiProgramId.
 * Latest-wins while a send/load is in flight.
 */

import type { MidiHost } from "./host.js";
import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "../transport/engine.js";

export function wireMidiProgramChangeOut(
  transport: TransportEngine,
  stores: Stores,
  midi: MidiHost,
): () => void {
  let lastProjectId: string | null = null;
  let inFlight = false;
  let pendingProjectId: string | null = null;

  async function pump(): Promise<void> {
    if (inFlight) return;
    inFlight = true;
    try {
      while (pendingProjectId !== null) {
        const projectId = pendingProjectId;
        pendingProjectId = null;
        if (!projectId || projectId === lastProjectId) continue;
        lastProjectId = projectId;
        try {
          const project = await stores.getProject(projectId);
          if (project.midiProgramId == null) continue;
          midi.sendProgramChange(project.midiProgramId);
        } catch {
          /* next load may retry */
        }
      }
    } finally {
      inFlight = false;
    }
    if (pendingProjectId !== null) {
      void pump();
    }
  }

  return transport.onChange((msg) => {
    const projectId = msg.activeProjectId;
    if (!projectId || projectId === lastProjectId) return;
    pendingProjectId = projectId;
    void pump();
  });
}
