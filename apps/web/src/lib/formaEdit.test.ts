import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  cascadeFormaMoveIds,
  commitGesture,
  commitMoveClip,
  commitMoveClips,
  commitResizeClip,
  commitSubsectionBoundaryMove,
  commitPencilSpan,
  deleteFormaClip,
  formaSectionCoveringTicks,
  insertFormaSubsectionAt,
  previewFromSession,
  splitFormaClipAt,
} from "./formaEdit.js";
import type { FormaGestureSession } from "./timelineGesture.js";

function seed() {
  return createProjectV5Seed("p1", "Song", "2026-07-20T12:00:00.000Z");
}

describe("formaEdit", () => {
  it("deleteFormaClip removes section, not countdown", () => {
    const p = seed();
    const next = deleteFormaClip(p, "forma-intro");
    expect(next.forma.clips.some((c) => c.id === "forma-intro")).toBe(false);
    expect(deleteFormaClip(p, "forma-cd")).toBe(p);
  });

  it("commitPencilSpan creates multi-bar section", () => {
    const p = seed();
    const next = commitPencilSpan(p, 0, 15360, "A", "bar");
    const a = next.forma.clips.find((c) => c.name === "A");
    expect(a?.startTicks).toBe(0);
    expect(a?.lengthTicks).toBe(15360);
  });

  it("preview move re-evals snap off via metaKey", () => {
    const p = seed();
    const session: FormaGestureSession = {
      kind: "move",
      clipId: "forma-intro",
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 7680,
    };
    const snapped = previewFromSession(p, session, 1000, false, false);
    expect(snapped.startTicks % 7680 === 0 || snapped.startTicks === 0).toBe(
      true,
    );
    const free = previewFromSession(p, session, 1000, true, false);
    expect(free.startTicks).toBe(1000);
  });

  it("commitGesture pencil-draw does not mutate until commit", () => {
    const p = seed();
    const session: FormaGestureSession = {
      kind: "pencil-draw",
      clipId: null,
      pointerId: 1,
      originTicks: 7680,
      originClipStart: 0,
      originClipLength: 0,
    };
    const preview = previewFromSession(p, session, 15360, false, false, "X");
    expect(p.forma.clips).toHaveLength(2);
    const next = commitGesture(p, session, preview, false, false);
    expect(next.forma.clips.some((c) => c.name === "X")).toBe(true);
  });

  it("insertFormaSubsectionAt adds interior boundary + 4-bar fill on long spans", () => {
    const p = seed();
    // Seed intro is 2 bars — scissors at mid → [3840], no extra fill
    const next = insertFormaSubsectionAt(p, "forma-intro", 3840);
    const intro = next.forma.clips.find((c) => c.id === "forma-intro");
    expect(intro?.lengthTicks).toBe(7680);
    expect(intro?.subsections).toEqual([3840]);
    expect(next.forma.clips.filter((c) => c.kind === "section")).toHaveLength(
      1,
    );

    // Grow to 8 bars then scissors at 1 bar → fill right span
    const long = {
      ...p,
      forma: {
        clips: p.forma.clips.map((c) =>
          c.id === "forma-intro" ? { ...c, lengthTicks: 8 * 3840 } : c,
        ),
      },
    };
    const cut = insertFormaSubsectionAt(long, "forma-intro", 3840);
    expect(
      cut.forma.clips.find((c) => c.id === "forma-intro")?.subsections,
    ).toEqual([3840, 3840 + 4 * 3840]);
  });

  it("splitFormaClipAt aliases insertFormaSubsectionAt", () => {
    const p = seed();
    const next = splitFormaClipAt(p, "forma-intro", 3840);
    expect(
      next.forma.clips.find((c) => c.id === "forma-intro")?.subsections,
    ).toEqual([3840]);
  });

  it("preview subsection-boundary updates offsets", () => {
    const p = seed();
    const withSub = insertFormaSubsectionAt(p, "forma-intro", 3840);
    const session: FormaGestureSession = {
      kind: "subsection-boundary",
      clipId: "forma-intro",
      pointerId: 1,
      originTicks: 3840,
      originClipStart: 0,
      originClipLength: 7680,
      boundarySubIdx: 1,
      originBoundaryRel: 3840,
    };
    const preview = previewFromSession(withSub, session, 0, false, false);
    // Drag to section start → merge → empty subsections
    expect(preview.subsections ?? []).toEqual([]);
  });

  it("preview move delta uses continuous raw ticks then bar snap", () => {
    const p = seed();
    const session: FormaGestureSession = {
      kind: "move",
      clipId: "forma-intro",
      pointerId: 1,
      originTicks: 1920,
      originClipStart: 0,
      originClipLength: 7680,
    };
    // Drag ~1 bar worth of continuous ticks → snaps to next barline (3840).
    const preview = previewFromSession(p, session, 1920 + 3840, false, false);
    expect(preview.startTicks).toBe(3840);
    expect(preview.lengthTicks).toBe(7680);
  });

  it("preview resize-end follows continuous pointer then snaps", () => {
    const p = seed();
    const session: FormaGestureSession = {
      kind: "resize-end",
      clipId: "forma-intro",
      pointerId: 1,
      originTicks: 7680,
      originClipStart: 0,
      originClipLength: 7680,
    };
    // 9680 is past mid-bar → nearest barline 11520
    const preview = previewFromSession(p, session, 7680 + 2000, false, false);
    expect(preview.startTicks).toBe(0);
    expect(preview.lengthTicks).toBe(11520);
    const grown = previewFromSession(p, session, 15360, false, false);
    expect(grown.lengthTicks).toBe(15360);
  });

  it("countdown-length gesture lengthens CD and keeps post-CD at tick 0", () => {
    const p = seed();
    const session: FormaGestureSession = {
      kind: "countdown-length",
      clipId: "forma-cd",
      pointerId: 1,
      originTicks: 0,
      originClipStart: -7680,
      originClipLength: 7680,
    };
    const preview = previewFromSession(p, session, 3840, false, false);
    expect(preview.kind).toBe("countdown-length");
    expect(preview.lengthTicks).toBe(11520);
    expect(preview.startTicks).toBe(-11520);
    const next = commitGesture(p, session, preview, false, false);
    const cd = next.forma.clips.find((c) => c.id === "forma-cd")!;
    const intro = next.forma.clips.find((c) => c.id === "forma-intro")!;
    expect(cd.lengthTicks).toBe(11520);
    expect(cd.startTicks + cd.lengthTicks).toBe(0);
    expect(intro.startTicks).toBe(0);
  });

  it("countdown-length gesture shortens to min 1 bar", () => {
    const p = seed();
    const session: FormaGestureSession = {
      kind: "countdown-length",
      clipId: "forma-cd",
      pointerId: 1,
      originTicks: 0,
      originClipStart: -7680,
      originClipLength: 7680,
    };
    const preview = previewFromSession(p, session, -10000, false, false);
    expect(preview.lengthTicks).toBe(3840);
    const next = commitGesture(p, session, preview, false, false);
    const cd = next.forma.clips.find((c) => c.id === "forma-cd")!;
    expect(cd.lengthTicks).toBe(3840);
    expect(cd.startTicks).toBe(-3840);
  });

  it("formaSectionCoveringTicks finds section under cursor, not countdown", () => {
    const p = seed();
    expect(formaSectionCoveringTicks(p, -100)).toBeNull();
    expect(formaSectionCoveringTicks(p, 100)?.id).toBe("forma-intro");
    expect(formaSectionCoveringTicks(p, 50_000)).toBeNull();
  });

  it("cascadeFormaMoveIds includes target and later sections, not countdown", () => {
    const p = commitPencilSpan(seed(), 7680, 7680, "A", "bar");
    const ids = cascadeFormaMoveIds(p.forma.clips, "forma-intro");
    expect(ids).toContain("forma-intro");
    expect(ids.some((id) => p.forma.clips.find((c) => c.id === id)?.name === "A")).toBe(
      true,
    );
    expect(ids).not.toContain("forma-cd");
    expect(cascadeFormaMoveIds(p.forma.clips, "forma-cd")).toEqual(["forma-cd"]);
  });
});

