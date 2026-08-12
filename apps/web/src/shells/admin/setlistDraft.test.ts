import { describe, it, expect } from "vitest";
import {
  newBreakId,
  viewItemsToDraft,
  draftToSetlistItems,
  projectDurationMs,
  estimateTotalMs,
  type DraftItem,
} from "./setlistDraft.js";

describe("setlistDraft", () => {
  it("generates random break ids", () => {
    const id1 = newBreakId();
    const id2 = newBreakId();
    expect(id1).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it("converts view items to draft items and back", () => {
    const view: any = {
      items: [
        { type: "project", projectId: "p1" },
        { type: "break", id: "b1", label: "Przerwa", durationMinutes: 15 },
      ],
    };

    const draft = viewItemsToDraft(view);
    expect(draft).toHaveLength(2);
    expect(draft[0]).toEqual({ type: "project", projectId: "p1" });
    expect(draft[1]).toEqual({
      type: "break",
      id: "b1",
      label: "Przerwa",
      durationMinutes: 15,
    });

    const setlistItems = draftToSetlistItems(draft);
    expect(setlistItems).toHaveLength(2);
  });

  it("calculates project duration with fallback and estimates total duration", () => {
    const entryWithDur: any = { id: "p1", durationMs: 180000 };
    expect(projectDurationMs(entryWithDur)).toBe(180000);
    expect(projectDurationMs(undefined)).toBeGreaterThan(0);

    const draft: DraftItem[] = [
      { type: "project", projectId: "p1" },
      { type: "break", id: "b1", label: "Przerwa", durationMinutes: 10 },
    ];
    const byId = new Map([["p1", entryWithDur]]);

    const totalMs = estimateTotalMs(draft, byId);
    expect(totalMs).toBe(180000 + 10 * 60 * 1000);
  });
});
