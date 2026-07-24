import { describe, expect, it, vi } from "vitest";
import { buildSetlistView } from "@stagesync/shared";
import {
  createSetlistHub,
  setlistSnapshotFromView,
} from "./setlist-hub.js";

describe("setlist-hub", () => {
  it("publishFromView notifies listeners and caches snapshot", () => {
    const hub = createSetlistHub();
    const listener = vi.fn();
    hub.onMessage(listener);

    const view = buildSetlistView(
      {
        version: 1,
        enabled: true,
        items: [
          { type: "project", projectId: "11111111-1111-4111-8111-111111111111" },
          { type: "project", projectId: "22222222-2222-4222-8222-222222222222" },
        ],
        projectIds: [
          "11111111-1111-4111-8111-111111111111",
          "22222222-2222-4222-8222-222222222222",
        ],
        autoAdvance: { enabled: true },
        timeBudgetMinutes: 90,
      },
      {
        version: 1,
        projects: [
          { id: "11111111-1111-4111-8111-111111111111", name: "A" },
          { id: "22222222-2222-4222-8222-222222222222", name: "B" },
        ],
      },
      "11111111-1111-4111-8111-111111111111",
    );

    const msg = hub.publishFromView(view, 42);
    expect(msg.type).toBe("setlist_snapshot");
    expect(msg.projectIds).toHaveLength(2);
    expect(msg.next?.name).toBe("B");
    expect(msg.sentAtMs).toBe(42);
    expect(listener).toHaveBeenCalledWith(msg);
    expect(hub.snapshotMessage()).toEqual(msg);
  });

  it("setlistSnapshotFromView maps view fields", () => {
    const snap = setlistSnapshotFromView(
      {
        enabled: false,
        items: [],
        projectIds: [],
        entries: [],
        currentIndex: -1,
        next: null,
        autoAdvance: { enabled: false },
        timeBudgetMinutes: 90,
        totalDurationMs: 0,
        warnings: [],
      },
      99,
    );
    expect(snap).toEqual({
      type: "setlist_snapshot",
      projectIds: [],
      enabled: false,
      autoAdvance: { enabled: false },
      currentIndex: -1,
      next: null,
      sentAtMs: 99,
    });
  });
});