describe("formaEdit remaining coverage", () => {
  it("commitSubsectionBoundaryMove updates and no-ops", () => {
    const p = seed();
    const withSub = insertFormaSubsectionAt(p, "forma-intro", 3840);
    const moved = commitSubsectionBoundaryMove(withSub, "forma-intro", 1, 1920, "off");
    expect(moved.forma.clips.find((c) => c.id === "forma-intro")?.subsections).toEqual([1920]);
    expect(commitSubsectionBoundaryMove(withSub, "forma-cd", 1, 0)).toBe(withSub);
    expect(commitSubsectionBoundaryMove(withSub, "missing", 1, 0)).toBe(withSub);
    expect(commitSubsectionBoundaryMove(withSub, "forma-intro", 1, 3840)).toBe(withSub);
    expect(commitSubsectionBoundaryMove(withSub, "forma-intro", 99, 100)).toBe(withSub);
  });

  it("commitPencilSpan swaps inverted range and min bar length", () => {
    const p = seed();
    const swapped = commitPencilSpan(p, 7680, 0, "Swap", "bar");
    expect(swapped.forma.clips.find((c) => c.name === "Swap")?.startTicks).toBe(0);
    const tiny = commitPencilSpan(p, 7680, 7680, "Tiny", "off");
    expect(tiny.forma.clips.find((c) => c.name === "Tiny")!.lengthTicks).toBeGreaterThanOrEqual(1);
  });

  it("commitMoveClip / commitMoveClips / commitResizeClip", () => {
    let p = commitPencilSpan(seed(), 7680, 15360, "B", "bar");
    const intro = p.forma.clips.find((c) => c.id === "forma-intro")!;
    p = commitMoveClip(p, intro.id, 3840, "bar");
    expect(p.forma.clips.find((c) => c.id === intro.id)!.startTicks).toBeGreaterThanOrEqual(0);

    const multi = commitMoveClips(p, ["forma-intro"], "forma-intro", 0, "bar");
    expect(multi.forma.clips.find((c) => c.id === "forma-intro")).toBeTruthy();

    const ids = cascadeFormaMoveIds(p.forma.clips, "forma-intro");
    const introStart = p.forma.clips.find((c) => c.id === "forma-intro")!.startTicks;
    expect(commitMoveClips(p, ids, "forma-intro", introStart, "off")).toBe(p);
    expect(commitMoveClips(p, ids, "forma-cd", 0, "off")).toBe(p);
    const shifted = commitMoveClips(p, ids, "forma-intro", introStart + 7680, "bar");
    expect(shifted).not.toBe(p);

    const alone = seed();
    const resized = commitResizeClip(alone, "forma-intro", "end", 15360, "bar");
    expect(resized.forma.clips.find((c) => c.id === "forma-intro")!.lengthTicks).toBe(15360);
    const startEdge = commitResizeClip(alone, "forma-intro", "start", 1920, "off");
    expect(startEdge.forma.clips.find((c) => c.id === "forma-intro")!.startTicks).toBe(1920);
  });

  it("previewFromSession covers pencil/resize/countdown clientX paths", () => {
    const p = seed();
    const pencil: FormaGestureSession = {
      kind: "pencil-draw",
      clipId: null,
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 0,
      originClientX: 10,
    };
    const same = previewFromSession(p, pencil, 0, false, false, "N", 10);
    expect(same.lengthTicks).toBeGreaterThan(0);
    const dragged = previewFromSession(p, pencil, 7680, false, false, "N", 40);
    expect(dragged.startTicks).toBe(0);
    const noClient = previewFromSession(
      p,
      { ...pencil, originClientX: undefined },
      7680,
      false,
      false,
      "N",
    );
    expect(noClient.lengthTicks).toBeGreaterThan(0);
    const sameTick = previewFromSession(
      p,
      { ...pencil, originClientX: undefined },
      0,
      false,
      false,
      "N",
    );
    expect(sameTick.lengthTicks).toBeGreaterThan(0);


    const resizeStart: FormaGestureSession = {
      kind: "resize-start",
      clipId: "forma-intro",
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 7680,
    };
    const rs = previewFromSession(p, resizeStart, 1920, true, false);
    expect(rs.kind).toBe("resize-start");
    const clamp = previewFromSession(p, resizeStart, 20_000, true, false);
    expect(clamp.lengthTicks).toBeGreaterThan(0);

    const subMissing: FormaGestureSession = {
      kind: "subsection-boundary",
      clipId: "missing",
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 7680,
    };
    expect(previewFromSession(p, subMissing, 100, false, false).kind).toBe(
      "subsection-boundary",
    );

    const cd: FormaGestureSession = {
      kind: "countdown-length",
      clipId: "forma-cd",
      pointerId: 1,
      originTicks: 0,
      originClipStart: -7680,
      originClipLength: 7680,
      originClientX: 100,
    };
    const viaPx = previewFromSession(p, cd, 0, false, false, undefined, 150, 48);
    expect(viaPx.kind).toBe("countdown-length");
    const off = previewFromSession(p, cd, 3840, true, false);
    expect(off.lengthTicks % 3840).toBe(0);

    const re: FormaGestureSession = {
      kind: "resize-end",
      clipId: "forma-intro",
      pointerId: 1,
      originTicks: 7680,
      originClipStart: 0,
      originClipLength: 7680,
    };
    const tinyEnd = previewFromSession(p, re, -100, true, false);
    expect(tinyEnd.lengthTicks).toBe(3840);
  });

  it("commitGesture covers move/resize/subsection/default guards", () => {
    const p = seed();
    const withSub = insertFormaSubsectionAt(p, "forma-intro", 3840);
    const moveSession: FormaGestureSession = {
      kind: "move",
      clipId: null,
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 7680,
    };
    expect(
      commitGesture(p, moveSession, { kind: "move", clipId: null, startTicks: 0, lengthTicks: 7680 }, false, false),
    ).toBe(p);

    const moveOk: FormaGestureSession = {
      kind: "move",
      clipId: "forma-intro",
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 7680,
    };
    const moved = commitGesture(
      p,
      moveOk,
      { kind: "move", clipId: "forma-intro", startTicks: 3840, lengthTicks: 7680 },
      false,
      false,
    );
    expect(moved.forma.clips.find((c) => c.id === "forma-intro")!.startTicks).toBe(3840);

    const multiIds = cascadeFormaMoveIds(p.forma.clips, "forma-intro");
    const multiSession: FormaGestureSession = {
      ...moveOk,
      moveIds: multiIds.length > 1 ? multiIds : ["forma-intro", "x"],
    };
    // ensure multi path: add another section
    const withB = commitPencilSpan(p, 7680, 15360, "B", "bar");
    const ids = cascadeFormaMoveIds(withB.forma.clips, "forma-intro");
    const multi = commitGesture(
      withB,
      { ...moveOk, moveIds: ids },
      { kind: "move", clipId: "forma-intro", startTicks: 3840, lengthTicks: 7680 },
      false,
      false,
    );
    expect(multi).not.toBe(withB);

    for (const kind of ["resize-start", "resize-end"] as const) {
      expect(
        commitGesture(
          p,
          { kind, clipId: null, pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 7680 },
          { kind, clipId: null, startTicks: 0, lengthTicks: 7680 },
          false,
          false,
        ),
      ).toBe(p);
    }
    const rs = commitGesture(
      p,
      { kind: "resize-start", clipId: "forma-intro", pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 7680 },
      { kind: "resize-start", clipId: "forma-intro", startTicks: 1920, lengthTicks: 5760 },
      true,
      false,
    );
    expect(rs.forma.clips.find((c) => c.id === "forma-intro")!.startTicks).toBe(1920);
    const re = commitGesture(
      p,
      { kind: "resize-end", clipId: "forma-intro", pointerId: 1, originTicks: 7680, originClipStart: 0, originClipLength: 7680 },
      { kind: "resize-end", clipId: "forma-intro", startTicks: 0, lengthTicks: 11520 },
      false,
      false,
    );
    expect(re.forma.clips.find((c) => c.id === "forma-intro")!.lengthTicks).toBe(11520);

    expect(
      commitGesture(
        p,
        { kind: "countdown-length", clipId: null, pointerId: 1, originTicks: 0, originClipStart: -7680, originClipLength: 7680 },
        { kind: "countdown-length", clipId: null, startTicks: -7680, lengthTicks: 7680 },
        false,
        false,
      ),
    ).toBe(p);

    // fallback setCountdownBars when boundary apply returns same project
    const cdSame = commitGesture(
      p,
      { kind: "countdown-length", clipId: "forma-cd", pointerId: 1, originTicks: 0, originClipStart: -7680, originClipLength: 7680 },
      { kind: "countdown-length", clipId: "forma-cd", startTicks: -7680, lengthTicks: 7680 },
      false,
      false,
    );
    expect(cdSame.forma.clips.find((c) => c.kind === "countdown")!.lengthTicks).toBe(7680);

    expect(
      commitGesture(
        withSub,
        { kind: "subsection-boundary", clipId: null, pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 7680 },
        { kind: "subsection-boundary", clipId: null, startTicks: 0, lengthTicks: 7680, subsections: [1920] },
        false,
        false,
      ),
    ).toBe(withSub);
    expect(
      commitGesture(
        withSub,
        { kind: "subsection-boundary", clipId: "missing", pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 7680 },
        { kind: "subsection-boundary", clipId: "missing", startTicks: 0, lengthTicks: 7680, subsections: [1] },
        false,
        false,
      ),
    ).toBe(withSub);
    expect(
      commitGesture(
        withSub,
        { kind: "subsection-boundary", clipId: "forma-intro", pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 7680 },
        { kind: "subsection-boundary", clipId: "forma-intro", startTicks: 0, lengthTicks: 7680, subsections: [3840] },
        false,
        false,
      ),
    ).toBe(withSub);
    const subChanged = commitGesture(
      withSub,
      { kind: "subsection-boundary", clipId: "forma-intro", pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 7680 },
      { kind: "subsection-boundary", clipId: "forma-intro", startTicks: 0, lengthTicks: 7680, subsections: [1920] },
      false,
      false,
    );
    expect(subChanged.forma.clips.find((c) => c.id === "forma-intro")?.subsections).toEqual([1920]);
    const cleared = commitGesture(
      withSub,
      { kind: "subsection-boundary", clipId: "forma-intro", pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 7680 },
      { kind: "subsection-boundary", clipId: "forma-intro", startTicks: 0, lengthTicks: 7680, subsections: [] },
      false,
      false,
    );
    expect(cleared.forma.clips.find((c) => c.id === "forma-intro")?.subsections).toBeUndefined();

    expect(
      commitGesture(
        p,
        { kind: "fade-in", clipId: "x", pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 1 },
        { kind: "fade-in", clipId: "x", startTicks: 0, lengthTicks: 1 },
        false,
        false,
      ),
    ).toBe(p);
  });
});
