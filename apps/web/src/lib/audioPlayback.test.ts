import { describe, expect, it } from "vitest";
import { gainDbToLinear, ticksToMs, DEFAULT_PPQ } from "@stagesync/shared";
import { assetFileUrl } from "./audioPlayback.js";

describe("audioPlayback helpers", () => {
  it("builds asset file URL", () => {
    expect(assetFileUrl("proj/1", "a b")).toBe(
      "/api/projects/proj%2F1/assets/a%20b/file",
    );
  });

  it("smoke mute gain and ticksToMs for scheduler", () => {
    expect(gainDbToLinear(-60)).toBeLessThan(0.002);
    expect(
      ticksToMs(DEFAULT_PPQ, 120, { numerator: 4, denominator: 4 }),
    ).toBe(500);
  });
});
