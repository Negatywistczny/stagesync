import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  commitContentGesture,
  commitMoveContentClip,
  commitMoveContentClips,
  commitPencilContentSpan,
  commitResizeContentClip,
  contentAsForma,
  contentClipCoveringTicks,
  defaultPencilLabel,
  previewContentFromSession,
  resolveSplitParentId,
  splitContentClipAt,
} from "./contentLaneEdit.js";
import { pencilTekstClick } from "./tekstEdit.js";
import { pencilAkordyClick } from "./akordyEdit.js";
import { pencilCueClick } from "./cueEdit.js";
import type {
  FormaGestureSession,
} from "./timelineGesture.js";
import {
  setSessionSnapMode,
} from "./timelineGesture.js";

describe("contentLaneEdit", () => {
  it("finds content clip covering ticks for scissors hit-test", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilTekstClick(p, 0, "A");
    p = pencilTekstClick(p, 3840, "B");
    const a = p.tekst.clips.find((c) => c.text === "A")!;
    expect(contentClipCoveringTicks(p, "tekst", a.startTicks + 1)?.id).toBe(
      a.id,
    );
    expect(contentClipCoveringTicks(p, "tekst", -1)).toBeNull();
    expect(contentClipCoveringTicks(p, "tekst", 3840 * 4)).toBeNull();
  });

  it("moves tekst clip without overlap", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilTekstClick(p, 0, "A");
    p = pencilTekstClick(p, 3840, "B");
    const id = p.tekst.clips.find((c) => c.text === "A")!.id;
    p = commitMoveContentClip(p, "tekst", id, 7680, "bar");
    const moved = p.tekst.clips.find((c) => c.id === id)!;
    expect(moved.startTicks).toBe(7680);
    expect(moved.text).toBe("A");
  });

  it("resizes akordy clip end", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilAkordyClick(p, 0, "C");
    const id = p.akordy.clips[0]!.id;
    p = commitResizeContentClip(p, "akordy", id, "end", 7680, "bar");
    expect(p.akordy.clips[0]!.lengthTicks).toBe(7680);
    expect(p.akordy.clips[0]!.symbol).toBe("C");
  });

  it("resizes cue clip start", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilCueClick(p, 0, "Go");
    const id = p.cue.clips[0]!.id;
    p = commitResizeContentClip(p, "cue", id, "start", 1920, "off");
    expect(p.cue.clips[0]!.startTicks).toBe(1920);
    expect(p.cue.clips[0]!.label).toBe("Go");
  });

  it("commitPencilContentSpan creates multi-bar tekst clip", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const next = commitPencilContentSpan(p, "tekst", 0, 15360, "bar");
    expect(next.tekst.clips).toHaveLength(1);
    expect(next.tekst.clips[0]!.startTicks).toBe(0);
    expect(next.tekst.clips[0]!.lengthTicks).toBe(15360);
  });

  it("pencil-draw gesture preview snaps content to beat grid", () => {
    setSessionSnapMode("beat");
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const session: FormaGestureSession = {
      kind: "move",
      clipId: "x",
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 3840,
      lane: "tekst",
    };
    // 500 ticks → nearest beat 960 (not barline 0) when session snap = beat
    const preview = previewContentFromSession(p, session, 500, false, false);
    expect(preview.startTicks).toBe(960);
    setSessionSnapMode("bar");
  });

  it("pencil-draw gesture preview + commit (akordy) matches Forma path", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const session: FormaGestureSession = {
      kind: "pencil-draw",
      clipId: null,
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 0,
      lane: "akordy",
      originClientX: 100,
    };
    const preview = previewContentFromSession(
      p,
      session,
      15360,
      false,
      false,
      160,
    );
    expect(preview.kind).toBe("pencil-draw");
    expect(preview.startTicks).toBe(0);
    expect(preview.lengthTicks).toBe(15360);
    const next = commitContentGesture(
      p,
      "akordy",
      session,
      preview,
      false,
      false,
    );
    expect(next.akordy.clips[0]!.lengthTicks).toBe(15360);
    expect(next.akordy.clips[0]!.symbol).toBe("C");
  });

  it("pencil-draw click (dx < threshold) inserts 1 bar on cue", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const session: FormaGestureSession = {
      kind: "pencil-draw",
      clipId: null,
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 0,
      lane: "cue",
      originClientX: 50,
    };
    const preview = previewContentFromSession(
      p,
      session,
      200,
      false,
      false,
      52,
    );
    // 4/4 @ PPQ 960 → 1 bar = 3840
    expect(preview.lengthTicks).toBe(3840);
    const next = commitContentGesture(p, "cue", session, preview, false, false);
    expect(next.cue.clips[0]!.lengthTicks).toBe(3840);
    expect(next.cue.clips[0]!.label).toBe("Cue");
  });
});

