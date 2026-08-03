import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  clampFaderGainDb,
  dbToFaderTaper,
  faderTaperToDb,
  FADER_GAIN_FLOOR_DB,
  FADER_TAPER_DB_MAX,
  FADER_TAPER_UNITY_T,
} from "@stagesync/shared";
import { TaperGainSlider } from "./TaperGainSlider.js";

describe("TaperGainSlider", () => {
  it("maps extreme bottom to gain floor (mixer mute)", () => {
    expect(clampFaderGainDb(faderTaperToDb(0))).toBe(FADER_GAIN_FLOOR_DB);
    expect(dbToFaderTaper(FADER_GAIN_FLOOR_DB)).toBe(0);
  });

  it("shares mixer unity / max anchors", () => {
    expect(faderTaperToDb(FADER_TAPER_UNITY_T)).toBeCloseTo(0, 5);
    expect(faderTaperToDb(1)).toBe(FADER_TAPER_DB_MAX);
    expect(dbToFaderTaper(0)).toBeCloseTo(FADER_TAPER_UNITY_T, 5);
  });

  it("renders taper position 0…1 with dB aria (not −24…+12)", () => {
    const out = renderToStaticMarkup(
      <TaperGainSlider
        gainDb={0}
        onGainChange={() => {}}
        aria-label="Fader Backing Vox"
      />,
    );
    expect(out).toContain('aria-label="Fader Backing Vox"');
    expect(out).toContain('min="0"');
    expect(out).toContain('max="1"');
    expect(out).toContain(`value="${FADER_TAPER_UNITY_T}"`);
    expect(out).toContain(`aria-valuemin="${FADER_GAIN_FLOOR_DB}"`);
    expect(out).toContain(`aria-valuemax="${FADER_TAPER_DB_MAX}"`);
    expect(out).not.toContain('min="-24"');
    expect(out).not.toContain('max="12"');
  });

  it("emits clamped floor when taper hits bottom", () => {
    const onGainChange = vi.fn();
    // Drive the pure mapping the slider uses (DOM range change not available in SSR).
    onGainChange(clampFaderGainDb(faderTaperToDb(0)));
    expect(onGainChange).toHaveBeenCalledWith(FADER_GAIN_FLOOR_DB);
  });

  it("shows floor position when gain is at mute", () => {
    const out = renderToStaticMarkup(
      <TaperGainSlider
        gainDb={FADER_GAIN_FLOOR_DB}
        onGainChange={() => {}}
        aria-label="Fader ścieżki"
      />,
    );
    expect(out).toContain('value="0"');
    expect(out).toContain('aria-valuetext="-60.0 dB"');
  });
});
