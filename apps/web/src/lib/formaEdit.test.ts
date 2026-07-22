import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  cascadeFormaMoveIds,
  commitGesture,
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
