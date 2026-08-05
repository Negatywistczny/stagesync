/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import {
  createCanvasTextMeasurer,
  measurerFromElement,
} from "./truncateMiddle.js";

describe("truncateMiddle DOM measurers", () => {
  it("createCanvasTextMeasurer returns positive widths in jsdom", () => {
    const measure = createCanvasTextMeasurer("12px monospace");
    expect(measure("AB")).toBeGreaterThan(0);
  });

  it("measurerFromElement uses element computed font", () => {
    const el = document.createElement("span");
    el.style.font = "16px monospace";
    document.body.appendChild(el);
    const measure = measurerFromElement(el);
    expect(measure("Hi")).toBeGreaterThan(0);
    el.remove();
  });
});
