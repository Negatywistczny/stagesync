/**
 * MIDI Program Change IN → load matching library project (by midiProgramId).
 * Latest-wins while a load is in flight (do not drop the newest PC).
 * Stops at transport home after load. No MIDI I/O in Tauri (ADR 0010).
 */

import type { Stores } from "../storage/index.js";
import type { TransportEngine } from "../transport/engine.js";

export function createMidiProgramChangeHandler(
  transport: TransportEngine,
  stores: Stores,
): (program: number) => void {
  let inFlight = false;
  let pending: number | null = null;

  async function pump(): Promise<void> {
    if (inFlight) return;
    inFlight = true;
    try {
      while (pending !== null) {
        const program = pending;
        pending = null;
        if (!Number.isInteger(program) || program < 0 || program > 127) {
          continue;
        }
        try {
          const library = await stores.getLibrary();
          const entry = library.projects.find(
            (p) => p.isTemplate !== true && p.midiProgramId === program,
          );
          if (!entry) continue;
          if (transport.getActiveProjectId() === entry.id) continue;

          const project = await stores.getProject(entry.id);
          transport.loadProject(entry.id, project);
          transport.stop(project);
        } catch {
          /* ignore — next PC may retry */
        }
      }
    } finally {
      inFlight = false;
    }
    if (pending !== null) {
      void pump();
    }
  }

  return (program: number) => {
    if (!Number.isInteger(program) || program < 0 || program > 127) return;
    pending = program;
    void pump();
  };
}
