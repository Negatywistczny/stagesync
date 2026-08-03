/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  METER_BAND_CLIP_DB,
  METER_BAND_WARN_DB,
  METER_DB_MAX,
  METER_DB_MIN,
} from "@stagesync/shared";

describe("PeakMeter styles", () => {
  const css = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "PeakMeter.module.css"),
    "utf8",
  );

  it("uses status tokens for green / yellow / red LED zones", () => {
    expect(css).toContain("var(--ss-color-success)");
    expect(css).toContain("var(--ss-color-warning)");
    expect(css).toContain("var(--ss-color-danger)");
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });

  it("keeps LED stops in sync with shared band thresholds", () => {
    const span = METER_DB_MAX - METER_DB_MIN;
    const warnStop = (METER_BAND_WARN_DB - METER_DB_MIN) / span;
    const clipStop = (METER_BAND_CLIP_DB - METER_DB_MIN) / span;
    expect(warnStop).toBeCloseTo(48 / 66, 5);
    expect(clipStop).toBeCloseTo(60 / 66, 5);
    expect(css).toContain("calc(100% * 48 / 66)");
    expect(css).toContain("calc(100% * 60 / 66)");
  });

  it("does not CSS-transition dim height (rAF ballistics own motion)", () => {
    expect(css).not.toMatch(/\.dim\s*\{[^}]*transition:/);
  });
});
