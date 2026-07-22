/**
 * MIDI Program Change IN → load matching library project (by midiProgramId).
 * Stops at transport home after load. No MIDI I/O in Tauri (ADR 0010).
 */

import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "../transport/engine.js";

export function createMidiProgramChangeHandler(
  transport: TransportEngine,
  stores: Stores,
): (program: number) => void {
  let inFlight = false;

  return (program: number) => {
    if (inFlight) return;
    if (!Number.isInteger(program) || program < 0 || program > 127) return;

    inFlight = true;
    void (async () => {
      try {
        const library = await stores.getLibrary();
        const entry = library.projects.find(
          (p) => p.isTemplate !== true && p.midiProgramId === program,
        );
        if (!entry) return;
        if (transport.getActiveProjectId() === entry.id) return;

        const project = await stores.getProject(entry.id);
        transport.loadProject(entry.id, project);
        transport.stop(project);
      } catch {
        /* ignore — next PC may retry */
      } finally {
        inFlight = false;
      }
    })();
  };
}
