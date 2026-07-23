import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectV5Seed, projectEndTicks } from "@stagesync/shared";
import { createLiveDeskStore } from "./live-desk.js";
import {
  buildNetworkInfo,
  isLoopbackJoinUrl,
  pickPrimaryJoinUrl,
} from "./network-info.js";
import { wireSetlistAutoAdvance } from "./transport/auto-advance.js";
import { createTransportEngine } from "./transport/engine.js";
import type { Stores } from "./storage/index.js";

describe("network-info edges", () => {
  it("treats invalid URLs via catch and picks primary", () => {
    expect(isLoopbackJoinUrl("not a url but localhost")).toBe(true);
    expect(isLoopbackJoinUrl("http://10.0.0.5:4000")).toBe(false);
    expect(pickPrimaryJoinUrl(["http://localhost:1", "http://10.0.0.2:1"])).toBe(
      "http://10.0.0.2:1",
    );
    expect(pickPrimaryJoinUrl([])).toBeNull();
    const info = buildNetworkInfo(4000);
    expect(info.port).toBe(4000);
    expect(info.urls.some((u) => u.includes("localhost"))).toBe(true);
  });
});

describe("live-desk first-write failure", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });

  it("ignores failure when seed write cannot create parent", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ss-ld-"));
    dirs.push(dir);
    // parent path is a file → mkdir/write fails inside ensureLoaded catch
    const blocker = join(dir, "blocked");
    await writeFile(blocker, "x");
    const store = createLiveDeskStore(join(blocker, "nested", "live-desk.json"));
    const settings = await store.get();
    expect(settings.transpositionSemitones).toBe(0);
  });
});

describe("auto-advance stops when no next song", () => {
  it("calls stop on current project when resolveSetlistNext is null", async () => {
    const project = createProjectV5Seed(
      "00000000-0000-4000-8000-00000000aa01",
      "Only",
      "2026-07-21T00:00:00.000Z",
    );
    const end = projectEndTicks(project);
    let now = 0;
    const transport = createTransportEngine({ now: () => now, tickIntervalMs: 5 });
    const stop = vi.spyOn(transport, "stop");
    const stores = {
      getProject: vi.fn().mockResolvedValue(project),
      getSetlist: vi.fn().mockResolvedValue({
        version: 1,
        enabled: true,
        items: [{ type: "project", projectId: project.id }],
        projectIds: [project.id],
        autoAdvance: { enabled: true },
        timeBudgetMinutes: 120,
      }),
      getLibrary: vi.fn().mockResolvedValue({
        version: 1,
        projects: [
          {
            id: project.id,
            name: "Only",
            updatedAt: project.updatedAt,
            midiProgramId: 0,
          },
        ],
      }),
    } as unknown as Stores;

    const unsub = wireSetlistAutoAdvance(transport, stores);
    transport.loadProject(project.id, project);
    transport.seek(end - 10, project);
    transport.play({ projectId: project.id }, project);
    now += 60_000;
    // force a change notification past end
    transport.seek(end + 10, project);
    await new Promise((r) => setTimeout(r, 30));
    expect(stop).toHaveBeenCalled();
    unsub();
    transport.dispose();
  });
});

describe("transport engine edge branches", () => {
  it("swallows listener errors, rejects bad seek, and validates loop enable", () => {
    const engine = createTransportEngine({ now: () => 0 });
    const unsub = engine.onChange(() => {
      throw new Error("listener-boom");
    });
    expect(() => engine.pause()).not.toThrow();
    expect(() => engine.seek(1.5)).toThrow(RangeError);
    expect(() =>
      engine.setLoop({ enabled: true, startTicks: 10, endTicks: 10 }),
    ).toThrow(/endTicks/);
    engine.setLoop({ enabled: true, startTicks: 0, endTicks: 100 });
    engine.setLoop({ enabled: false });
    engine.setLoop({ enabled: false, startTicks: 0, endTicks: 0 });
    unsub();
    engine.dispose();
  });
});
