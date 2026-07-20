import { describe, expect, it } from "vitest";
import { createProjectV4Seed } from "@stagesync/shared";
import {
  commitGesture,
  commitPencilSpan,
  deleteFormaClip,
  previewFromSession,
} from "./formaEdit.js";
import type { FormaGestureSession } from "./timelineGesture.js";

function seed() {
  return createProjectV4Seed("p1", "Song", "2026-07-20T12:00:00.000Z");
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
});
