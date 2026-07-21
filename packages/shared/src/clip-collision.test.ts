import { describe, expect, it } from "vitest";
import {
  deleteClip,
  insertSpanOverwrite,
  moveClipNoOverlap,
  moveClipsRigidDelta,
  moveSectionsFromId,
  placeClipNoOverlap,
  resizeClipNoOverlap,
  splitClipAt,
} from "./clip-collision.js";
import type { FormaClip } from "./schema.js";

const CD: FormaClip = {
  id: "forma-cd",
  name: "Countdown",
  kind: "countdown",
  startTicks: -7680,
  lengthTicks: 7680,
};

const INTRO: FormaClip = {
  id: "forma-intro",
  name: "Intro",
  kind: "section",
  startTicks: 0,
  lengthTicks: 7680,
};

const VERSE: FormaClip = {
  id: "forma-verse",
  name: "Verse",
  kind: "section",
  startTicks: 7680,
  lengthTicks: 7680,
};

function base(): FormaClip[] {
  return [CD, INTRO, VERSE];
}

describe("deleteClip", () => {
  it("removes a section and leaves gaps", () => {
    const next = deleteClip(base(), "forma-intro");
    expect(next.map((c) => c.id)).toEqual(["forma-cd", "forma-verse"]);
    expect(next.find((c) => c.id === "forma-verse")?.startTicks).toBe(7680);
  });

  it("rejects countdown delete", () => {
    expect(deleteClip(base(), "forma-cd")).toEqual(base());
  });
});

describe("insertSpanOverwrite", () => {
  it("overwrites and splits neighbors (pencil path)", () => {
    const clip: FormaClip = {
      id: "forma-new",
      name: "New",
      kind: "section",
      startTicks: 3840,
      lengthTicks: 7680,
    };
    const next = insertSpanOverwrite(base(), clip);
    const sections = next.filter((c) => c.kind === "section");
    expect(sections.some((c) => c.id === "forma-new")).toBe(true);
    const left = sections.find((c) => c.id === "forma-intro");
    expect(left?.lengthTicks).toBe(3840);
    const right = sections.find((c) => c.startTicks === 3840 + 7680);
    expect(right?.lengthTicks).toBe(7680 - 3840);
  });

  it("clamps startTicks below content floor to 0", () => {
    const clip: FormaClip = {
      id: "forma-neg",
      name: "Bad",
      kind: "section",
      startTicks: -480,
      lengthTicks: 960,
    };
    const next = insertSpanOverwrite(base(), clip, { contentFloorTicks: 0 });
    const placed = next.find((c) => c.id === "forma-neg");
    expect(placed?.startTicks).toBe(0);
  });

  it("rejects insert that overlaps countdown after clamp fails", () => {
    const clip: FormaClip = {
      id: "forma-into-cd",
      name: "Nope",
      kind: "section",
      startTicks: -3840,
      lengthTicks: 7680,
    };
    // After clamp to 0, span is [0, 7680) — overlaps intro but not CD (-7680..0).
    // True CD overlap: start still in CD range without enough clamp — use floor -7680.
    const next = insertSpanOverwrite([CD], clip, { contentFloorTicks: -7680 });
    expect(next).toEqual([CD]);
  });
});

describe("moveClipNoOverlap", () => {
  it("moves section and auto-trims neighbor under target", () => {
    const next = moveClipNoOverlap(base(), "forma-verse", 3840);
    const verse = next.find((c) => c.id === "forma-verse");
    expect(verse?.startTicks).toBe(3840);
    expect(verse?.lengthTicks).toBe(7680);
    const intro = next.find((c) => c.id === "forma-intro");
    expect(intro?.lengthTicks).toBe(3840);
  });

  it("rejects countdown move", () => {
    expect(moveClipNoOverlap(base(), "forma-cd", -1000)).toEqual(base());
  });

  it("clamps move into pre-roll to content floor", () => {
    const next = moveClipNoOverlap(base(), "forma-intro", -480, {
      contentFloorTicks: 0,
    });
    expect(next.find((c) => c.id === "forma-intro")?.startTicks).toBe(0);
  });
});