describe("contentLaneEdit remaining", () => {
  it("covers akordy/cue hit-test, split, multi-move, pencil edges, gestures", () => {
    expect(defaultPencilLabel("tekst")).toBe("…");
    expect(defaultPencilLabel("akordy")).toBe("C");
    expect(defaultPencilLabel("cue")).toBe("Cue");
    expect(resolveSplitParentId("a-r-r")).toBe("a");

    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilAkordyClick(p, 0, "G");
    p = pencilCueClick(p, 0, "Go");
    expect(contentClipCoveringTicks(p, "akordy", 1)?.id).toBe(p.akordy.clips[0]!.id);
    expect(contentClipCoveringTicks(p, "cue", 1)?.id).toBe(p.cue.clips[0]!.id);

    p = pencilTekstClick(p, 0, "A");
    const tid = p.tekst.clips[0]!.id;
    const split = splitContentClipAt(p, "tekst", tid, 1920, "off");
    expect(split.tekst.clips.length).toBeGreaterThan(1);
    expect(splitContentClipAt(p, "tekst", "missing", 100)).toBe(p);

    p = pencilTekstClick(createProjectV5Seed("p2", "S", "2026-07-20T12:00:00.000Z"), 0, "A");
    p = pencilTekstClick(p, 3840, "B");
    const a = p.tekst.clips.find((c) => c.text === "A")!;
    const b = p.tekst.clips.find((c) => c.text === "B")!;
    expect(commitMoveContentClips(p, "tekst", [a.id], a.id, 7680, "bar").tekst.clips.find((c) => c.id === a.id)!.startTicks).toBe(7680);
    expect(commitMoveContentClips(p, "tekst", [a.id, b.id], "missing", 100, "off")).toBe(p);
    expect(commitMoveContentClips(p, "tekst", [a.id, b.id], a.id, a.startTicks, "off")).toBe(p);
    const multi = commitMoveContentClips(p, "tekst", [a.id, b.id], a.id, 7680, "bar");
    expect(multi.tekst.clips.find((c) => c.id === a.id)!.startTicks).toBe(7680);

    expect(contentAsForma(p, "tekst")[0]!.kind).toBe("section");

    const swapped = commitPencilContentSpan(p, "tekst", 7680, 0, "bar");
    expect(swapped.tekst.clips.some((c) => c.startTicks === 0)).toBe(true);
    const tiny = commitPencilContentSpan(p, "akordy", 7680, 7680, "off");
    expect(tiny.akordy.clips[0]!.lengthTicks).toBeGreaterThanOrEqual(1);
    const overCue = commitPencilContentSpan(
      { ...p, cue: { clips: [{ id: "c1", startTicks: 0, lengthTicks: 7680, label: "Old", roles: ["grid"], priority: "alert" }] } },
      "cue",
      0,
      3840,
      "bar",
    );
    expect(overCue.cue.clips.some((c) => c.label === "Cue" || c.label === "Old")).toBe(true);

    const sessionMove: FormaGestureSession = {
      kind: "move",
      clipId: a.id,
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 3840,
      moveIds: [a.id, b.id],
    };
    const moved = commitContentGesture(
      p,
      "tekst",
      sessionMove,
      { kind: "move", clipId: a.id, startTicks: 7680, lengthTicks: 3840 },
      false,
      false,
    );
    expect(moved.tekst.clips.find((c) => c.id === a.id)!.startTicks).toBe(7680);
    expect(
      commitContentGesture(p, "tekst", { ...sessionMove, clipId: null }, { kind: "move", clipId: null, startTicks: 0, lengthTicks: 1 }, false, false),
    ).toBe(p);
    expect(
      commitContentGesture(p, "tekst", { kind: "resize-start", clipId: null, pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 1 }, { kind: "resize-start", clipId: null, startTicks: 0, lengthTicks: 1 }, false, false),
    ).toBe(p);
    expect(
      commitContentGesture(p, "tekst", { kind: "resize-end", clipId: null, pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 1 }, { kind: "resize-end", clipId: null, startTicks: 0, lengthTicks: 1 }, false, false),
    ).toBe(p);
    const rs = commitContentGesture(
      p,
      "tekst",
      { kind: "resize-start", clipId: a.id, pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: a.lengthTicks },
      { kind: "resize-start", clipId: a.id, startTicks: 960, lengthTicks: a.lengthTicks - 960 },
      true,
      false,
    );
    expect(rs.tekst.clips.find((c) => c.id === a.id)!.startTicks).toBe(960);
    const re = commitContentGesture(
      p,
      "tekst",
      { kind: "resize-end", clipId: a.id, pointerId: 1, originTicks: a.lengthTicks, originClipStart: 0, originClipLength: a.lengthTicks },
      { kind: "resize-end", clipId: a.id, startTicks: 0, lengthTicks: 7680 },
      false,
      false,
    );
    expect(re.tekst.clips.find((c) => c.id === a.id)!.lengthTicks).toBe(7680);
    expect(
      commitContentGesture(p, "tekst", { kind: "fade-in", clipId: "x", pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 1 }, { kind: "fade-in", clipId: "x", startTicks: 0, lengthTicks: 1 }, false, false),
    ).toBe(p);

    const pencil: FormaGestureSession = {
      kind: "pencil-draw",
      clipId: null,
      pointerId: 1,
      originTicks: 0,
      originClipStart: 0,
      originClipLength: 0,
      lane: "tekst",
    };
    expect(previewContentFromSession(p, pencil, 0, false, false).lengthTicks).toBeGreaterThan(0);
    expect(previewContentFromSession(p, pencil, 7680, false, false).lengthTicks).toBeGreaterThan(0);
    expect(
      previewContentFromSession(p, { ...pencil, originClientX: 1 }, 100, false, false, 50).kind,
    ).toBe("pencil-draw");
    const rStart = previewContentFromSession(
      p,
      { kind: "resize-start", clipId: a.id, pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 10 },
      10_000,
      true,
      false,
    );
    expect(rStart.lengthTicks).toBe(1);
    const rEnd = previewContentFromSession(
      p,
      { kind: "resize-end", clipId: a.id, pointerId: 1, originTicks: 0, originClipStart: 100, originClipLength: 50 },
      50,
      true,
      false,
    );
    expect(rEnd.lengthTicks).toBe(1);

    // single-move gesture (no moveIds)
    const singleMove = commitContentGesture(
      p,
      "tekst",
      { kind: "move", clipId: a.id, pointerId: 1, originTicks: 0, originClipStart: 0, originClipLength: 3840 },
      { kind: "move", clipId: a.id, startTicks: 11520, lengthTicks: 3840 },
      false,
      false,
    );
    expect(singleMove.tekst.clips.find((c) => c.id === a.id)!.startTicks).toBe(11520);

    // overwrite pencil creates remnant (-r) preserving payload
    let base = createProjectV5Seed("p3", "S", "2026-07-20T12:00:00.000Z");
    base = pencilTekstClick(base, 0, "Keep");
    const overTekst = commitPencilContentSpan(base, "tekst", 1920, 5760, "off");
    expect(overTekst.tekst.clips.some((c) => c.text === "Keep" || c.id.includes("-r"))).toBe(true);
    base = pencilAkordyClick(createProjectV5Seed("p4", "S", "2026-07-20T12:00:00.000Z"), 0, "Em");
    const overAk = commitPencilContentSpan(base, "akordy", 1920, 5760, "off");
    expect(overAk.akordy.clips.some((c) => c.symbol === "Em" || c.symbol === "C")).toBe(true);
  });
});
