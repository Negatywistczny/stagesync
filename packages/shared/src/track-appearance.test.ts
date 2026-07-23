import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRACK_COLOR,
  DEFAULT_TRACK_ICON,
  TRACK_COLORS,
  TRACK_ICONS,
  TrackColorSchema,
  TrackIconSchema,
  resolveTrackColor,
  resolveTrackIcon,
  trackColorForIndex,
} from "./track-appearance.js";
import { AudioTrackSchema } from "./schema.js";

describe("track appearance palette", () => {
  it("has closed ~16 colors and icon enum", () => {
    expect(TRACK_COLORS.length).toBeGreaterThanOrEqual(12);
    expect(TRACK_COLORS.length).toBeLessThanOrEqual(20);
    expect(TRACK_ICONS.length).toBeGreaterThanOrEqual(10);
    expect(TrackColorSchema.parse(TRACK_COLORS[0])).toBe(TRACK_COLORS[0]);
    expect(TrackIconSchema.parse("drums")).toBe("drums");
    expect(() => TrackColorSchema.parse("#ffffff")).toThrow();
    expect(() => TrackIconSchema.parse("flute")).toThrow();
  });

  it("resolves missing / invalid to defaults", () => {
    expect(resolveTrackColor(undefined)).toBe(DEFAULT_TRACK_COLOR);
    expect(resolveTrackColor("#nope")).toBe(DEFAULT_TRACK_COLOR);
    expect(resolveTrackIcon(null)).toBe(DEFAULT_TRACK_ICON);
    expect(resolveTrackIcon("flute")).toBe(DEFAULT_TRACK_ICON);
  });

  it("cycles colors by index", () => {
    expect(trackColorForIndex(0)).toBe(TRACK_COLORS[0]);
    expect(trackColorForIndex(TRACK_COLORS.length)).toBe(TRACK_COLORS[0]);
  });

  it("AudioTrackSchema accepts optional color + icon", () => {
    const t = AudioTrackSchema.parse({
      id: "a",
      name: "Vocals",
      color: TRACK_COLORS[2],
      icon: "vocal",
    });
    expect(t.color).toBe(TRACK_COLORS[2]);
    expect(t.icon).toBe("vocal");
    expect(AudioTrackSchema.parse({ id: "b", name: "Bass" }).color).toBe(
      undefined,
    );
  });
});
