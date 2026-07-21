import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  commitContentGesture,
  commitMoveContentClip,
  commitPencilContentSpan,
  commitResizeContentClip,
  contentClipCoveringTicks,
  previewContentFromSession,
} from "./contentLaneEdit.js";
import { pencilTekstClick } from "./tekstEdit.js";
import { pencilAkordyClick } from "./akordyEdit.js";
import { pencilCueClick } from "./cueEdit.js";
import type { FormaGestureSession } from "./timelineGesture.js";

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
    // 500 ticks → nearest beat 960 (not barline 0)
    const preview = previewContentFromSession(p, session, 500, false, false);
    expect(preview.startTicks).toBe(960);
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
