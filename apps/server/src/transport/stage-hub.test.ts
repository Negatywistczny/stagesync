import { afterEach, describe, expect, it, vi } from "vitest";
import { createStageHub } from "./stage-hub.js";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createStageHub", () => {
  it("defaults ttlMs to 6000 and assigns id + expiresAt", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const hub = createStageHub();
    const msg = hub.broadcast({ type: "stage_cue", text: "TERAZ" });
    expect(msg.ttlMs).toBe(6000);
    expect(msg.sentAtMs).toBe(1_700_000_000_000);
    expect(msg.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(msg.expiresAt).toBe(
      new Date(1_700_000_000_000 + 6000).toISOString(),
    );
    expect(hub.list()).toHaveLength(1);
    expect(hub.snapshotCues()[0]?.id).toBe(msg.id);
  });

  it("preserves ttlMs 0 as infinite — no expiresAt", () => {
    const hub = createStageHub();
    const msg = hub.broadcast({
      type: "stage_cue",
      text: "HOLD",
      ttlMs: 0,
    });
    expect(msg.ttlMs).toBe(0);
    expect(msg.expiresAt).toBeUndefined();
    expect(hub.list()[0]?.expiresAt).toBeUndefined();
  });

  it("dismiss removes one message and emits stage_cue_dismiss", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_100);
    const hub = createStageHub();
    const events: unknown[] = [];
    hub.onMessage((m) => events.push(m));
    const msg = hub.broadcast({ type: "stage_cue", text: "A", ttlMs: 0 });
    expect(hub.dismiss(msg.id)).toBe(true);
    expect(hub.list()).toEqual([]);
    expect(hub.dismiss(msg.id)).toBe(false);
    expect(events.at(-1)).toEqual({
      type: "stage_cue_dismiss",
      id: msg.id,
      sentAtMs: 1_700_000_000_100,
    });
  });

  it("clearAll empties store and emits clearAll dismiss", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_200);
    const hub = createStageHub();
    const events: unknown[] = [];
    hub.onMessage((m) => events.push(m));
    hub.broadcast({ type: "stage_cue", text: "A", ttlMs: 0 });
    hub.broadcast({ type: "stage_cue", text: "B", ttlMs: 0 });
    expect(hub.list()).toHaveLength(2);
    hub.clearAll();
    expect(hub.list()).toEqual([]);
    expect(hub.snapshotCues()).toEqual([]);
    expect(events.at(-1)).toEqual({
      type: "stage_cue_dismiss",
      clearAll: true,
      sentAtMs: 1_700_000_000_200,
    });
  });

  it("auto-dismisses after ttl (fake timers)", () => {
    vi.useFakeTimers();
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    const hub = createStageHub();
    const events: unknown[] = [];
    hub.onMessage((m) => events.push(m));
    const msg = hub.broadcast({
      type: "stage_cue",
      text: "FLASH",
      ttlMs: 6000,
    });
    expect(hub.list()).toHaveLength(1);

    vi.advanceTimersByTime(5999);
    expect(hub.list()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(hub.list()).toEqual([]);
    expect(events.at(-1)).toEqual({
      type: "stage_cue_dismiss",
      id: msg.id,
      sentAtMs: 1_700_000_000_000,
    });
  });
});
