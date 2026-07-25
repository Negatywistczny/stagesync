import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DualDbReadout } from "./DualDbReadout.js";

describe("DualDbReadout", () => {
  it("labels fader and Peak Hold controls", () => {
    const out = renderToStaticMarkup(
      <DualDbReadout
        gainDb={-6.25}
        hold={{ holdDb: -3.5, clipped: false }}
        onGainReset={() => {}}
        onHoldClear={() => {}}
      />,
    );
    expect(out).toContain('aria-label="Poziom fadera"');
    expect(out).toContain('aria-label="Peak Hold — kliknij aby wyzerować"');
    expect(out).toContain("-6.3");
  });

  it("accepts custom aria labels and clipped hold class", () => {
    const out = renderToStaticMarkup(
      <DualDbReadout
        gainDb={0}
        hold={{ holdDb: 1.2, clipped: true }}
        onGainReset={() => {}}
        onHoldClear={() => {}}
        gainAriaLabel="Fader Stereo Out"
        holdAriaLabel="Peak Hold Stereo Out"
      />,
    );
    expect(out).toContain('aria-label="Fader Stereo Out"');
    expect(out).toContain('aria-label="Peak Hold Stereo Out"');
    expect(out).toContain("peakHoldClipped");
  });
});
