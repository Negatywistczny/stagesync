import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PeakMeter } from "./PeakMeter.js";

describe("PeakMeter", () => {
  it("exposes meter role with default Poziom label and valuetext bounds", () => {
    const out = renderToStaticMarkup(<PeakMeter db={-12.4} />);
    expect(out).toContain('role="meter"');
    expect(out).toContain('aria-label="Poziom"');
    expect(out).toContain('aria-valuenow="-12"');
  });

  it("accepts custom label and dual L/R columns", () => {
    const out = renderToStaticMarkup(
      <PeakMeter db={-3} dbR={-6} aria-label="Miernik Stereo Out" />,
    );
    expect(out).toContain('aria-label="Miernik Stereo Out"');
    expect(out).toContain(">L<");
    expect(out).toContain(">R<");
  });
});
