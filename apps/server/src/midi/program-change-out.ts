/**
 * When active project changes, send MIDI Program Change OUT for midiProgramId.
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

  return transport.onChange((msg) => {
    const projectId = msg.activeProjectId;
    if (!projectId || projectId === lastProjectId || inFlight) return;
    lastProjectId = projectId;
    inFlight = true;
    void (async () => {
      try {
        const project = await stores.getProject(projectId);
        if (project.midiProgramId == null) return;
        midi.sendProgramChange(project.midiProgramId);
      } catch {
        /* next load may retry */
      } finally {
        inFlight = false;
      }
    })();
  });
}
