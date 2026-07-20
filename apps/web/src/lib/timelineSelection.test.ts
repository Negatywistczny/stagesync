import { describe, expect, it } from "vitest";
import {
  clearSelection,
  isMarqueeClick,
  isMultiSelectClick,
  marqueeSelectFromHits,
  resolveMoveIds,
  selectRangeTo,
  selectSingle,
  selectionSameLane,
  setSelection,
  toggleSelected,
} from "./timelineSelection.js";

describe("timelineSelection", () => {
  it("selectSingle / setSelection primary fallback", () => {
    expect(selectSingle("a", "forma")).toEqual({
      lane: "forma",
      selectedIds: ["a"],
      primaryId: "a",
    });
    expect(setSelection(["a", "b"], "missing", "tekst")).toEqual({
      lane: "tekst",
      selectedIds: ["a", "b"],
      primaryId: "b",
    });
  });

  it("toggleSelected same-lane add/remove; cross-lane replaces", () => {
    let s = selectSingle("a", "forma");
    s = toggleSelected(s, "b", "forma");
    expect(s.selectedIds).toEqual(["a", "b"]);
    expect(s.primaryId).toBe("b");
    s = toggleSelected(s, "a", "forma");
    expect(s.selectedIds).toEqual(["b"]);
    expect(s.primaryId).toBe("b");
    s = toggleSelected(s, "x", "tekst");
    expect(s).toEqual(selectSingle("x", "tekst"));
    s = toggleSelected(s, "x", "tekst");
    expect(s).toEqual(clearSelection());
  });

  it("selectRangeTo on ordered lane clips", () => {
    const lane = [
      { id: "a", startTicks: 0 },
      { id: "b", startTicks: 100 },
      { id: "c", startTicks: 200 },
    ];
    const anchor = selectSingle("a", "forma");
    const ranged = selectRangeTo(anchor, "c", "forma", lane);
    expect(ranged.selectedIds).toEqual(["a", "b", "c"]);
    expect(ranged.primaryId).toBe("c");
    expect(selectRangeTo(anchor, "c", "tekst", lane)).toEqual(
      selectSingle("c", "tekst"),
    );
  });

  it("selectionSameLane + resolveMoveIds", () => {
    const multi = setSelection(["a", "b", "c"], "b", "akordy");
    expect(selectionSameLane(multi, "akordy")).toBe(true);
    expect(resolveMoveIds(multi, "b", "akordy")).toEqual(["a", "b", "c"]);
    expect(resolveMoveIds(multi, "z", "akordy")).toEqual(["z"]);
    expect(resolveMoveIds(multi, "b", "forma")).toEqual(["b"]);
  });

  it("isMultiSelectClick ignores Alt (temporary zoom in v4)", () => {
    expect(isMultiSelectClick({ metaKey: true })).toBe(true);
    expect(isMultiSelectClick({ ctrlKey: true, altKey: true })).toBe(false);
  });

  it("marqueeSelectFromHits keeps last-hit lane only", () => {
    const sel = marqueeSelectFromHits([
      { id: "f1", lane: "forma" },
      { id: "t1", lane: "tekst" },
      { id: "f2", lane: "forma" },
    ]);
    expect(sel.lane).toBe("forma");
    expect(sel.selectedIds).toEqual(["f1", "f2"]);
    expect(sel.primaryId).toBe("f2");
  });

  it("isMarqueeClick threshold", () => {
    expect(isMarqueeClick(2, 2)).toBe(true);
    expect(isMarqueeClick(5, 0)).toBe(false);
  });
});
