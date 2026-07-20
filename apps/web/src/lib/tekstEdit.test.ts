import { describe, expect, it } from "vitest";
import { createProjectV5Seed } from "@stagesync/shared";
import {
  deleteTekstClip,
  pencilTekstClick,
  resolveTekstClipAt,
  setTekstClipText,
} from "./tekstEdit.js";

describe("tekstEdit", () => {
  it("pencilTekstClick inserts 1 bar clip", () => {
    const p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    const next = pencilTekstClick(p, 0, "Hello");
    expect(next.tekst.clips).toHaveLength(1);
    expect(next.tekst.clips[0]?.text).toBe("Hello");
    expect(next.tekst.clips[0]?.lengthTicks).toBe(3840);
  });

  it("setTekstClipText + delete", () => {
    let p = createProjectV5Seed("p", "S", "2026-07-20T12:00:00.000Z");
    p = pencilTekstClick(p, 0, "A");
    const id = p.tekst.clips[0]!.id;
    p = setTekstClipText(p, id, "B");
    expect(resolveTekstClipAt(p, 100)?.text).toBe("B");
    p = deleteTekstClip(p, id);
    expect(p.tekst.clips).toHaveLength(0);
  });
});
