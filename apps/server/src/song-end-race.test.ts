import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createProjectV5Seed,
  projectEndTicks,
  transportHomeTicks,
} from "@stagesync/shared";
import { wirePauseAtSongEnd } from "./transport/pause-at-end.js";
import { wireSetlistAutoAdvance } from "./transport/auto-advance.js";
import { createTransportEngine } from "./transport/engine.js";
import type { Stores } from "./storage/index.js";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("song-end I/O races (BUG-SSV5-02)", () => {
  const disposers: Array<() => void> = [];

  afterEach(() => {
    while (disposers.length) disposers.pop()!();
  });

  it("pause-at-end does not overwrite FOH seek during delayed getProject", async () => {
    const project = createProjectV5Seed(
      "00000000-0000-4000-8000-00000000bb01",
      "Short",
      "2026-07-25T00:00:00.000Z",
    );
    const end = projectEndTicks(project);
    let now = 0;
    const transport = createTransportEngine({
      now: () => now,
      tickIntervalMs: 5,
    });
    disposers.push(() => transport.dispose());

    const projectGate = deferred<typeof project>();
    const stores = {
      getProject: vi.fn().mockImplementation(() => projectGate.promise),
      getSetlist: vi.fn().mockResolvedValue({
        version: 1,
        enabled: false,
        items: [],
        projectIds: [],
        autoAdvance: { enabled: false },
        timeBudgetMinutes: 120,
      }),
    } as unknown as Stores;

    disposers.push(wirePauseAtSongEnd(transport, stores));
    transport.loadProject(project.id, project);
    transport.seek(end - 10, project);
    transport.play({ projectId: project.id }, project);
    now += 60_000;
    transport.seek(end + 10, project);

    // FOH seeks home while pause-at-end is still awaiting disk I/O.
    transport.seek(0, project);
    expect(transport.getState().positionTicks).toBe(0);
    expect(transport.getState().playing).toBe(true);

    projectGate.resolve(project);
    await new Promise((r) => setTimeout(r, 30));

    const state = transport.getState();
    expect(state.playing).toBe(true);
    expect(state.positionTicks).toBe(0);
  });

  it("auto-advance does not load next song after FOH pause during I/O", async () => {
    const a = createProjectV5Seed(
      "00000000-0000-4000-8000-00000000bb02",
      "A",
      "2026-07-25T00:00:00.000Z",
    );
    const b = createProjectV5Seed(
      "00000000-0000-4000-8000-00000000bb03",
      "B",
      "2026-07-25T00:00:00.000Z",
    );
    const end = projectEndTicks(a);
    let now = 0;
    const transport = createTransportEngine({
      now: () => now,
      tickIntervalMs: 5,
    });
    disposers.push(() => transport.dispose());

    const nextGate = deferred<typeof b>();
    const loadProject = vi.spyOn(transport, "loadProject");
    const stores = {
      getProject: vi.fn().mockImplementation(async (id: string) => {
        if (id === a.id) return a;
        if (id === b.id) return nextGate.promise;
        throw new Error(`unknown ${id}`);
      }),
      getSetlist: vi.fn().mockResolvedValue({
        version: 1,
        enabled: true,
        items: [
          { type: "project", projectId: a.id },
          { type: "project", projectId: b.id },
        ],
        projectIds: [a.id, b.id],
        autoAdvance: { enabled: true },
        timeBudgetMinutes: 120,
      }),
      getLibrary: vi.fn().mockResolvedValue({
        version: 1,
        projects: [
          {
            id: a.id,
            name: "A",
            updatedAt: a.updatedAt,
            midiProgramId: 0,
          },
          {
            id: b.id,
            name: "B",
            updatedAt: b.updatedAt,
            midiProgramId: 1,
          },
        ],
      }),
    } as unknown as Stores;

    disposers.push(wireSetlistAutoAdvance(transport, stores));
    transport.loadProject(a.id, a);
    // Ignore loadProject from setup — only assert post-pause advances.
    loadProject.mockClear();

    transport.seek(end - 10, a);
    transport.play({ projectId: a.id }, a);
    now += 60_000;
    transport.seek(end + 10, a);

    // Wait until next-song fetch is in flight.
    await vi.waitFor(() => {
      expect(stores.getProject).toHaveBeenCalledWith(b.id);
    });

    transport.pause();
    expect(transport.getState().playing).toBe(false);
    expect(transport.getState().activeProjectId).toBe(a.id);

    nextGate.resolve(b);
    await new Promise((r) => setTimeout(r, 30));

    expect(loadProject).not.toHaveBeenCalled();
    expect(transport.getState().activeProjectId).toBe(a.id);
    expect(transport.getState().playing).toBe(false);
  });

  it("auto-advance still advances when FOH does not intervene", async () => {
    const a = createProjectV5Seed(
      "00000000-0000-4000-8000-00000000bb04",
      "A",
      "2026-07-25T00:00:00.000Z",
    );
    const b = createProjectV5Seed(
      "00000000-0000-4000-8000-00000000bb05",
      "B",
      "2026-07-25T00:00:00.000Z",
    );
    const end = projectEndTicks(a);
    let now = 0;
    const transport = createTransportEngine({
      now: () => now,
      tickIntervalMs: 5,
    });
    disposers.push(() => transport.dispose());

    const stores = {
      getProject: vi.fn().mockImplementation(async (id: string) => {
        if (id === a.id) return a;
        if (id === b.id) return b;
        throw new Error(`unknown ${id}`);
      }),
      getSetlist: vi.fn().mockResolvedValue({
        version: 1,
        enabled: true,
        items: [
          { type: "project", projectId: a.id },
          { type: "project", projectId: b.id },
        ],
        projectIds: [a.id, b.id],
        autoAdvance: { enabled: true },
        timeBudgetMinutes: 120,
      }),
      getLibrary: vi.fn().mockResolvedValue({
        version: 1,
        projects: [
          {
            id: a.id,
            name: "A",
            updatedAt: a.updatedAt,
            midiProgramId: 0,
          },
          {
            id: b.id,
            name: "B",
            updatedAt: b.updatedAt,
            midiProgramId: 1,
          },
        ],
      }),
    } as unknown as Stores;

    disposers.push(wireSetlistAutoAdvance(transport, stores));
    transport.loadProject(a.id, a);
    transport.seek(end - 10, a);
    transport.play({ projectId: a.id }, a);
    now += 60_000;
    transport.seek(end + 10, a);
    await new Promise((r) => setTimeout(r, 30));

    const state = transport.getState();
    expect(state.playing).toBe(false);
    expect(state.activeProjectId).toBe(b.id);
    expect(state.positionTicks).toBe(transportHomeTicks(b));
  });
});
