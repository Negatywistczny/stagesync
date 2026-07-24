import { describe, expect, it, vi } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import { createMidiProgramChangeHandler } from "./midi/program-change.js";
import type { Stores } from "./storage/index.js";
import type { TransportEngine } from "./transport/engine.js";

function mockStores(projects: ReturnType<typeof createProjectV5Seed>[]) {
  const library = {
    version: 1 as const,
    projects: projects.map((p) => ({
      id: p.id,
      name: p.name,
      updatedAt: p.updatedAt,
      midiProgramId: p.midiProgramId ?? 0,
      isTemplate: false as boolean | undefined,
    })),
  };
  return {
    getLibrary: vi.fn(async () => library),
    getProject: vi.fn(async (id: string) => {
      const p = projects.find((x) => x.id === id);
      if (!p) throw new Error("missing");
      return p;
    }),
  } as unknown as Stores;
}

function mockTransport(activeId: string | null = null) {
  return {
    getActiveProjectId: vi.fn(() => activeId),
    loadProject: vi.fn(),
    stop: vi.fn(),
  } as unknown as TransportEngine;
}

describe("createMidiProgramChangeHandler edges", () => {
  it("ignores non-integer and out-of-range programs", async () => {
    const stores = mockStores([]);
    const transport = mockTransport();
    const onPc = createMidiProgramChangeHandler(transport, stores);
    onPc(-1);
    onPc(128);
    onPc(1.5 as unknown as number);
    await Promise.resolve();
    expect(stores.getLibrary).not.toHaveBeenCalled();
  });

  it("skips templates and unknown program ids", async () => {
    const song = createProjectV5Seed(
      "00000000-0000-4000-8000-00000000bb01",
      "Song",
      "2026-07-24T00:00:00.000Z",
    );
    const stores = mockStores([{ ...song, midiProgramId: 3 }]);
    (stores as { getLibrary: ReturnType<typeof vi.fn> }).getLibrary = vi.fn(
      async () => ({
        version: 1,
        projects: [
          {
            id: song.id,
            name: song.name,
            updatedAt: song.updatedAt,
            midiProgramId: 3,
            isTemplate: true,
          },
        ],
      }),
    );
    const transport = mockTransport();
    const onPc = createMidiProgramChangeHandler(transport, stores);
    onPc(3);
    await new Promise((r) => setTimeout(r, 10));
    expect(transport.loadProject).not.toHaveBeenCalled();

    onPc(99);
    await new Promise((r) => setTimeout(r, 10));
    expect(transport.loadProject).not.toHaveBeenCalled();
  });

  it("no-ops when the matching project is already active", async () => {
    const song = {
      ...createProjectV5Seed(
        "00000000-0000-4000-8000-00000000bb02",
        "Active",
        "2026-07-24T00:00:00.000Z",
      ),
      midiProgramId: 7,
    };
    const stores = mockStores([song]);
    const transport = mockTransport(song.id);
    const onPc = createMidiProgramChangeHandler(transport, stores);
    onPc(7);
    await new Promise((r) => setTimeout(r, 10));
    expect(transport.loadProject).not.toHaveBeenCalled();
    expect(transport.stop).not.toHaveBeenCalled();
  });

  it("loads and stops when program matches a library song", async () => {
    const song = {
      ...createProjectV5Seed(
        "00000000-0000-4000-8000-00000000bb03",
        "LoadMe",
        "2026-07-24T00:00:00.000Z",
      ),
      midiProgramId: 11,
    };
    const stores = mockStores([song]);
    const transport = mockTransport(null);
    const onPc = createMidiProgramChangeHandler(transport, stores);
    onPc(11);
    await new Promise((r) => setTimeout(r, 10));
    expect(transport.loadProject).toHaveBeenCalledWith(song.id, song);
    expect(transport.stop).toHaveBeenCalledWith(song);
  });
});
