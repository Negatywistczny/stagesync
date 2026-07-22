import { describe, expect, it } from "vitest";
import {
  isAudioTrackSelected,
  isClipSelected,
  isMarqueeClick,
  isMultiSelectClick,
  isTrackAudibleWithSolo,
  marqueeSelectFromHits,
  primaryLane,
  resolveMoveIds,
  selectAudioTrack,
  selectRangeTo,
  selectSingle,
  selectionSameLane,
  setSelection,
  toggleSelected,
  toggleSoloTrackId,
} from "./timelineSelection.js";

describe("timelineSelection", () => {
  it("selectSingle / setSelection primary fallback", () => {
    expect(selectSingle("a", "forma")).toEqual({
      items: [{ id: "a", lane: "forma" }],
      primaryId: "a",
    });
    expect(
      setSelection(
        [
          { id: "a", lane: "tekst" },
          { id: "b", lane: "tekst" },
        ],
        "missing",
      ),
    ).toEqual({
      items: [
        { id: "a", lane: "tekst" },
        { id: "b", lane: "tekst" },
      ],
      primaryId: "b",
    });
  });

  it("toggleSelected adds across lanes; removes same id+lane", () => {
    let s = selectSingle("a", "forma");
    s = toggleSelected(s, "b", "forma");
    expect(s.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(s.primaryId).toBe("b");
    s = toggleSelected(s, "a", "forma");
    expect(s.items.map((i) => i.id)).toEqual(["b"]);
    expect(s.primaryId).toBe("b");
    s = toggleSelected(s, "x", "tekst");
    expect(s.items).toEqual([
      { id: "b", lane: "forma" },
      { id: "x", lane: "tekst" },
    ]);
    expect(primaryLane(s)).toBe("tekst");
    s = toggleSelected(s, "x", "tekst");
    expect(s.items).toEqual([{ id: "b", lane: "forma" }]);
  });

  it("selectRangeTo on ordered lane clips keeps other lanes", () => {
    const lane = [
      { id: "a", startTicks: 0 },
      { id: "b", startTicks: 100 },
      { id: "c", startTicks: 200 },
    ];
    let s = selectSingle("t1", "tekst");
    s = toggleSelected(s, "a", "forma");
    const ranged = selectRangeTo(s, "c", "forma", lane);
    expect(ranged.items).toEqual([
      { id: "t1", lane: "tekst" },
      { id: "a", lane: "forma" },
      { id: "b", lane: "forma" },
      { id: "c", lane: "forma" },
    ]);
    expect(ranged.primaryId).toBe("c");
    expect(selectRangeTo(selectSingle("a", "forma"), "c", "tekst", lane)).toEqual(
      selectSingle("c", "tekst"),
    );
  });

  it("selectionSameLane + resolveMoveIds (same-lane subset)", () => {
    const multi = setSelection(
      [
        { id: "a", lane: "akordy" },
        { id: "b", lane: "akordy" },
        { id: "c", lane: "akordy" },
        { id: "f", lane: "forma" },
      ],
      "b",
    );
    expect(selectionSameLane(multi, "akordy")).toBe(true);
    expect(resolveMoveIds(multi, "b", "akordy")).toEqual(["a", "b", "c"]);
    expect(resolveMoveIds(multi, "z", "akordy")).toEqual(["z"]);
    expect(resolveMoveIds(multi, "f", "forma")).toEqual(["f"]);
    expect(isClipSelected(multi, "f", "forma")).toBe(true);
    expect(isClipSelected(multi, "f", "akordy")).toBe(false);
  });

  it("isMultiSelectClick ignores Alt (temporary zoom in v4)", () => {
    expect(isMultiSelectClick({ metaKey: true })).toBe(true);
    expect(isMultiSelectClick({ ctrlKey: true, altKey: true })).toBe(false);
  });

  it("marqueeSelectFromHits keeps all lanes", () => {
    const sel = marqueeSelectFromHits([
      { id: "f1", lane: "forma" },
      { id: "t1", lane: "tekst" },
      { id: "f2", lane: "forma" },
    ]);
    expect(sel.items).toEqual([
      { id: "f1", lane: "forma" },
      { id: "t1", lane: "tekst" },
      { id: "f2", lane: "forma" },
    ]);
    expect(sel.primaryId).toBe("f2");
    expect(primaryLane(sel)).toBe("forma");
  });

  it("isMarqueeClick threshold", () => {
    expect(isMarqueeClick(2, 2)).toBe(true);
    expect(isMarqueeClick(5, 0)).toBe(false);
  });

  it("selectAudioTrack + solo set", () => {
    const trackSel = selectAudioTrack("tr-a");
    expect(isAudioTrackSelected(trackSel, "tr-a")).toBe(true);
    expect(isAudioTrackSelected(trackSel, "tr-b")).toBe(false);
    let solo = toggleSoloTrackId([], "tr-a");
    expect(solo).toEqual(["tr-a"]);
    solo = toggleSoloTrackId(solo, "tr-b");
    expect(solo).toEqual(["tr-a", "tr-b"]);
    solo = toggleSoloTrackId(solo, "tr-a");
    expect(solo).toEqual(["tr-b"]);
    expect(isTrackAudibleWithSolo("tr-a", false, [])).toBe(true);
    expect(isTrackAudibleWithSolo("tr-a", true, [])).toBe(false);
    expect(isTrackAudibleWithSolo("tr-a", false, ["tr-b"])).toBe(false);
    expect(isTrackAudibleWithSolo("tr-b", false, ["tr-b"])).toBe(true);
  });
});
