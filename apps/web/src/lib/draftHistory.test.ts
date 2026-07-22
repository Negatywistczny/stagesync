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
import type { ClipSelection } from "./timelineSelection.js";

const sel = (id: string): ClipSelection => ({
  items: [{ id, lane: "forma" }],
  primaryId: id,
});

describe("draftHistory", () => {
  it("undo/redo and keep stack after save sync", () => {
    const a = createProjectV5Seed("p", "A", "2026-07-20T12:00:00.000Z");
    const b = { ...a, name: "B" };
    const c = { ...a, name: "C" };
    let h = createDraftHistory(a, sel("a"));
    h = pushDraftHistory(h, b, sel("b"));
    h = pushDraftHistory(h, c, sel("c"));
    expect(canUndo(h)).toBe(true);
    h = undoDraft(h);
    expect(h.present.project.name).toBe("B");
    expect(h.present.clipSelection.primaryId).toBe("b");
    expect(canRedo(h)).toBe(true);

    const saved = { ...c, name: "C" };
    h = syncPresentAfterSave(h, saved);
    expect(canUndo(h)).toBe(true);
    h = undoDraft(h);
    expect(h.present.project.name).toBe("A");
    expect(h.present.clipSelection.primaryId).toBe("a");

    h = resetDraftHistory(saved);
    expect(canUndo(h)).toBe(false);
    expect(h.present.project.name).toBe("C");
  });

  it("redo after undo restores selection", () => {
    const a = createProjectV5Seed("p", "A", "2026-07-20T12:00:00.000Z");
    const b = { ...a, name: "B" };
    let h = pushDraftHistory(createDraftHistory(a, sel("a")), b, sel("b"));
    h = undoDraft(h);
    expect(h.present.clipSelection.primaryId).toBe("a");
    h = redoDraft(h);
    expect(h.present.project.name).toBe("B");
    expect(h.present.clipSelection.primaryId).toBe("b");
  });
});
