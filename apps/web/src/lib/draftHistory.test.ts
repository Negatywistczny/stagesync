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
    expect(canRedo(h)).toBe(true);
    h = syncPresentAfterSave(h, c);
    h = undoDraft(h);
    expect(h.present.project.name).toBe("A");
    h = resetDraftHistory(c);
    expect(canUndo(h)).toBe(false);
  });

  it("redo after undo restores selection", () => {
    const a = createProjectV5Seed("p", "A", "2026-07-20T12:00:00.000Z");
    const b = { ...a, name: "B" };
    let h = pushDraftHistory(createDraftHistory(a, sel("a")), b, sel("b"));
    h = undoDraft(h);
    h = redoDraft(h);
    expect(h.present.clipSelection.primaryId).toBe("b");
  });

  it("no-ops and trims stacks at maxDepth", () => {
    const a = createProjectV5Seed("p", "A", "2026-07-20T12:00:00.000Z");
    let h = createDraftHistory(a);
    expect(pushDraftHistory(h, a)).toBe(h);
    expect(undoDraft(h)).toBe(h);
    expect(redoDraft(h)).toBe(h);
    for (let i = 0; i < 5; i++) {
      h = pushDraftHistory(h, { ...h.present.project, name: `n${i}` }, sel(`s${i}`), 2);
    }
    expect(h.past.length).toBe(2);
    h = undoDraft(h, 1);
    expect(h.future.length).toBeLessThanOrEqual(1);
    h = createDraftHistory(a);
    h = pushDraftHistory(h, { ...a, name: "B" }, sel("b"), 2);
    h = pushDraftHistory(h, { ...a, name: "C" }, sel("c"), 2);
    h = undoDraft(h);
    h = undoDraft(h);
    h = redoDraft(h, 1);
    expect(h.past.length).toBeLessThanOrEqual(1);
  });
});
