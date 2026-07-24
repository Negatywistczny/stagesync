import { describe, expect, it, vi } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import type { MidiHost } from "./midi/host.js";
import { wireMidiProgramChangeOut } from "./midi/program-change-out.js";
import type { Stores } from "./storage/index.js";
import type { TransportEngine } from "./transport/engine.js";

describe("wireMidiProgramChangeOut edges", () => {
  it("sends program change once per new active project", async () => {
    const song = {
      ...createProjectV5Seed(
        "00000000-0000-4000-8000-00000000cc01",
        "Out",
        "2026-07-24T00:00:00.000Z",
      ),
      midiProgramId: 21,
    };
    let listener: ((msg: { activeProjectId: string | null }) => void) | null =
      null;
    const transport = {
      onChange: (fn: (msg: { activeProjectId: string | null }) => void) => {
        listener = fn;
        return () => {
          listener = null;
        };
      },
    } as unknown as TransportEngine;
    const stores = {
      getProject: vi.fn(async () => song),
    } as unknown as Stores;
    const midi = {
      sendProgramChange: vi.fn(),
    } as unknown as MidiHost;

    const dispose = wireMidiProgramChangeOut(transport, stores, midi);
    listener?.({ activeProjectId: song.id });
    await new Promise((r) => setTimeout(r, 10));
    expect(midi.sendProgramChange).toHaveBeenCalledWith(21);

    listener?.({ activeProjectId: song.id });
    await new Promise((r) => setTimeout(r, 10));
    expect(midi.sendProgramChange).toHaveBeenCalledTimes(1);

    dispose();
  });

  it("skips null project id and missing midiProgramId", async () => {
    const song = createProjectV5Seed(
      "00000000-0000-4000-8000-00000000cc02",
      "NoPc",
      "2026-07-24T00:00:00.000Z",
    );
    let listener: ((msg: { activeProjectId: string | null }) => void) | null =
      null;
    const transport = {
      onChange: (fn: (msg: { activeProjectId: string | null }) => void) => {
        listener = fn;
        return () => {
          listener = null;
        };
      },
    } as unknown as TransportEngine;
    const stores = {
      getProject: vi.fn(async () => ({ ...song, midiProgramId: undefined })),
    } as unknown as Stores;
    const midi = {
      sendProgramChange: vi.fn(),
    } as unknown as MidiHost;

    wireMidiProgramChangeOut(transport, stores, midi);
    listener?.({ activeProjectId: null });
    await new Promise((r) => setTimeout(r, 10));
    expect(stores.getProject).not.toHaveBeenCalled();

    listener?.({ activeProjectId: song.id });
    await new Promise((r) => setTimeout(r, 10));
    expect(midi.sendProgramChange).not.toHaveBeenCalled();
  });
});
