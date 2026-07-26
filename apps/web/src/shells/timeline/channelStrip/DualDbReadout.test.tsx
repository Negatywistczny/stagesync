import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DualDbReadout } from "./DualDbReadout.js";

describe("DualDbReadout", () => {
  it("uses default aria labels and formats gain / hold", () => {
    const out = renderToStaticMarkup(
      <DualDbReadout
        gainDb={-6.25}
        hold={{ holdDb: -12.34, clipped: false }}
        onGainReset={() => {}}
        onHoldClear={() => {}}
      />,
    );
    expect(out).toContain('aria-label="Poziom fadera"');
    expect(out).toContain('aria-label="Peak Hold — kliknij aby wyzerować"');
    expect(out).toContain("-6.3");
    expect(out).toContain("-12.3");
    expect(out).not.toContain("peakHoldClipped");
  });

  it("accepts custom labels and clipped hold class", () => {
    const out = renderToStaticMarkup(
      <DualDbReadout
        gainDb={0}
        hold={{ holdDb: 1.2, clipped: true }}
        onGainReset={() => {}}
        onHoldClear={() => {}}
        gainAriaLabel="Fader Click"
        holdAriaLabel="Peak Hold Click — kliknij aby wyzerować"
      />,
    );
    expect(out).toContain('aria-label="Fader Click"');
    expect(out).toContain(
      'aria-label="Peak Hold Click — kliknij aby wyzerować"',
    );
    expect(out).toContain("peakHoldClipped");
    expect(out).toContain("+1.2");
  });
});