describe("moveSectionsFromId", () => {
  it("moves target and all later sections by the same delta", () => {
    const next = moveSectionsFromId(base(), "forma-intro", 1920, {
      contentFloorTicks: 0,
    });
    expect(next.find((c) => c.id === "forma-intro")?.startTicks).toBe(1920);
    expect(next.find((c) => c.id === "forma-verse")?.startTicks).toBe(
      7680 + 1920,
    );
    expect(next.find((c) => c.id === "forma-cd")?.startTicks).toBe(-7680);
  });

  it("does not move earlier sections when dragging a later one", () => {
    const next = moveSectionsFromId(base(), "forma-verse", 7680 + 960, {
      contentFloorTicks: 0,
    });
    expect(next.find((c) => c.id === "forma-intro")?.startTicks).toBe(0);
    expect(next.find((c) => c.id === "forma-verse")?.startTicks).toBe(
      7680 + 960,
    );
  });
});

describe("resizeClipNoOverlap", () => {
  it("resizes end edge and trims following neighbor", () => {
    const next = resizeClipNoOverlap(base(), "forma-intro", "end", 9600);
    const intro = next.find((c) => c.id === "forma-intro");
    expect(intro?.lengthTicks).toBe(9600);
    const verse = next.find((c) => c.id === "forma-verse");
    expect(verse?.startTicks).toBe(9600);
    expect(verse?.lengthTicks).toBe(7680 - (9600 - 7680));
  });

  it("resizes start edge with floor clamp", () => {
    const next = resizeClipNoOverlap(base(), "forma-verse", "start", -100, {
      contentFloorTicks: 0,
    });
    // Would collide with intro — placeClip trims intro; start clamped to 0.
    const verse = next.find((c) => c.id === "forma-verse");
    expect(verse?.startTicks).toBe(0);
  });

  it("rejects countdown resize", () => {
    expect(
      resizeClipNoOverlap(base(), "forma-cd", "end", -1000),
    ).toEqual(base());
  });
});

describe("moveClipsRigidDelta", () => {
  it("moves multiple sections by the same delta without trimming each other", () => {
    const clips = base();
    const next = moveClipsRigidDelta(
      clips,
      ["forma-intro", "forma-verse"],
      3840,
      { contentFloorTicks: 0 },
    );
    expect(next.find((c) => c.id === "forma-intro")?.startTicks).toBe(3840);
    expect(next.find((c) => c.id === "forma-verse")?.startTicks).toBe(
      VERSE.startTicks + 3840,
    );
    expect(next.find((c) => c.id === "forma-cd")).toEqual(CD);
  });
});

describe("placeClipNoOverlap", () => {
  it("never mutates countdown", () => {
    const placed: FormaClip = {
      id: "forma-x",
      name: "X",
      kind: "section",
      startTicks: -1000,
      lengthTicks: 2000,
    };
    const next = placeClipNoOverlap([CD, INTRO], placed);
    expect(next.find((c) => c.id === "forma-cd")).toEqual(CD);
  });
});

describe("splitClipAt", () => {
  it("splits a section into two positive halves", () => {
    const next = splitClipAt(base(), "forma-intro", 3840);
    const left = next.find((c) => c.id === "forma-intro");
    const right = next.find((c) => c.id === "forma-intro-r");
    expect(left?.lengthTicks).toBe(3840);
    expect(right?.startTicks).toBe(3840);
    expect(right?.lengthTicks).toBe(3840);
    expect(next.find((c) => c.id === "forma-cd")).toEqual(CD);
  });

  it("rejects countdown and edge hits", () => {
    expect(splitClipAt(base(), "forma-cd", -3840)).toEqual(base());
    expect(splitClipAt(base(), "forma-intro", 0)).toEqual(base());
    expect(splitClipAt(base(), "forma-intro", 7680)).toEqual(base());
  });
});
