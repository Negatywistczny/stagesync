import { describe, expect, it } from "vitest";
import { importUgText } from "./ug-import.js";

describe("importUgText", () => {
  it("parses ChordPro-lite lyrics with bracket chords", () => {
    const result = importUgText("[C]Hello [G]world\n[Am]Line two");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.tekst.clips.length).toBeGreaterThanOrEqual(1);
    expect(result.akordy.clips.some((c) => c.symbol === "C")).toBe(true);
    expect(result.akordy.clips.some((c) => c.symbol === "G")).toBe(true);
  });

  it("returns Polish message for empty / broken input", () => {
    expect(importUgText("").ok).toBe(false);
    expect(importUgText("   ").ok).toBe(false);
    const broken = importUgText("\u0001\u0002binary");
    expect(broken.ok).toBe(false);
    if (broken.ok) return;
    expect(broken.message.length).toBeGreaterThan(0);
  });

  it("rejects chordless gibberish without lyrics markers", () => {
    const r = importUgText("{title: x}");
    expect(r.ok).toBe(false);
  });
});
