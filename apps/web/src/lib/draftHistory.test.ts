import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  canRedo,
  canUndo,
  createDraftHistory,
  pushDraftHistory,
  redoDraft,
  resetDraftHistory,
  syncPresentAfterSave,
  undoDraft,
} from "./draftHistory.js";

describe("draftHistory", () => {
  it("undo/redo and keep stack after save sync", () => {
    const a = createProjectV5Seed("p", "A", "2026-07-20T12:00:00.000Z");
    const b = { ...a, name: "B" };
    const c = { ...a, name: "C" };
    let h = createDraftHistory(a);
    h = pushDraftHistory(h, b);
    h = pushDraftHistory(h, c);
    expect(canUndo(h)).toBe(true);
    h = undoDraft(h);
    expect(h.present.name).toBe("B");
    expect(canRedo(h)).toBe(true);

    const saved = { ...c, name: "C" };
    h = syncPresentAfterSave(h, saved);
    expect(canUndo(h)).toBe(true);
    h = undoDraft(h);
    expect(h.present.name).toBe("A");

    h = resetDraftHistory(saved);
    expect(canUndo(h)).toBe(false);
    expect(h.present.name).toBe("C");
  });

  it("redo after undo", () => {
    const a = createProjectV5Seed("p", "A", "2026-07-20T12:00:00.000Z");
    const b = { ...a, name: "B" };
    let h = pushDraftHistory(createDraftHistory(a), b);
    h = undoDraft(h);
    h = redoDraft(h);
    expect(h.present.name).toBe("B");
  });
});
