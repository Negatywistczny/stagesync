import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  deleteAkordyClip,
  pencilAkordyClick,
  resolveAkordClipAt,
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
});
