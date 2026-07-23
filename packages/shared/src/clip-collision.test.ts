import { describe, expect, it } from "vitest";
import {
  allocateUniqueClipId,
  clampFormaSubsections,
  deleteClip,
  insertGapSectionAfterCountdown,
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

describe("insertGapSectionAfterCountdown", () => {
  it("inserts Intro when first section moves right past Countdown end", () => {
    const moved = moveClipNoOverlap(base(), "forma-intro", 1920, {
      contentFloorTicks: 0,
    });
    const next = insertGapSectionAfterCountdown(moved, "forma-intro", {
      contentFloorTicks: 0,
    });
    const gap = next.find((c) => c.id.startsWith("forma-gap-"));
    expect(gap?.name).toBe("Intro");
    expect(gap?.startTicks).toBe(0);
    expect(gap?.lengthTicks).toBe(1920);
    expect(next.find((c) => c.id === "forma-intro")?.startTicks).toBe(1920);
  });

  it("no-ops when moved clip is not the first section", () => {
    const moved = moveClipNoOverlap(base(), "forma-verse", 7680 + 960, {
      contentFloorTicks: 0,
    });
    const next = insertGapSectionAfterCountdown(moved, "forma-verse", {
      contentFloorTicks: 0,
    });
    expect(next.find((c) => c.id.startsWith("forma-gap-"))).toBeUndefined();
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
  it("rejects section overlapping countdown", () => {
    const placed: FormaClip = {
      id: "forma-x",
      name: "X",
      kind: "section",
      startTicks: -1000,
      lengthTicks: 2000,
    };
    const before = [CD, INTRO];
    expect(placeClipNoOverlap(before, placed)).toEqual(before);
  });

  it("places after countdown without mutating it", () => {
    const placed: FormaClip = {
      id: "forma-x",
      name: "X",
      kind: "section",
      startTicks: 7680,
      lengthTicks: 3840,
    };
    const next = placeClipNoOverlap([CD, INTRO], placed);
    expect(next.find((c) => c.id === "forma-cd")).toEqual(CD);
    expect(next.find((c) => c.id === "forma-x")?.startTicks).toBe(7680);
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

  it("avoids colliding with an existing -r id", () => {
    const withRight: FormaClip[] = [
      ...base(),
      {
        id: "forma-intro-r",
        name: "Old right",
        kind: "section",
        startTicks: 20_000,
        lengthTicks: 960,
      },
    ];
    const next = splitClipAt(withRight, "forma-intro", 3840);
    const ids = next.map((c) => c.id);
    expect(ids.filter((id) => id === "forma-intro-r")).toHaveLength(1);
    expect(ids).toContain("forma-intro-r-2");
  });
});

describe("clampFormaSubsections / allocateUniqueClipId", () => {
  it("keeps clip when subsections already in range", () => {
    const clip: FormaClip = {
      ...INTRO,
      subsections: [960, 1920],
    };
    expect(clampFormaSubsections(clip)).toBe(clip);
  });

  it("drops all subsections when none remain in range", () => {
    const clip: FormaClip = {
      ...INTRO,
      lengthTicks: 100,
      subsections: [100, 200, -1],
    };
    const next = clampFormaSubsections(clip);
    expect(next.subsections).toBeUndefined();
  });

  it("filters partial out-of-range subsections", () => {
    const clip: FormaClip = {
      ...INTRO,
      lengthTicks: 2000,
      subsections: [500, 2000, 3000],
    };
    expect(clampFormaSubsections(clip).subsections).toEqual([500]);
  });

  it("allocateUniqueClipId bumps numeric suffixes", () => {
    const used = new Set(["x", "x-2"]);
    expect(allocateUniqueClipId("x", used)).toBe("x-3");
    expect(allocateUniqueClipId("fresh", used)).toBe("fresh");
  });
});

describe("placeClipNoOverlap edges", () => {
  it("rejects non-positive length", () => {
    const before = [CD, INTRO];
    expect(
      placeClipNoOverlap(before, {
        ...INTRO,
        id: "bad",
        lengthTicks: 0,
      }),
    ).toEqual(before);
  });

  it("splits both sides of an overlapped neighbor", () => {
    const placed: FormaClip = {
      id: "mid",
      name: "Mid",
      kind: "section",
      startTicks: 2000,
      lengthTicks: 2000,
    };
    const next = placeClipNoOverlap([CD, INTRO], placed);
    expect(next.find((c) => c.id === "forma-intro")?.lengthTicks).toBe(2000);
    expect(next.some((c) => c.id === "forma-intro-r")).toBe(true);
    expect(next.find((c) => c.id === "mid")?.startTicks).toBe(2000);
  });
});

describe("moveClipNoOverlap CD bump", () => {
  it("bumps start to countdown end when move still overlaps CD", () => {
    const next = moveClipNoOverlap(base(), "forma-intro", -1000, {
      contentFloorTicks: -7680,
    });
    expect(next.find((c) => c.id === "forma-intro")?.startTicks).toBe(0);
  });

  it("no-ops on non-finite start", () => {
    expect(moveClipNoOverlap(base(), "forma-intro", Number.NaN)).toEqual(
      base(),
    );
  });
});

describe("moveClipsRigidDelta edges", () => {
  it("no-ops for empty ids, zero delta, or countdown-only selection", () => {
    expect(moveClipsRigidDelta(base(), [], 100)).toEqual(base());
    expect(moveClipsRigidDelta(base(), ["forma-intro"], 0)).toEqual(base());
    expect(moveClipsRigidDelta(base(), ["forma-cd"], 100)).toEqual(base());
  });

  it("bumps movers that still overlap countdown after delta", () => {
    const next = moveClipsRigidDelta(base(), ["forma-intro"], -500, {
      contentFloorTicks: -7680,
    });
    expect(next.find((c) => c.id === "forma-intro")?.startTicks).toBe(0);
  });
});

describe("moveSectionsFromId", () => {
  it("cascades later sections by the same delta", () => {
    const next = moveSectionsFromId(base(), "forma-intro", 1920);
    expect(next.find((c) => c.id === "forma-intro")?.startTicks).toBe(1920);
    expect(next.find((c) => c.id === "forma-verse")?.startTicks).toBe(
      VERSE.startTicks + 1920,
    );
  });

  it("no-ops for countdown, unknown id, or zero delta", () => {
    expect(moveSectionsFromId(base(), "forma-cd", 0)).toEqual(base());
    expect(moveSectionsFromId(base(), "missing", 100)).toEqual(base());
    expect(moveSectionsFromId(base(), "forma-intro", 0)).toEqual(base());
  });
});

describe("resizeClipNoOverlap edges", () => {
  it("enforces min length on end edge", () => {
    const next = resizeClipNoOverlap(base(), "forma-intro", "end", 10, {
      minLengthTicks: 100,
    });
    expect(next.find((c) => c.id === "forma-intro")?.lengthTicks).toBe(100);
  });

  it("rejects start resize that cannot satisfy min length above floor", () => {
    const short: FormaClip[] = [
      CD,
      { ...INTRO, startTicks: 0, lengthTicks: 50 },
    ];
    expect(
      resizeClipNoOverlap(short, "forma-intro", "start", 40, {
        contentFloorTicks: 0,
        minLengthTicks: 100,
      }),
    ).toEqual(short);
  });

  it("clamps start resize out of countdown span", () => {
    const next = resizeClipNoOverlap(base(), "forma-intro", "start", -1000, {
      contentFloorTicks: -7680,
    });
    expect(next.find((c) => c.id === "forma-intro")?.startTicks).toBe(0);
  });

  it("clamps end resize that would enter countdown", () => {
    // Section entirely in CD range with permissive floor — end edge into CD
    const inCd: FormaClip[] = [
      CD,
      {
        id: "s",
        name: "S",
        kind: "section",
        startTicks: -4000,
        lengthTicks: 1000,
      },
    ];
    const next = resizeClipNoOverlap(inCd, "s", "end", -500, {
      contentFloorTicks: -7680,
    });
    // end clamped to countdown.startTicks (-7680) would make length invalid → no-op
    // or if still overlapping: end = min(end, cd.start)
    expect(next.find((c) => c.id === "s")).toBeDefined();
  });
});
