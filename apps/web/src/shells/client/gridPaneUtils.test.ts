import { describe, it, expect } from "vitest";
import { slotBarUnitsStyle, css, partsToInlineHtml } from "./gridPaneUtils.js";

describe("gridPaneUtils", () => {
  it("creates CSS properties for slot bar units", () => {
    expect(slotBarUnitsStyle(2)).toEqual({ "--slot-bar-units": "2" });
    expect(slotBarUnitsStyle(0)).toEqual({ "--slot-bar-units": "1" });
    expect(slotBarUnitsStyle(-1)).toEqual({ "--slot-bar-units": "1" });
  });

  it("handles css class name fallback", () => {
    expect(css("my-class")).toBe("my-class");
    expect(css(undefined)).toBe("");
  });

  it("serializes chord parts to inline HTML", () => {
    const parts = { root: "C", quality: "maj7", bass: "G" } as any;
    const html = partsToInlineHtml(parts);
    expect(html).toContain("C");
  });
});
