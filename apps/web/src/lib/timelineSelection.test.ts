import { describe, expect, it } from "vitest";
import {
  applySoloButtonClick,
  clearSelection,
  clearTrackSelection,
  isAudioTrackSelected,
  isClipSelected,
  isMarqueeClick,
  isMultiSelectClick,
  isTrackAudibleWithSolo,
  marqueeSelectFromHits,
  primaryAudioTrackId,
  primaryLane,
  pruneTrackSelection,
  rectsIntersect,
  resolveMoveIds,
  resolveMuteButtonClick,
  selectAudioTrack,
  selectAudioTrackRange,
  selectRangeTo,
  selectSingle,
  selectedIds,
  selectionSameLane,
  setSelection,
  toggleAudioTrackSelected,
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
    expect(primaryAudioTrackId(trackSel)).toBe("tr-a");
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

  it("toggleAudioTrackSelected + selectAudioTrackRange", () => {
    const ordered = ["a", "b", "c", "d"];
    let sel = selectAudioTrack("a");
    sel = toggleAudioTrackSelected(sel, "c");
    expect(sel.ids).toEqual(["a", "c"]);
    expect(sel.primaryId).toBe("c");
    sel = toggleAudioTrackSelected(sel, "a");
    expect(sel.ids).toEqual(["c"]);
    expect(sel.primaryId).toBe("c");
    const ranged = selectAudioTrackRange(
      selectAudioTrack("b"),
      "d",
      ordered,
    );
    expect(ranged.ids).toEqual(["b", "c", "d"]);
    expect(ranged.primaryId).toBe("d");
    expect(selectAudioTrackRange(clearTrackSelection(), "c", ordered)).toEqual(
      selectAudioTrack("c"),
    );
    expect(
      pruneTrackSelection(
        { ids: ["a", "b", "gone"], primaryId: "gone" },
        new Set(["a", "b"]),
      ),
    ).toEqual({ ids: ["a", "b"], primaryId: "b" });
  });

  it("applySoloButtonClick: exclusive / global / multi", () => {
    const all = ["a", "b", "c"];
    expect(
      applySoloButtonClick([], "b", all, ["b"], { altKey: true }),
    ).toEqual(["b"]);
    expect(
      applySoloButtonClick(["b"], "b", all, ["b"], { altKey: true }),
    ).toEqual([]);
    expect(
      applySoloButtonClick(["a"], "b", all, ["a", "b"], { altKey: true }),
    ).toEqual(["b"]);
    expect(
      applySoloButtonClick([], "a", all, ["a"], { metaKey: true }),
    ).toEqual(all);
    expect(
      applySoloButtonClick(all, "a", all, ["a"], { ctrlKey: true }),
    ).toEqual([]);
    expect(
      applySoloButtonClick([], "b", all, ["a", "b", "c"], {}),
    ).toEqual(["a", "b", "c"]);
    expect(
      applySoloButtonClick(["a", "b", "c"], "b", all, ["a", "b"], {}),
    ).toEqual(["c"]);
    expect(applySoloButtonClick([], "a", all, [], {})).toEqual(["a"]);
  });

  it("resolveMuteButtonClick: global / multi / single", () => {
    const all = ["a", "b", "c"];
    expect(
      resolveMuteButtonClick("a", false, all, ["a"], { metaKey: true }),
    ).toEqual({ trackIds: all, muted: true });
    expect(
      resolveMuteButtonClick("a", true, all, ["a"], { ctrlKey: true }),
    ).toEqual({ trackIds: all, muted: false });
    expect(
      resolveMuteButtonClick("b", false, all, ["a", "b"], {}),
    ).toEqual({ trackIds: ["a", "b"], muted: true });
    expect(resolveMuteButtonClick("c", true, all, ["a"], {})).toEqual({
      trackIds: ["c"],
      muted: false,
    });
  });

  it("rectsIntersect and track/solo helpers", () => {
    expect(
      rectsIntersect(
        { left: 0, right: 10, top: 0, bottom: 10 },
        { left: 5, right: 15, top: 5, bottom: 15 },
      ),
    ).toBe(true);
    expect(
      rectsIntersect(
        { left: 0, right: 1, top: 0, bottom: 1 },
        { left: 2, right: 3, top: 2, bottom: 3 },
      ),
    ).toBe(false);
    expect(clearTrackSelection()).toEqual({ ids: [], primaryId: null });
    expect(selectAudioTrack("t1").ids).toEqual(["t1"]);
    expect(isAudioTrackSelected(selectAudioTrack("t1"), "t1")).toBe(true);
    expect(marqueeSelectFromHits([])).toEqual(clearSelection());
    expect(primaryLane(clearSelection())).toBeNull();
    expect(selectedIds(clearSelection())).toEqual([]);
    const single = selectSingle("c1", "forma");
    expect(primaryLane(single)).toBe("forma");
  });


  it("primaryLane falls back when primaryId missing from items", () => {
    const sel = {
      items: [
        { id: "a", lane: "forma" as const },
        { id: "b", lane: "tekst" as const },
      ],
      primaryId: "missing",
    };
    expect(primaryLane(sel)).toBe("tekst");
  });

  it("primaryLane uses last item when primaryId is null", () => {
    const sel = {
      items: [
        { id: "a", lane: "forma" as const },
        { id: "b", lane: "tekst" as const },
      ],
      primaryId: null,
    };
    expect(primaryLane(sel)).toBe("tekst");
  });

  it("setSelection with empty list clears primary", () => {
    expect(setSelection([], "x")).toEqual({ items: [], primaryId: null });
  });

  it("toggleSelected keeps alternate primary when deselecting non-primary", () => {
    let sel = setSelection(
      [
        { id: "a", lane: "forma" },
        { id: "b", lane: "forma" },
      ],
      "a",
    );
    sel = toggleSelected(sel, "b", "forma");
    expect(sel.primaryId).toBe("a");
    expect(sel.items).toHaveLength(1);
  });

  it("toggleSelected falls back primary when stored primaryId is ghost", () => {
    const sel = toggleSelected(
      {
        items: [
          { id: "a", lane: "forma" },
          { id: "b", lane: "forma" },
        ],
        primaryId: "ghost",
      },
      "b",
      "forma",
    );
    expect(sel.items).toEqual([{ id: "a", lane: "forma" }]);
    expect(sel.primaryId).toBe("a");
  });

});
