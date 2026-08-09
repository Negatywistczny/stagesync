import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  deleteAkordyClip,
  pencilAkordyClick,
  resolveAkordClipAt,
  commitAkordyClipSymbol,
  setAkordyClipSymbol,
} from "./akordyEdit.js";

describe("akordyEdit", () => {
  it("pencil inserts 1 bar clip with symbol", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const next = pencilAkordyClick(p, 0, "Am");
    expect(next.akordy.clips).toHaveLength(1);
    expect(next.akordy.clips[0]?.symbol).toBe("Am");
    expect(next.akordy.clips[0]?.lengthTicks).toBe(3840);
  });

  it("set symbol + delete", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilAkordyClick(p, 0, "C");
    const id = p.akordy.clips[0]!.id;
    p = setAkordyClipSymbol(p, id, "G");
    expect(resolveAkordClipAt(p, 100)?.symbol).toBe("G");
    p = deleteAkordyClip(p, id);
    expect(p.akordy.clips).toHaveLength(0);
  });

  it("keeps incomplete maj while typing; commit collapses maj and keeps maj7", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilAkordyClick(p, 0, "C");
    const id = p.akordy.clips[0]!.id;
    p = setAkordyClipSymbol(p, id, "Cmaj");
    expect(p.akordy.clips[0]?.symbol).toBe("Cmaj");
    p = setAkordyClipSymbol(p, id, "Cmaj7");
    expect(p.akordy.clips[0]?.symbol).toBe("Cmaj7");
    p = commitAkordyClipSymbol(p, id, "Cmaj7");
    expect(p.akordy.clips[0]?.symbol).toBe("Cmaj7");
    p = setAkordyClipSymbol(p, id, "Cmaj");
    p = commitAkordyClipSymbol(p, id, "Cmaj");
    expect(p.akordy.clips[0]?.symbol).toBe("C");
  });

  it("overwrite creates -r remnant resolved via parent id", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = {
      ...p,
      akordy: {
        clips: [
          { id: "akord-main", symbol: "Dm", startTicks: 0, lengthTicks: 15360 },
        ],
      },
    };
    p = pencilAkordyClick(p, 3840, "G");
    const remnant = p.akordy.clips.find((c) => c.id.endsWith("-r"));
    expect(remnant).toBeTruthy();
    expect(remnant!.symbol).toBe("Dm");
  });

  it("resolveAkordClipAt returns null outside clips", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    expect(resolveAkordClipAt(p, 0)).toBeNull();
  });
});
